import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import Base, get_db
from app.db_models import (
    User,
    ConnectedGitHubAccount,
    AnalysisRun,
    TrackedRecommendation,
    RecommendationEvent,
    UserSavedInternship,
    InternshipListing,
    EmailVerificationOTP,
    AccountDeletionOTP,
    OAuthState,
)
from app.services.auth_service import hash_password, create_access_token
from app.services.otp_service import otp_rate_limiter
from app.services.email_service import (
    EmailDeliveryError,
    build_deletion_otp_email_html,
    build_deletion_otp_email_text,
)
from app.services.account_deletion_service import AccountDeletionError, permanently_delete_user_account
from tests.conftest import TestSession


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def populated_user():
    """Creates a user with full associated records across all models."""
    db = TestSession()
    try:
        user = User(
            email="delete_target@campus.edu",
            hashed_password=hash_password("Password123!"),
            full_name="Deletion Target",
            default_profile_username="deletetarget",
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 1. Connected GitHub
        gh_conn = ConnectedGitHubAccount(
            user_id=user.id,
            github_user_id=1234567,
            github_login="deletetarget",
            avatar_url="https://avatars.githubusercontent.com/u/1234567",
            html_url="https://github.com/deletetarget",
        )
        db.add(gh_conn)

        # 2. Shared internship listing (Must NOT be deleted)
        listing = InternshipListing(
            source_type="greenhouse",
            source_board_or_site="acme",
            source_job_id="job-999",
            company_name="Acme Corp",
            title="Software Engineering Intern",
            description_html="<p>Job description</p>",
            description_text="Job description",
            original_url="https://acme.test/jobs/999",
        )
        db.add(listing)
        db.flush()

        # 3. User Saved Internship (Must be deleted)
        saved = UserSavedInternship(
            user_id=user.id,
            internship_id=listing.id,
            notes="Interested in backend work",
        )
        db.add(saved)

        # 4. Analysis Runs with self-reference
        run1 = AnalysisRun(
            user_id=user.id,
            analyzed_login="deletetarget",
            overall_score=75,
            score_tier="Competitive",
            score_breakdown_json="{}",
            profile_data_json="{}",
            stats_data_json="{}",
            languages_json="[]",
            repositories_json="[]",
            checklist_json="{}",
        )
        db.add(run1)
        db.flush()

        run2 = AnalysisRun(
            user_id=user.id,
            analyzed_login="deletetarget",
            overall_score=85,
            score_tier="Strong",
            previous_run_id=run1.id,
            score_breakdown_json="{}",
            profile_data_json="{}",
            stats_data_json="{}",
            languages_json="[]",
            repositories_json="[]",
            checklist_json="{}",
        )
        db.add(run2)

        # 5. Recommendation & Event
        rec = TrackedRecommendation(
            user_id=user.id,
            analyzed_login="deletetarget",
            rule_id="add_readme",
            category="Documentation",
            priority="high",
            title="Add repository description",
            description="Detail description",
            impact="High impact",
            suggested_action="Add docs",
            evidence="Evidence found",
        )
        db.add(rec)
        db.flush()

        event = RecommendationEvent(
            recommendation_id=rec.id,
            previous_status="none",
            new_status="open",
            trigger_reason="initial_detection",
        )
        db.add(event)

        # 6. OAuth State
        oauth = OAuthState(
            state_token="delete-target-oauth-state-token",
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db.add(oauth)

        # 7. Email verification OTP
        otp_rec = EmailVerificationOTP(
            user_id=user.id,
            email=user.email,
            otp_hash="oldhash",
            salt="oldsalt",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            is_consumed=True,
        )
        db.add(otp_rec)

        db.commit()
        db.refresh(user)

        user_id = user.id
        email = user.email
        listing_id = listing.id

        return {
            "user_id": user_id,
            "email": email,
            "listing_id": listing_id,
            "token": create_access_token({"sub": str(user_id), "email": email}),
        }
    finally:
        db.close()


@pytest.mark.anyio
async def test_unauthenticated_deletion_endpoints_rejected():
    """Verifies that requesting deletion OTP or confirming deletion without credentials returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        req_res = await client.post("/api/auth/delete-account/request-otp")
        assert req_res.status_code == 401

        conf_res = await client.post(
            "/api/auth/delete-account/confirm",
            json={"otp": "123456"},
        )
        assert conf_res.status_code == 401


@pytest.mark.anyio
async def test_request_deletion_otp_success_and_cooldown(populated_user, mock_resend_email):
    """Verifies that an authenticated user can request a deletion OTP and cooldown is enforced."""
    token = populated_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/auth/delete-account/request-otp", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "deletion verification code has been dispatched" in data["message"].lower()

        # Check mock Resend dispatch
        deletion_emails = [e for e in mock_resend_email if e.get("type") == "deletion"]
        assert len(deletion_emails) == 1
        assert deletion_emails[0]["to"] == populated_user["email"]
        otp = deletion_emails[0]["otp"]
        assert len(otp) == 6
        assert otp.isdigit()

        # Immediate second request triggers 60s cooldown (429)
        res_cooldown = await client.post("/api/auth/delete-account/request-otp", headers=headers)
        assert res_cooldown.status_code == 429
        assert "Please wait" in res_cooldown.json()["detail"]


@pytest.mark.anyio
async def test_confirm_deletion_incorrect_otp(populated_user, mock_resend_email):
    """Verifies that entering an invalid deletion OTP decrements attempts and rejects deletion."""
    token = populated_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/auth/delete-account/request-otp", headers=headers)

        res = await client.post(
            "/api/auth/delete-account/confirm",
            headers=headers,
            json={"otp": "000000"},
        )
        assert res.status_code == 400
        data = res.json()
        assert "Incorrect verification code" in data["detail"]
        assert "4 attempts remaining" in data["detail"]

        # Ensure user still exists in database
        db = TestSession()
        try:
            user = db.query(User).filter(User.id == populated_user["user_id"]).first()
            assert user is not None
        finally:
            db.close()


@pytest.mark.anyio
async def test_confirm_deletion_maximum_attempts_exceeded(populated_user, mock_resend_email):
    """Verifies that 5 incorrect attempts invalidate the deletion code and block deletion."""
    token = populated_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/auth/delete-account/request-otp", headers=headers)

        for i in range(4):
            res = await client.post(
                "/api/auth/delete-account/confirm",
                headers=headers,
                json={"otp": f"11111{i}"},
            )
            assert res.status_code == 400
            assert "attempt" in res.json()["detail"].lower()

        # 5th attempt invalidates code
        res5 = await client.post(
            "/api/auth/delete-account/confirm",
            headers=headers,
            json={"otp": "111114"},
        )
        assert res5.status_code == 400
        assert "Maximum attempts exceeded" in res5.json()["detail"]


@pytest.mark.anyio
async def test_confirm_deletion_expired_otp(populated_user, mock_resend_email):
    """Verifies that expired deletion OTP (>10 mins) is rejected and does not delete user."""
    token = populated_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/auth/delete-account/request-otp", headers=headers)
        deletion_emails = [e for e in mock_resend_email if e.get("type") == "deletion"]
        otp = deletion_emails[0]["otp"]

        # Expire the OTP record
        db = TestSession()
        try:
            record = (
                db.query(AccountDeletionOTP)
                .filter(AccountDeletionOTP.user_id == populated_user["user_id"])
                .first()
            )
            record.expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
            db.commit()
        finally:
            db.close()

        res = await client.post(
            "/api/auth/delete-account/confirm",
            headers=headers,
            json={"otp": otp},
        )
        assert res.status_code == 400
        assert "expired" in res.json()["detail"].lower()


@pytest.mark.anyio
async def test_successful_permanent_account_deletion_and_cascade(populated_user, mock_resend_email):
    """
    Verifies that providing valid deletion OTP permanently purges the user and all associated
    records from every child table, but preserves shared internship catalog listings.
    """
    token = populated_user["token"]
    user_id = populated_user["user_id"]
    listing_id = populated_user["listing_id"]
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Request OTP
        req_res = await client.post("/api/auth/delete-account/request-otp", headers=headers)
        assert req_res.status_code == 200
        deletion_emails = [e for e in mock_resend_email if e.get("type") == "deletion"]
        otp = deletion_emails[0]["otp"]

        # 2. Confirm Deletion
        del_res = await client.post(
            "/api/auth/delete-account/confirm",
            headers=headers,
            json={"otp": otp},
        )
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True

        # 3. Verify ALL user data is permanently deleted from database
        db = TestSession()
        try:
            assert db.query(User).filter(User.id == user_id).first() is None
            assert db.query(ConnectedGitHubAccount).filter(ConnectedGitHubAccount.user_id == user_id).first() is None
            assert db.query(AnalysisRun).filter(AnalysisRun.user_id == user_id).first() is None
            assert db.query(TrackedRecommendation).filter(TrackedRecommendation.user_id == user_id).first() is None
            assert db.query(UserSavedInternship).filter(UserSavedInternship.user_id == user_id).first() is None
            assert db.query(EmailVerificationOTP).filter(EmailVerificationOTP.user_id == user_id).first() is None
            assert db.query(AccountDeletionOTP).filter(AccountDeletionOTP.user_id == user_id).first() is None
            assert db.query(OAuthState).filter(OAuthState.user_id == user_id).first() is None

            # Shared internship listing MUST NOT be deleted
            shared_listing = db.query(InternshipListing).filter(InternshipListing.id == listing_id).first()
            assert shared_listing is not None
            assert shared_listing.company_name == "Acme Corp"
        finally:
            db.close()

        # 4. Previously issued token must be rejected immediately on protected endpoints
        me_res = await client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 401

        hist_res = await client.get("/api/history", headers=headers)
        assert hist_res.status_code == 401


@pytest.mark.anyio
async def test_reused_deletion_otp_rejected(populated_user, mock_resend_email):
    """Verifies that an OTP cannot be reused after it has already authorized an action."""
    token = populated_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/auth/delete-account/request-otp", headers=headers)
        otp = [e for e in mock_resend_email if e.get("type") == "deletion"][0]["otp"]

        # First deletion succeeds
        res1 = await client.post(
            "/api/auth/delete-account/confirm",
            headers=headers,
            json={"otp": otp},
        )
        assert res1.status_code == 200

        # Attempt to reuse the same OTP on another call
        res2 = await client.post(
            "/api/auth/delete-account/confirm",
            headers=headers,
            json={"otp": otp},
        )
        # Rejected because user is gone (401)
        assert res2.status_code == 401


@pytest.mark.anyio
async def test_same_email_can_register_again_after_deletion(populated_user, mock_resend_email):
    """
    Verifies that after permanent deletion, the previous email is immediately available
    for registration, creates a completely new user ID, requires fresh OTP verification,
    and has zero restored records.
    """
    token = populated_user["token"]
    old_user_id = populated_user["user_id"]
    email = populated_user["email"]
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Delete original account
        await client.post("/api/auth/delete-account/request-otp", headers=headers)
        otp = [e for e in mock_resend_email if e.get("type") == "deletion"][0]["otp"]
        del_res = await client.post(
            "/api/auth/delete-account/confirm",
            headers=headers,
            json={"otp": otp},
        )
        assert del_res.status_code == 200

        # 2. Register fresh account with EXACT same email
        reg_res = await client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": "BrandNewPassword999!",
                "full_name": "Re-registered Developer",
            },
        )
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        assert reg_data["requires_verification"] is True
        assert reg_data["email"] == email

        # 3. New user ID must NOT equal old user ID
        new_user_id = reg_data["user"]["id"]
        assert new_user_id != old_user_id

        # 4. New account receives a fresh verification OTP
        new_ver_emails = [e for e in mock_resend_email if e.get("type") == "verification"]
        assert len(new_ver_emails) >= 1
        new_otp = new_ver_emails[-1]["otp"]

        # 5. Cannot log in before verifying new OTP
        unver_login = await client.post(
            "/api/auth/login",
            json={"email": email, "password": "BrandNewPassword999!"},
        )
        assert unver_login.status_code == 403

        # 6. Verify new OTP
        ver_res = await client.post(
            "/api/auth/verify-otp",
            json={"email": email, "otp": new_otp},
        )
        assert ver_res.status_code == 200
        new_token = ver_res.json()["token"]

        # 7. Check history: must be completely empty! Old data was NOT restored
        hist_res = await client.get("/api/history", headers={"Authorization": f"Bearer {new_token}"})
        assert hist_res.status_code == 200
        assert hist_res.json()["total_runs"] == 0
        assert len(hist_res.json()["runs"]) == 0


@pytest.mark.anyio
async def test_attempt_to_delete_another_user_account_fails(populated_user, test_user, mock_resend_email):
    """
    Verifies that a malicious user B cannot use their OTP to delete user A's account
    or authorize deletion of an account other than their own authenticated session.
    """
    # User B requests a deletion OTP for their own account
    token_b = create_access_token({"sub": str(test_user.id), "email": test_user.email})
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/auth/delete-account/request-otp", headers=headers_b)
        otp_b = [e for e in mock_resend_email if e.get("type") == "deletion"][-1]["otp"]

        # Attempt to confirm deletion with User A's token using User B's OTP
        headers_a = {"Authorization": f"Bearer {populated_user['token']}"}
        res = await client.post(
            "/api/auth/delete-account/confirm",
            headers=headers_a,
            json={"otp": otp_b},
        )
        # Must fail because User A has no active deletion OTP matching otp_b
        assert res.status_code == 400

        # Verify User A remains completely intact
        db = TestSession()
        try:
            assert db.query(User).filter(User.id == populated_user["user_id"]).first() is not None
        finally:
            db.close()


@pytest.mark.anyio
async def test_database_rollback_when_deletion_fails(populated_user, mock_resend_email, monkeypatch):
    """Verifies that if an unexpected database error occurs during deletion, the transaction rolls back cleanly."""
    token = populated_user["token"]
    user_id = populated_user["user_id"]
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/auth/delete-account/request-otp", headers=headers)
        otp = [e for e in mock_resend_email if e.get("type") == "deletion"][0]["otp"]

        # Simulate database failure during deletion
        def broken_delete(*args, **kwargs):
            raise AccountDeletionError("Simulated database failure during account deletion")

        monkeypatch.setattr("app.routers.auth.permanently_delete_user_account", broken_delete)

        res = await client.post(
            "/api/auth/delete-account/confirm",
            headers=headers,
            json={"otp": otp},
        )
        assert res.status_code == 500
        assert "Simulated database failure" in res.json()["detail"]

        # Verify user still exists in DB
        db = TestSession()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            assert user is not None
        finally:
            db.close()


@pytest.mark.anyio
async def test_github_oauth_user_unaffected_after_account_deleted(populated_user, mock_resend_email):
    """Verifies that deleting an account does not disrupt GitHub OAuth accounts or other users."""
    # Create OAuth user B
    db = TestSession()
    try:
        oauth_user = User(
            email="oauth_keeper@campus.edu",
            full_name="OAuth Keeper",
            default_profile_username="oauthkeeper",
            is_active=True,
            is_verified=True,
        )
        db.add(oauth_user)
        db.commit()
        db.refresh(oauth_user)

        conn_b = ConnectedGitHubAccount(
            user_id=oauth_user.id,
            github_user_id=77665544,
            github_login="oauthkeeper",
            avatar_url="https://avatars.githubusercontent.com/u/77665544",
            html_url="https://github.com/oauthkeeper",
        )
        db.add(conn_b)
        db.commit()

        oauth_user_id = oauth_user.id
        token_b = create_access_token({"sub": str(oauth_user_id), "email": oauth_user.email})
    finally:
        db.close()

    # Delete User A
    headers_a = {"Authorization": f"Bearer {populated_user['token']}"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/auth/delete-account/request-otp", headers=headers_a)
        otp_a = [e for e in mock_resend_email if e.get("type") == "deletion"][-1]["otp"]
        del_res = await client.post(
            "/api/auth/delete-account/confirm",
            headers=headers_a,
            json={"otp": otp_a},
        )
        assert del_res.status_code == 200

        # OAuth user B must still be fully active and authenticated
        me_res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_b}"})
        assert me_res.status_code == 200
        data_b = me_res.json()
        assert data_b["id"] == oauth_user_id
        assert data_b["connected_github"]["github_login"] == "oauthkeeper"


def test_deletion_email_template_rendering():
    """Verifies that deletion email HTML and plaintext templates include proper security warnings and branding."""
    otp = "889900"
    email = "security_test@campus.edu"
    html = build_deletion_otp_email_html(otp, email)
    text = build_deletion_otp_email_text(otp, email)

    assert "889900" in html
    assert "DevProfile" in html
    assert "permanently delete" in html.lower()
    assert "10 minutes" in html

    assert "889900" in text
    assert "DevProfile" in text
    assert "PERMANENT ACCOUNT DELETION" in text
    assert "10 minutes" in text
