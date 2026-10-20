import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User, AnalysisRun, TrackedRecommendation, RecommendationEvent
from app.dependencies import get_current_user
from app.models import AnalysisResponse
from app.saas_models import (
    HistoryListResponse,
    AnalysisRunSummary,
    RunComparisonResponse,
    ComparisonMetricDelta,
    ComparisonIssueDelta,
    TrackedRecommendationOut,
    RecommendationEventOut,
    RecommendationStatusUpdateRequest,
)

router = APIRouter(prefix="/api/history", tags=["Analysis History & Progress"])


@router.get(
    "",
    response_model=HistoryListResponse,
    summary="List analysis history runs for current user",
)
async def list_history(
    username: Optional[str] = Query(None, description="Filter history by analyzed GitHub handle"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(AnalysisRun).filter(AnalysisRun.user_id == current_user.id)

    if username:
        query = query.filter(AnalysisRun.analyzed_login == username.lower().strip())

    total = query.count()
    runs = query.order_by(AnalysisRun.created_at.desc()).offset(offset).limit(limit).all()

    summaries = [
        AnalysisRunSummary(
            id=run.id,
            analyzed_login=run.analyzed_login,
            is_demo_data=run.is_demo_data,
            overall_score=run.overall_score,
            score_tier=run.score_tier,
            public_repos=run.public_repos,
            total_stars=run.total_stars,
            primary_language=run.primary_language,
            status=run.status,
            created_at=run.created_at,
        )
        for run in runs
    ]

    return HistoryListResponse(total_runs=total, runs=summaries)


@router.get(
    "/{run_id}",
    response_model=AnalysisResponse,
    summary="Retrieve full persisted analysis snapshot by run ID",
)
async def get_history_detail(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.id == run_id, AnalysisRun.user_id == current_user.id)
        .first()
    )

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis run snapshot not found or access denied.",
        )

    # Reconstruct AnalysisResponse from serialized JSON snapshots
    profile_dict = json.loads(run.profile_data_json)
    stats_dict = json.loads(run.stats_data_json)
    languages_list = json.loads(run.languages_json)
    repos_list = json.loads(run.repositories_json)
    score_dict = json.loads(run.score_breakdown_json)
    checklist_dict = json.loads(run.checklist_json)
    ai_envelope_dict = json.loads(run.ai_analysis_json) if run.ai_analysis_json else None

    # Load tracked recommendations for this user and login
    tracked_recs = (
        db.query(TrackedRecommendation)
        .filter(
            TrackedRecommendation.user_id == current_user.id,
            TrackedRecommendation.analyzed_login == run.analyzed_login,
        )
        .all()
    )

    recs_list = [
        {
            "id": r.rule_id,
            "priority": r.priority,
            "category": r.category,
            "title": r.title,
            "description": r.description,
            "impact": r.impact,
            "action": r.suggested_action,
        }
        for r in tracked_recs
        if r.status == "open"
    ]

    # Dummy roadmaps if not stored separately
    from app.analyzer.recommendations import generate_roadmap
    from app.services.github_service import github_service

    profile_obj = github_service.parse_profile(profile_dict)
    repos_objs = github_service.parse_repositories(repos_list)
    languages_objs = [github_service.parse_profile for _ in []]  # typed helper
    from app.models import LanguageStat, RecommendationItem
    languages_objs = [LanguageStat(**l) for l in languages_list]
    recs_objs = [RecommendationItem(**r) for r in recs_list] if recs_list else None
    roadmap_7, roadmap_30 = generate_roadmap(profile_obj, repos_objs, languages_objs, recs_objs)

    return AnalysisResponse(
        username=run.analyzed_login,
        analyzed_at=run.created_at.isoformat(),
        is_demo_data=run.is_demo_data,
        profile=profile_dict,
        stats=stats_dict,
        languages=languages_list,
        top_repositories=repos_list,
        portfolio_score=score_dict,
        quality_checklist=checklist_dict,
        recommendations=recs_list,
        roadmap_7_day=roadmap_7,
        roadmap_30_day=roadmap_30,
        ai_analysis=ai_envelope_dict,
    )


@router.get(
    "/{current_run_id}/compare/{previous_run_id}",
    response_model=RunComparisonResponse,
    summary="Compare two historical analysis runs to evaluate score and metric deltas",
)
async def compare_runs(
    current_run_id: int,
    previous_run_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.id == current_run_id, AnalysisRun.user_id == current_user.id)
        .first()
    )
    previous_run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.id == previous_run_id, AnalysisRun.user_id == current_user.id)
        .first()
    )

    if not current_run or not previous_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both of the selected analysis runs could not be found.",
        )

    score_delta = current_run.overall_score - previous_run.overall_score
    tier_change = None
    if current_run.score_tier != previous_run.score_tier:
        tier_change = f"{previous_run.score_tier} -> {current_run.score_tier}"

    curr_stats = json.loads(current_run.stats_data_json)
    prev_stats = json.loads(previous_run.stats_data_json)

    metrics_deltas = [
        ComparisonMetricDelta(
            metric="Overall Portfolio Score",
            previous=previous_run.overall_score,
            current=current_run.overall_score,
            change=f"{'+' if score_delta > 0 else ''}{score_delta}",
            improved=score_delta > 0 if score_delta != 0 else None,
        ),
        ComparisonMetricDelta(
            metric="Total Stars",
            previous=prev_stats.get("total_stars", 0),
            current=curr_stats.get("total_stars", 0),
            change=curr_stats.get("total_stars", 0) - prev_stats.get("total_stars", 0),
            improved=curr_stats.get("total_stars", 0) > prev_stats.get("total_stars", 0),
        ),
        ComparisonMetricDelta(
            metric="Public Repositories",
            previous=prev_stats.get("total_public_repos", 0),
            current=curr_stats.get("total_public_repos", 0),
            change=curr_stats.get("total_public_repos", 0) - prev_stats.get("total_public_repos", 0),
            improved=curr_stats.get("total_public_repos", 0) >= prev_stats.get("total_public_repos", 0),
        ),
        ComparisonMetricDelta(
            metric="Total Forks",
            previous=prev_stats.get("total_forks", 0),
            current=curr_stats.get("total_forks", 0),
            change=curr_stats.get("total_forks", 0) - prev_stats.get("total_forks", 0),
            improved=curr_stats.get("total_forks", 0) >= prev_stats.get("total_forks", 0),
        ),
    ]

    # Calculate issue deltas from checklist or recommendation events
    curr_checklist = json.loads(current_run.checklist_json)
    prev_checklist = json.loads(previous_run.checklist_json)

    # Load tracked recommendations around these timestamps
    tracked_recs = (
        db.query(TrackedRecommendation)
        .filter(
            TrackedRecommendation.user_id == current_user.id,
            TrackedRecommendation.analyzed_login == current_run.analyzed_login,
        )
        .all()
    )

    newly_detected: List[ComparisonIssueDelta] = []
    resolved: List[ComparisonIssueDelta] = []
    persistent: List[ComparisonIssueDelta] = []

    for r in tracked_recs:
        item = ComparisonIssueDelta(
            rule_id=r.rule_id,
            title=r.title,
            priority=r.priority,
            category=r.category,
        )
        if r.status == "resolved":
            resolved.append(item)
        elif r.recurrence_count > 0:
            newly_detected.append(item)
        else:
            persistent.append(item)

    return RunComparisonResponse(
        current_run_id=current_run.id,
        previous_run_id=previous_run.id,
        analyzed_login=current_run.analyzed_login,
        current_date=current_run.created_at,
        previous_date=previous_run.created_at,
        score_delta=score_delta,
        tier_change=tier_change,
        metrics_deltas=metrics_deltas,
        newly_detected_issues=newly_detected,
        resolved_issues=resolved,
        persistent_issues=persistent,
    )


@router.delete(
    "",
    summary="Clear all analysis history snapshots for current user",
)
@router.delete(
    "/",
    summary="Clear all analysis history snapshots for current user (trailing slash)",
    include_in_schema=False,
)
@router.delete(
    "/clear",
    summary="Clear all analysis history snapshots (clear subpath)",
    include_in_schema=False,
)
@router.post(
    "/clear",
    summary="Clear all analysis history snapshots via POST",
    include_in_schema=False,
)
async def clear_all_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently deletes all analysis history snapshots belonging strictly
    to the authenticated user. Ownership is enforced on the backend.
    """
    try:
        db.query(AnalysisRun).filter(AnalysisRun.user_id == current_user.id).update(
            {AnalysisRun.previous_run_id: None}, synchronize_session=False
        )
        deleted_count = (
            db.query(AnalysisRun)
            .filter(AnalysisRun.user_id == current_user.id)
            .delete(synchronize_session=False)
        )
        db.commit()
        return {
            "message": f"Successfully cleared {deleted_count} analysis snapshot(s).",
            "deleted_count": deleted_count,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear analysis history: {str(e)}",
        )


@router.delete(
    "/{run_id}",
    summary="Delete an analysis run from history",
)
async def delete_run(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.id == run_id, AnalysisRun.user_id == current_user.id)
        .first()
    )
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found or access denied.",
        )

    db.delete(run)
    db.commit()
    return {"message": f"Run #{run_id} successfully deleted."}
