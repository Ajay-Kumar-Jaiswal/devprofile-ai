from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User, TrackedRecommendation, RecommendationEvent
from app.dependencies import get_current_user
from app.saas_models import (
    TrackedRecommendationOut,
    RecommendationEventOut,
    RecommendationStatusUpdateRequest,
)

router = APIRouter(prefix="/api/recommendations", tags=["Tracked Recommendations"])


def rec_to_out(rec: TrackedRecommendation) -> TrackedRecommendationOut:
    events_out = [
        RecommendationEventOut(
            id=ev.id,
            previous_status=ev.previous_status,
            new_status=ev.new_status,
            trigger_reason=ev.trigger_reason,
            evidence_snapshot=ev.evidence_snapshot,
            created_at=ev.created_at,
        )
        for ev in rec.events
    ]

    return TrackedRecommendationOut(
        id=rec.id,
        analyzed_login=rec.analyzed_login,
        rule_id=rec.rule_id,
        category=rec.category,
        priority=rec.priority,
        title=rec.title,
        description=rec.description,
        impact=rec.impact,
        suggested_action=rec.suggested_action,
        evidence=rec.evidence,
        repo_name=rec.repo_name,
        status=rec.status,
        first_detected_at=rec.first_detected_at,
        last_detected_at=rec.last_detected_at,
        resolved_at=rec.resolved_at,
        recurrence_count=rec.recurrence_count,
        events=events_out,
    )


@router.get(
    "",
    response_model=List[TrackedRecommendationOut],
    summary="List tracked recommendations for current user with filtering by status and username",
)
async def list_recommendations(
    filter_status: Optional[str] = Query(None, alias="status", description="Filter by status: open, resolved, recurring, dismissed"),
    username: Optional[str] = Query(None, description="Filter by analyzed GitHub username"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(TrackedRecommendation).filter(TrackedRecommendation.user_id == current_user.id)

    if username:
        query = query.filter(TrackedRecommendation.analyzed_login == username.lower().strip())

    if filter_status:
        st = filter_status.lower().strip()
        if st == "recurring":
            query = query.filter(
                TrackedRecommendation.recurrence_count > 0,
                TrackedRecommendation.status == "open",
            )
        elif st in ("open", "resolved", "dismissed", "needs_verification"):
            query = query.filter(TrackedRecommendation.status == st)

    recs = query.order_by(
        TrackedRecommendation.status.asc(),
        TrackedRecommendation.priority.asc(),
        TrackedRecommendation.last_detected_at.desc(),
    ).all()

    return [rec_to_out(r) for r in recs]


@router.patch(
    "/{rec_id}/status",
    response_model=TrackedRecommendationOut,
    summary="Update recommendation status (dismiss or reopen)",
)
async def update_recommendation_status(
    rec_id: int,
    body: RecommendationStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = (
        db.query(TrackedRecommendation)
        .filter(TrackedRecommendation.id == rec_id, TrackedRecommendation.user_id == current_user.id)
        .first()
    )

    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found or access denied.",
        )

    target_status = body.status.lower().strip()
    if target_status not in ("open", "dismissed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manual status changes are restricted to 'open' or 'dismissed'. Resolved status requires verification by a live analysis.",
        )

    prev_status = rec.status
    if prev_status != target_status:
        rec.status = target_status
        trigger = "user_dismissed" if target_status == "dismissed" else "reopened_by_user"
        event = RecommendationEvent(
            recommendation_id=rec.id,
            previous_status=prev_status,
            new_status=target_status,
            trigger_reason=trigger,
            evidence_snapshot=f"Status manually updated to {target_status} by user.",
        )
        db.add(event)
        db.commit()
        db.refresh(rec)

    return rec_to_out(rec)
