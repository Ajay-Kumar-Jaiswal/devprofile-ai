from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session

from app.models import RecommendationItem
from app.db_models import TrackedRecommendation, RecommendationEvent


def utcnow():
    return datetime.now(timezone.utc)


def reconcile_recommendations(
    db: Session,
    user_id: int,
    analyzed_login: str,
    current_findings: List[RecommendationItem],
    is_live_data_reliable: bool = True,
) -> List[TrackedRecommendation]:
    """
    Reconciles freshly generated deterministic findings against the persistent database records
    for the given application user and analyzed GitHub profile.

    Reconciliation rules:
      1. Uses stable rule identifiers (rule_id) to match findings.
      2. If an open issue still exists: retains it, updates evidence and last_detected_at (no duplicates).
      3. If an open issue is no longer detected and live data is reliable: marks as resolved.
      4. If a previously resolved issue reappears: reopens it as recurring and logs a status change event.
      5. If an issue was dismissed by the user: preserves dismissed status while updating evidence.
      6. If live data fetching was unreliable (failed/stale): does NOT infer issues were fixed.
      7. Repeated analyses of unchanged data create ZERO duplicate recommendations.
    """
    clean_login = analyzed_login.lower().strip()
    now = utcnow()

    # Query all existing tracked recommendations for this user and analyzed login
    existing_records: List[TrackedRecommendation] = (
        db.query(TrackedRecommendation)
        .filter(
            TrackedRecommendation.user_id == user_id,
            TrackedRecommendation.analyzed_login == clean_login,
        )
        .all()
    )

    # Map existing records by stable key: rule_id
    existing_map: Dict[str, TrackedRecommendation] = {
        rec.rule_id: rec for rec in existing_records
    }

    # Set of rule_ids present in the current deterministic run
    detected_rule_ids = set()

    for item in current_findings:
        rule_key = item.id
        detected_rule_ids.add(rule_key)

        existing = existing_map.get(rule_key)

        if existing:
            # Issue was already tracked
            if existing.status == "resolved":
                # Reappeared! Reopen as recurring issue
                prev_status = existing.status
                existing.status = "open"
                existing.recurrence_count += 1
                existing.last_detected_at = now
                existing.resolved_at = None
                existing.evidence = item.impact or item.description
                existing.suggested_action = item.action
                existing.priority = item.priority

                event = RecommendationEvent(
                    recommendation_id=existing.id,
                    previous_status=prev_status,
                    new_status="open",
                    trigger_reason="reopened_recurring",
                    evidence_snapshot=item.impact or item.description,
                    created_at=now,
                )
                db.add(event)

            elif existing.status in ("open", "needs_verification"):
                # Still open: update evidence and freshness timestamp without duplicating
                existing.last_detected_at = now
                existing.evidence = item.impact or item.description
                existing.suggested_action = item.action
                existing.priority = item.priority
                existing.title = item.title
                existing.description = item.description

            elif existing.status == "dismissed":
                # Preserved dismissed state, but update detection timestamp
                existing.last_detected_at = now
                existing.evidence = item.impact or item.description

        else:
            # Brand new finding: create TrackedRecommendation
            new_rec = TrackedRecommendation(
                user_id=user_id,
                analyzed_login=clean_login,
                rule_id=rule_key,
                category=item.category,
                priority=item.priority,
                title=item.title,
                description=item.description,
                impact=item.impact,
                suggested_action=item.action,
                evidence=item.impact or item.description,
                repo_name=None,
                status="open",
                first_detected_at=now,
                last_detected_at=now,
                resolved_at=None,
                recurrence_count=0,
            )
            db.add(new_rec)
            db.flush()  # Obtain new_rec.id

            event = RecommendationEvent(
                recommendation_id=new_rec.id,
                previous_status="none",
                new_status="open",
                trigger_reason="initial_detection",
                evidence_snapshot=item.impact or item.description,
                created_at=now,
            )
            db.add(event)
            existing_map[rule_key] = new_rec

    # Check for previously open items that are NO LONGER detected
    if is_live_data_reliable:
        for rule_key, rec in existing_map.items():
            if rule_key not in detected_rule_ids and rec.status == "open":
                # Issue has been resolved by recent changes in GitHub!
                prev_status = rec.status
                rec.status = "resolved"
                rec.resolved_at = now

                event = RecommendationEvent(
                    recommendation_id=rec.id,
                    previous_status=prev_status,
                    new_status="resolved",
                    trigger_reason="no_longer_detected",
                    evidence_snapshot="Deterministic rule engine verified issue is no longer present.",
                    created_at=now,
                )
                db.add(event)

    db.commit()

    # Return refreshed recommendations list for this user and login
    return (
        db.query(TrackedRecommendation)
        .filter(
            TrackedRecommendation.user_id == user_id,
            TrackedRecommendation.analyzed_login == clean_login,
        )
        .order_by(
            TrackedRecommendation.status.asc(),
            TrackedRecommendation.priority.asc(),
            TrackedRecommendation.last_detected_at.desc(),
        )
        .all()
    )
