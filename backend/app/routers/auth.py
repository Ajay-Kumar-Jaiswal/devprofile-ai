import logging
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.db_models import User, ConnectedGitHubAccount, OAuthState
from app.dependencies import get_current_user
from app.saas_models import (
    UserRegisterRequest,
    UserLoginRequest,
    AuthResponse,
    UserOut,
    ConnectedGitHubOut,
    GitHubOAuthUrlResponse,
    GitHubOAuthCallbackRequest,
    GitHubLinkCallbackRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    PasswordChangeRequest,
    SetupCredentialsRequest,
    DefaultProfileRequest,
)
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    check_login_rate_limit,
    record_failed_login,
    reset_failed_login,
    set_auth_cookie,
    clear_auth_cookie,
    generate_oauth_state,
    verify_and_consume_oauth_state,
)
from app.services.url_validator import normalize_github_input

logger = logging.getLogger("devprofile_ai.auth")
router = APIRouter(prefix="/api/auth", tags=["Authentication & Identity"])


def user_to_out(user: User) -> UserOut:
    """Helper to convert ORM User to UserOut schema."""
    connected_gh = None
    if user.connected_github:
        connected_gh = ConnectedGitHubOut(
            github_user_id=user.connected_github.github_user_id,
            github_login=user.connected_github.github_login,
            avatar_url=user.connected_github.avatar_url,
            html_url=user.connected_github.html_url,
            connected_at=user.connected_github.connected_at,
        )

    has_pwd = user.has_password

    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        default_profile_username=user.default_profile_username,
        connected_github=connected_gh,
        has_password=has_pwd,
        created_at=user.created_at,
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account with email and password",
)
async def register_user(
    body: UserRegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    clean_email = body.email.lower().strip()

    # Check for existing email
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please sign in instead.",
        )

    # Optional default profile normalization
    normalized_default = None
    if body.default_profile_username:
        normalized_default = normalize_github_input(body.default_profile_username)

    # Enforce personal instance allowlist if configured
    if settings.allowed_github_accounts_list:
        if not normalized_default or not settings.is_github_account_allowed(normalized_default):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Registration on this personal instance is restricted to authorized GitHub accounts.",
            )

    new_user = User(
        email=clean_email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name.strip() if body.full_name else None,
        default_profile_username=normalized_default,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "email": new_user.email})
    set_auth_cookie(response, token)

    return AuthResponse(
        user=user_to_out(new_user),
        token=token,
        message="Account registered successfully.",
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Sign in using email and password",
)
async def login_user(
    body: UserLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_ip}:{body.email.lower().strip()}"

    # Brute-force protection
    check_login_rate_limit(rate_limit_key)

    user = db.query(User).filter(User.email == body.email.lower().strip()).first()

    # Generic credential error message to prevent account enumeration
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        record_failed_login(rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    # Enforce personal instance allowlist if configured
    if settings.allowed_github_accounts_list:
        user_gh = user.connected_github.github_login if user.connected_github else user.default_profile_username
        if not settings.is_github_account_allowed(user_gh):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this personal instance is restricted to authorized GitHub accounts.",
            )

    # Successful login: reset failed attempts
    reset_failed_login(rate_limit_key)

    token = create_access_token({"sub": str(user.id), "email": user.email})
    set_auth_cookie(response, token)

    return AuthResponse(
        user=user_to_out(user),
        token=token,
        message="Sign in successful.",
    )


@router.post(
    "/logout",
    summary="Sign out and clear session cookie",
)
async def logout_user(response: Response):
    clear_auth_cookie(response)
    return {"message": "Successfully signed out."}


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get authenticated user profile and connected account",
)
async def get_me(
    response: Response,
    current_user: User = Depends(get_current_user),
):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    return user_to_out(current_user)


@router.patch(
    "/default-profile",
    response_model=UserOut,
    summary="Set or update default analyzed GitHub handle for the account",
)
async def update_default_profile(
    body: DefaultProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    normalized = normalize_github_input(body.profile_input)
    if settings.allowed_github_accounts_list and not settings.is_github_account_allowed(normalized):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"GitHub account '@{normalized}' is not authorized on this personal instance.",
        )
    current_user.default_profile_username = normalized
    db.commit()
    db.refresh(current_user)
    return user_to_out(current_user)


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    summary="Request a password reset link (documents email delivery prerequisites)",
)
async def forgot_password(body: ForgotPasswordRequest):
    """
    Handles password reset requests. In environments without an integrated transactional
    SMTP/SES email service, returns explicit documentation on prerequisites.
    """
    return ForgotPasswordResponse(
        success=True,
        message=f"If an account exists for {body.email}, password recovery instructions would be dispatched.",
        requires_email_service=True,
        documentation="Password reset requires configuring an SMTP mail delivery provider (e.g. SendGrid, Amazon SES, or Mailgun). In local testing, users can update passwords via the Account Settings panel while logged in.",
    )


@router.post(
    "/change-password",
    summary="Change password for authenticated user",
)
@router.post(
    "/change-password/",
    include_in_schema=False,
)
async def change_password(
    body: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.has_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password changes are not available for accounts authenticated exclusively via GitHub OAuth.",
        )

    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if len(body.new_password.strip()) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters in length.",
        )

    if verify_password(body.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password.",
        )

    current_user.hashed_password = hash_password(body.new_password)
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Password changed successfully."}


@router.post(
    "/setup-credentials",
    summary="Configure local email and password for authenticated OAuth user",
)
@router.post(
    "/setup-credentials/",
    include_in_schema=False,
)
async def setup_credentials(
    body: SetupCredentialsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.has_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account already has a configured password. Please use the Change Password form instead.",
        )

    clean_email = str(body.email).lower().strip()
    clean_password = body.password.strip()

    if len(clean_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters in length.",
        )

    if body.confirm_password is not None and clean_password != body.confirm_password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirmation do not match.",
        )

    # Protect against silently overwriting existing verified account email
    if current_user.email and current_user.email.strip():
        registered_email = current_user.email.lower().strip()
        if clean_email != registered_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This account is registered with email '{current_user.email}'. To set up your password, please enter your registered account email.",
            )

    # Verify duplicate email protection across accounts
    existing_user = (
        db.query(User)
        .filter(User.email == clean_email, User.id != current_user.id)
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email address is already associated with another account. Please choose a different email.",
        )

    # Establish credentials on current account safely
    current_user.email = clean_email
    current_user.hashed_password = hash_password(clean_password)
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)

    logger.info(f"User #{current_user.id} established local credentials successfully.")
    return {
        "message": "Email and password successfully configured. You can now use these credentials to sign in directly.",
        "user": user_to_out(current_user),
    }


# ============================================================================
# GitHub OAuth Flow
# ============================================================================

@router.get(
    "/github/url",
    response_model=GitHubOAuthUrlResponse,
    summary="Generate GitHub OAuth authorization URL or return configuration instructions",
)
async def get_github_oauth_url(db: Session = Depends(get_db)):
    client_id = settings.GITHUB_CLIENT_ID
    client_secret = settings.GITHUB_CLIENT_SECRET

    if not client_id or not client_id.strip() or not client_secret or not client_secret.strip():
        return GitHubOAuthUrlResponse(
            is_configured=False,
            setup_instructions=(
                "GitHub OAuth requires configuring GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env. "
                "Create a GitHub OAuth App in GitHub Settings -> Developer settings -> OAuth Apps with "
                f"Authorization callback URL: {settings.github_callback_url}."
            ),
        )

    state = generate_oauth_state(db)
    redirect_uri = settings.github_callback_url
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=read:user,user:email"
        f"&state={state}"
    )

    return GitHubOAuthUrlResponse(
        is_configured=True,
        auth_url=auth_url,
        client_id=client_id,
    )


@router.get(
    "/github/link-url",
    response_model=GitHubOAuthUrlResponse,
    summary="Generate GitHub OAuth authorization URL specifically for linking an authenticated user's account",
)
async def get_github_link_url(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Dedicated endpoint for authenticated users initiating GitHub account linking.
    Generates a secure state parameter bound to current_user.id.
    """
    client_id = settings.GITHUB_CLIENT_ID
    client_secret = settings.GITHUB_CLIENT_SECRET

    if not client_id or not client_id.strip() or not client_secret or not client_secret.strip():
        return GitHubOAuthUrlResponse(
            is_configured=False,
            setup_instructions=(
                "GitHub OAuth requires configuring GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env. "
                "Create a GitHub OAuth App in GitHub Settings -> Developer settings -> OAuth Apps with "
                f"Authorization callback URL: {settings.github_callback_url}."
            ),
        )

    if current_user.connected_github:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Your account already has a connected GitHub identity (@{current_user.connected_github.github_login}). Please disconnect it first if you wish to connect a different account.",
        )

    # Bind state token specifically to current_user.id for CSRF and session-ownership verification
    state = generate_oauth_state(db, user_id=current_user.id)
    redirect_uri = settings.github_callback_url
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=read:user,user:email"
        f"&state={state}"
    )

    return GitHubOAuthUrlResponse(
        is_configured=True,
        auth_url=auth_url,
        client_id=client_id,
    )


async def _process_github_oauth_code(
    code: str,
    state: str,
    db: Session,
    response: Response,
    expected_user_id: int = None,
) -> tuple[User, str]:
    """
    Validates OAuth state, exchanges authorization code for access token,
    fetches GitHub profile, and provisions, links, or updates user account.
    """
    client_id = settings.GITHUB_CLIENT_ID
    client_secret = settings.GITHUB_CLIENT_SECRET

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured on this server.",
        )

    # 1. Validate state parameter
    state_record = verify_and_consume_oauth_state(db, state)
    if not state_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state parameter. Please retry the GitHub authorization.",
        )

    # Verify state ownership if expected_user_id was supplied
    if expected_user_id is not None and state_record.user_id is not None:
        if state_record.user_id != expected_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="OAuth state was initiated by a different user session. Action rejected for security.",
            )

    # 2. Exchange authorization code for GitHub access token
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": settings.github_callback_url,
            },
        )

        if token_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange authorization code with GitHub.",
            )

        token_data = token_res.json()
        gh_access_token = token_data.get("access_token")
        if not gh_access_token:
            error_desc = token_data.get("error_description", "No access token returned by GitHub.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"GitHub OAuth error: {error_desc}",
            )

        # 3. Retrieve authenticated GitHub user information
        user_res = await client.get(
            "https://api.github.com/user",
            headers={
                "Accept": "application/vnd.github.v3+json",
                "Authorization": f"Bearer {gh_access_token}",
                "User-Agent": "DevProfile-AI-OAuth",
            },
        )

        if user_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve GitHub user profile using OAuth token.",
            )

        gh_user = user_res.json()
        gh_numeric_id = gh_user.get("id")
        gh_login = gh_user.get("login")
        gh_avatar = gh_user.get("avatar_url")
        gh_html = gh_user.get("html_url")
        gh_name = gh_user.get("name")
        gh_email = gh_user.get("email")

        # Fetch primary verified email if not provided in public profile
        if not gh_email:
            emails_res = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Accept": "application/vnd.github.v3+json",
                    "Authorization": f"Bearer {gh_access_token}",
                    "User-Agent": "DevProfile-AI-OAuth",
                },
            )
            if emails_res.status_code == 200:
                emails_data = emails_res.json()
                for em in emails_data:
                    if em.get("primary") and em.get("verified"):
                        gh_email = em.get("email")
                        break

    if not gh_numeric_id or not gh_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incomplete user profile returned by GitHub OAuth.",
        )

    # Enforce personal instance allowlist if configured
    if not settings.is_github_account_allowed(gh_login):
        logger.warning(
            f"Rejecting GitHub OAuth authorization: '@{gh_login}' is not in ALLOWED_GITHUB_ACCOUNTS."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"GitHub account '@{gh_login}' is not authorized to access this personal instance.",
        )

    # 4. Check if this numeric GitHub user ID is already linked to an account
    existing_connection = (
        db.query(ConnectedGitHubAccount)
        .filter(ConnectedGitHubAccount.github_user_id == gh_numeric_id)
        .first()
    )

    # Branch A: Account Linking Flow (initiated by an authenticated user)
    linking_user_id = expected_user_id or state_record.user_id
    if linking_user_id is not None:
        user = db.query(User).filter(User.id == linking_user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account for linking not found.",
            )

        if user.connected_github:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Your account already has a connected GitHub identity (@{user.connected_github.github_login}).",
            )

        # Reject if this GitHub identity is already linked to a DIFFERENT user
        if existing_connection and existing_connection.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"GitHub account @{gh_login} is already linked to another DevProfile AI user account.",
            )

        if existing_connection and existing_connection.user_id == user.id:
            existing_connection.github_login = gh_login
            existing_connection.avatar_url = gh_avatar
            existing_connection.html_url = gh_html
        else:
            conn = ConnectedGitHubAccount(
                user_id=user.id,
                github_user_id=gh_numeric_id,
                github_login=gh_login,
                avatar_url=gh_avatar,
                html_url=gh_html,
            )
            db.add(conn)

        # Set default profile username if not currently set
        if not user.default_profile_username:
            user.default_profile_username = gh_login

        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)

        token = create_access_token({"sub": str(user.id), "email": user.email})
        set_auth_cookie(response, token)
        logger.info(f"User #{user.id} successfully linked GitHub identity @{gh_login}.")
        return user, token

    # Branch B: Standard Login / Registration Flow
    if existing_connection:
        user = existing_connection.user
        # Update username in case it changed on GitHub
        existing_connection.github_login = gh_login
        existing_connection.avatar_url = gh_avatar
        existing_connection.html_url = gh_html
    else:
        # Check if an existing user matches the verified GitHub email
        user = None
        if gh_email:
            user = db.query(User).filter(User.email == gh_email.lower().strip()).first()

        if not user:
            # Create a new user for this GitHub OAuth identity
            user = User(
                email=gh_email.lower().strip() if gh_email else None,
                full_name=gh_name or gh_login,
                default_profile_username=gh_login,
                is_active=True,
            )
            db.add(user)
            db.flush()

        # Link connected GitHub account
        conn = ConnectedGitHubAccount(
            user_id=user.id,
            github_user_id=gh_numeric_id,
            github_login=gh_login,
            avatar_url=gh_avatar,
            html_url=gh_html,
        )
        db.add(conn)

    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email})
    set_auth_cookie(response, token)

    return user, token


@router.post(
    "/github/callback",
    response_model=AuthResponse,
    summary="Handle GitHub OAuth code exchange via JSON POST and authenticate/connect account",
)
async def github_oauth_callback(
    body: GitHubOAuthCallbackRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Standard SPA flow: React OAuthCallbackPage captures GitHub code & state
    and submits them via JSON POST to complete session authentication.
    """
    user, token = await _process_github_oauth_code(
        code=body.code,
        state=body.state,
        db=db,
        response=response,
    )
    gh_login = user.connected_github.github_login if user.connected_github else user.default_profile_username or "developer"
    return AuthResponse(
        user=user_to_out(user),
        token=token,
        message=f"Signed in as GitHub user @{gh_login}.",
    )


@router.post(
    "/github/link-callback",
    response_model=AuthResponse,
    summary="Handle GitHub OAuth code exchange to link GitHub account to authenticated user",
)
async def github_link_callback(
    body: GitHubLinkCallbackRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Dedicated endpoint for authenticated users linking a GitHub identity.
    Enforces state ownership and ensures duplicate user accounts are never created.
    """
    user, token = await _process_github_oauth_code(
        code=body.code,
        state=body.state,
        db=db,
        response=response,
        expected_user_id=current_user.id,
    )
    gh_login = user.connected_github.github_login if user.connected_github else user.default_profile_username or "developer"
    return AuthResponse(
        user=user_to_out(user),
        token=token,
        message=f"Successfully linked GitHub account @{gh_login}.",
    )


@router.get(
    "/github/callback",
    summary="Handle GitHub OAuth callback via browser GET redirect",
)
async def github_oauth_callback_get(
    code: str = None,
    state: str = None,
    error: str = None,
    error_description: str = None,
    db: Session = Depends(get_db),
):
    """
    Direct browser redirect flow: Handles case where GitHub OAuth App or GITHUB_CALLBACK_URL
    is pointed directly to http://localhost:8000/api/auth/github/callback via browser GET.
    Authenticates session, sets cookie, and redirects user to frontend dashboard or settings.
    """
    is_linking = False
    if state:
        state_obj = db.query(OAuthState).filter(OAuthState.state_token == state).first()
        if state_obj and state_obj.user_id is not None:
            is_linking = True

    if error:
        err_msg = error_description or error or "GitHub OAuth authorization was canceled or denied."
        logger.warning(f"GitHub OAuth error query received: {error} - {error_description}")
        target = f"{settings.FRONTEND_ORIGIN}/settings?github_error={err_msg}" if is_linking else f"{settings.FRONTEND_ORIGIN}/login?oauth_error={err_msg}"
        return RedirectResponse(
            url=target,
            status_code=status.HTTP_303_SEE_OTHER,
        )

    if not code or not state:
        logger.warning("GitHub OAuth callback GET request missing code or state parameter.")
        target = f"{settings.FRONTEND_ORIGIN}/settings?github_error=missing_code_or_state" if is_linking else f"{settings.FRONTEND_ORIGIN}/login?oauth_error=missing_code_or_state"
        return RedirectResponse(
            url=target,
            status_code=status.HTTP_303_SEE_OTHER,
        )

    redirect_res = RedirectResponse(
        url=f"{settings.FRONTEND_ORIGIN}/dashboard",
        status_code=status.HTTP_303_SEE_OTHER,
    )

    try:
        user, _ = await _process_github_oauth_code(
            code=code,
            state=state,
            db=db,
            response=redirect_res,
        )
        gh_login = user.connected_github.github_login if user.connected_github else user.default_profile_username or ""
        if is_linking:
            redirect_res.headers["Location"] = f"{settings.FRONTEND_ORIGIN}/settings?github_linked=success&login={gh_login}"
        else:
            redirect_res.headers["Location"] = f"{settings.FRONTEND_ORIGIN}/dashboard?analyze={gh_login}"
        return redirect_res
    except HTTPException as exc:
        logger.error(f"GitHub OAuth GET callback exchange failed: {exc.detail}")
        target = f"{settings.FRONTEND_ORIGIN}/settings?github_error={exc.detail}" if is_linking else f"{settings.FRONTEND_ORIGIN}/login?oauth_error={exc.detail}"
        return RedirectResponse(
            url=target,
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as exc:
        logger.error(f"Unexpected error in GitHub OAuth GET callback: {exc}", exc_info=True)
        target = f"{settings.FRONTEND_ORIGIN}/settings?github_error=oauth_internal_error" if is_linking else f"{settings.FRONTEND_ORIGIN}/login?oauth_error=oauth_internal_error"
        return RedirectResponse(
            url=target,
            status_code=status.HTTP_303_SEE_OTHER,
        )


@router.post(
    "/github/disconnect",
    summary="Safely disconnect linked GitHub account from user profile",
)
async def disconnect_github_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify ownership: ensure ConnectedGitHubAccount belongs strictly to current_user
    connected_account = (
        db.query(ConnectedGitHubAccount)
        .filter(ConnectedGitHubAccount.user_id == current_user.id)
        .first()
    )

    if not connected_account or not current_user.connected_github:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No GitHub account is currently connected.",
        )

    # Ensure user has an email & password so they aren't locked out
    if not current_user.email or not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot disconnect GitHub account: you must set an email and password first to prevent losing account access.",
        )

    disconnected_login = connected_account.github_login

    # If user's default_profile_username matches this disconnected account, clear it
    if current_user.default_profile_username and current_user.default_profile_username.lower() == disconnected_login.lower():
        current_user.default_profile_username = None

    # Invalidate backend in-memory cache for this disconnected username
    from app.services.github_service import github_service
    github_service._cache.pop(disconnected_login.lower(), None)

    # Explicitly clear relationship and delete record
    current_user.connected_github = None
    db.delete(connected_account)
    db.commit()
    db.refresh(current_user)

    return {
        "message": "GitHub account disconnected safely.",
        "user": user_to_out(current_user),
    }
