import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict
from fastapi import APIRouter, HTTPException, Query, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import httpx

logger = logging.getLogger("devprofile_ai.analyze")


from app.config import settings
from app.database import get_db
from app.db_models import User, AnalysisRun, TrackedRecommendation
from app.dependencies import get_optional_current_user
from app.models import AnalysisResponse, AIAnalysisEnvelope, RecommendationItem
from app.services.github_service import github_service
from app.services.ai_service import ai_service
from app.services.url_validator import normalize_github_input
from app.analyzer.scoring import calculate_portfolio_score
from app.analyzer.recommendations import generate_recommendations, generate_roadmap
from app.analyzer.reconciliation import reconcile_recommendations

router = APIRouter(prefix="/api", tags=["Analysis"])


@router.get(
    "/analyze/{username:path}",
    response_model=AnalysisResponse,
    summary="Analyze GitHub Profile & Run Portfolio Audit",
    description="Validates a GitHub handle, fetches repository metrics, executes deterministic portfolio scoring, and generates real Groq AI portfolio analysis.",
)
async def analyze_profile(
    username: str,
    demo: bool = Query(
        False,
        description="Load an offline demonstration profile for college placement drive presentations.",
    ),
    skip_ai: bool = Query(
        False,
        description="Optionally skip the Groq AI call to reduce latency or test core metrics only.",
    ),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    raw_input = username.strip()
    is_demo_handle = raw_input.lower() in ("demo", "alex-dev-demo", "sample-developer")
    is_demo = is_demo_handle or (demo and is_demo_handle)

    # Enforce authentication for any non-demo profile analysis
    if not is_demo:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to analyze real GitHub profiles. Please sign in or register.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if settings.allowed_github_accounts_list:
            user_gh = current_user.connected_github.github_login if current_user.connected_github else current_user.default_profile_username
            if not settings.is_github_account_allowed(user_gh):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access to this personal instance is restricted to authorized GitHub accounts.",
                )

    readme_excerpts: Dict[str, str] = {}

    if is_demo:
        clean_username = "alex-dev-demo"
        profile, repos = github_service.get_sample_demo_profile()
        profile = github_service.parse_profile(profile.model_dump())
        repos = github_service.parse_repositories([r.model_dump() for r in repos])
    else:
        # Extract and validate username from handle or full GitHub profile URL
        clean_username = normalize_github_input(raw_input)
        validated_name = github_service.validate_username(clean_username)

        # 1. Check in-memory cache first to avoid redundant API requests
        cached_entry = github_service.get_cached_user(validated_name)
        if cached_entry:
            raw_profile = cached_entry.raw_profile
            raw_repos = cached_entry.raw_repos
            readme_excerpts = cached_entry.readme_excerpts
            profile = github_service.parse_profile(raw_profile)
            repos = github_service.parse_repositories(raw_repos)
        else:
            async with httpx.AsyncClient() as client:
                raw_profile = await github_service.fetch_profile(client, validated_name, fetch_socials=True)
                public_repos_count = raw_profile.get("public_repos", 0)

                raw_repos = await github_service.fetch_repositories(
                    client,
                    validated_name,
                    max_repos=settings.MAX_REPOS_TO_ANALYZE,
                    public_repos_count=public_repos_count,
                )

                profile = github_service.parse_profile(raw_profile)
                repos = github_service.parse_repositories(raw_repos)

                # Safely fetch short README snippets for top 2 original repos
                for repo in [r for r in repos if not r.is_fork][:2]:
                    snippet = await github_service.fetch_readme_excerpt(client, validated_name, repo.name)
                    if snippet:
                        readme_excerpts[repo.name] = snippet

                # Cache retrieved public data
                github_service.set_cached_user(
                    validated_name, raw_profile, raw_repos, readme_excerpts
                )

    # 1. Compute aggregate metrics, language distribution, and quality checklist
    stats, languages, checklist = github_service.compute_aggregates(profile, repos)

    # 2. Deterministic rule-based scoring (0-100)
    score = calculate_portfolio_score(profile, repos, languages)

    # 3. Rule-based recommendations and roadmaps (deterministic baseline)
    recommendations = generate_recommendations(profile, repos, languages, checklist)
    roadmap_7, roadmap_30 = generate_roadmap(profile, repos, languages, recommendations)

    # 4. Groq AI Analysis
    ai_envelope: Optional[AIAnalysisEnvelope] = None
    if not skip_ai:
        ai_envelope = await ai_service.analyze_portfolio(
            profile=profile,
            stats=stats,
            languages=languages,
            repos=repos,
            checklist=checklist,
            readme_excerpts=readme_excerpts,
            is_demo=is_demo,
        )

    # 5. Persistent Analysis History & Recommendation Tracking for authenticated users
    if current_user and not is_demo and profile.login.lower().strip() not in ("alex-dev-demo", "demo"):
        # Reconcile recommendations against persistent database records
        tracked = reconcile_recommendations(
            db=db,
            user_id=current_user.id,
            analyzed_login=profile.login,
            current_findings=recommendations,
            is_live_data_reliable=not is_demo,
        )

        # Map active (open) recommendations back into output
        recommendations = [
            RecommendationItem(
                id=t.rule_id,
                priority=t.priority,  # type: ignore
                category=t.category,
                title=t.title,
                description=t.description,
                impact=t.impact,
                action=t.suggested_action,
            )
            for t in tracked
            if t.status == "open"
        ]

        # Link to most recent prior run for this user and analyzed login
        prev_run = (
            db.query(AnalysisRun)
            .filter(
                AnalysisRun.user_id == current_user.id,
                AnalysisRun.analyzed_login == profile.login.lower(),
            )
            .order_by(AnalysisRun.created_at.desc())
            .first()
        )

        # Save immutable analysis run snapshot safely
        try:
            run_record = AnalysisRun(
                user_id=current_user.id,
                analyzed_login=profile.login.lower(),
                is_demo_data=is_demo,
                overall_score=score.overall_score,
                score_tier=score.tier,
                public_repos=stats.total_public_repos,
                total_stars=stats.total_stars,
                primary_language=stats.primary_language,
                status="success",
                score_breakdown_json=json.dumps(score.model_dump()),
                profile_data_json=json.dumps(profile.model_dump()),
                stats_data_json=json.dumps(stats.model_dump()),
                languages_json=json.dumps([l.model_dump() for l in languages]),
                repositories_json=json.dumps([r.model_dump() for r in repos[:10]]),
                checklist_json=json.dumps(checklist.model_dump()),
                ai_analysis_json=json.dumps(ai_envelope.model_dump()) if ai_envelope else None,
                previous_run_id=prev_run.id if prev_run else None,
            )
            db.add(run_record)
            db.commit()
        except SQLAlchemyError as db_err:
            db.rollback()
            logger.warning(
                f"Failed to persist analysis run for {profile.login} to history: {db_err}"
            )

    now_iso = datetime.now(timezone.utc).isoformat()


    return AnalysisResponse(
        username=profile.login,
        analyzed_at=now_iso,
        is_demo_data=is_demo,
        profile=profile,
        stats=stats,
        languages=languages,
        top_repositories=repos[:10],
        portfolio_score=score,
        quality_checklist=checklist,
        recommendations=recommendations,
        roadmap_7_day=roadmap_7,
        roadmap_30_day=roadmap_30,
        ai_analysis=ai_envelope,
    )


@router.post(
    "/analyze/{username}/ai",
    response_model=AIAnalysisEnvelope,
    summary="Retry or Generate AI Portfolio Analysis",
    description="Re-runs or retries Groq AI analysis for an analyzed profile.",
)
async def analyze_profile_ai_only(
    username: str,
    demo: bool = Query(
        False,
        description="Load an offline demonstration profile for college placement drive presentations.",
    ),
    run_id: Optional[int] = Query(
        None,
        description="Optional specific AnalysisRun ID to update with the generated AI result.",
    ),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    raw_input = username.strip()
    is_demo_handle = raw_input.lower() in ("demo", "alex-dev-demo", "sample-developer")
    is_demo = is_demo_handle or (demo and is_demo_handle)

    # Enforce authentication for any non-demo AI analysis
    if not is_demo:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to run AI portfolio analysis. Please sign in or register.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if settings.allowed_github_accounts_list:
            user_gh = current_user.connected_github.github_login if current_user.connected_github else current_user.default_profile_username
            if not settings.is_github_account_allowed(user_gh):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access to this personal instance is restricted to authorized GitHub accounts.",
                )

    readme_excerpts: Dict[str, str] = {}

    if is_demo:
        clean_username = "alex-dev-demo"
        profile, repos = github_service.get_sample_demo_profile()
        profile = github_service.parse_profile(profile.model_dump())
        repos = github_service.parse_repositories([r.model_dump() for r in repos])
    else:
        clean_username = normalize_github_input(raw_input)
        validated_name = github_service.validate_username(clean_username)

        # Check in-memory cache first to avoid re-fetching GitHub
        cached_entry = github_service.get_cached_user(validated_name)
        if cached_entry:
            raw_profile = cached_entry.raw_profile
            raw_repos = cached_entry.raw_repos
            readme_excerpts = cached_entry.readme_excerpts
            profile = github_service.parse_profile(raw_profile)
            repos = github_service.parse_repositories(raw_repos)
        else:
            async with httpx.AsyncClient() as client:
                raw_profile = await github_service.fetch_profile(client, validated_name, fetch_socials=True)
                public_repos_count = raw_profile.get("public_repos", 0)

                raw_repos = await github_service.fetch_repositories(
                    client,
                    validated_name,
                    max_repos=settings.MAX_REPOS_TO_ANALYZE,
                    public_repos_count=public_repos_count,
                )
                profile = github_service.parse_profile(raw_profile)
                repos = github_service.parse_repositories(raw_repos)

                for repo in [r for r in repos if not r.is_fork][:2]:
                    snippet = await github_service.fetch_readme_excerpt(client, validated_name, repo.name)
                    if snippet:
                        readme_excerpts[repo.name] = snippet

                github_service.set_cached_user(
                    validated_name, raw_profile, raw_repos, readme_excerpts
                )

    stats, languages, checklist = github_service.compute_aggregates(profile, repos)

    envelope = await ai_service.analyze_portfolio(
        profile=profile,
        stats=stats,
        languages=languages,
        repos=repos,
        checklist=checklist,
        readme_excerpts=readme_excerpts,
        is_demo=is_demo,
    )

    # If authenticated, update or create the AnalysisRun snapshot with the updated AI output
    if current_user and envelope.status == "success":
        try:
            target_run = None
            if run_id:
                target_run = (
                    db.query(AnalysisRun)
                    .filter(
                        AnalysisRun.id == run_id,
                        AnalysisRun.user_id == current_user.id,
                    )
                    .first()
                )

            if not target_run:
                target_run = (
                    db.query(AnalysisRun)
                    .filter(
                        AnalysisRun.user_id == current_user.id,
                        AnalysisRun.analyzed_login == profile.login.lower(),
                    )
                    .order_by(AnalysisRun.created_at.desc())
                    .first()
                )

            if target_run:
                target_run.ai_analysis_json = json.dumps(envelope.model_dump())
                db.commit()
                db.refresh(target_run)
            else:
                score = calculate_portfolio_score(profile, repos, languages)
                target_run = AnalysisRun(
                    user_id=current_user.id,
                    analyzed_login=profile.login.lower(),
                    is_demo_data=is_demo,
                    overall_score=score.overall_score,
                    score_tier=score.tier,
                    public_repos=stats.total_public_repos,
                    total_stars=stats.total_stars,
                    primary_language=stats.primary_language,
                    status="success",
                    score_breakdown_json=json.dumps(score.model_dump()),
                    profile_data_json=json.dumps(profile.model_dump()),
                    stats_data_json=json.dumps(stats.model_dump()),
                    languages_json=json.dumps([l.model_dump() for l in languages]),
                    repositories_json=json.dumps([r.model_dump() for r in repos[:10]]),
                    checklist_json=json.dumps(checklist.model_dump()),
                    ai_analysis_json=json.dumps(envelope.model_dump()),
                )
                db.add(target_run)
                db.commit()
                db.refresh(target_run)
        except SQLAlchemyError as db_err:
            db.rollback()
            logger.warning(
                f"Failed to persist AI analysis result to history for {profile.login}: {db_err}"
            )

    return envelope

