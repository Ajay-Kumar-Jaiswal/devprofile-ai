import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any, Set
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.config import settings
from app.db_models import User, AnalysisRun, InternshipListing, UserSavedInternship
from app.internships.adapters.registry import source_registry
from app.internships.normalizer import normalize_raw_listing, NormalizedListing
from app.internships.matcher import (
    CandidateSkillsProfile,
    calculate_match_score,
    generate_optional_ai_explanation,
)
from app.internships.schemas import (
    InternshipListingSummaryOut,
    InternshipDetailOut,
    InternshipMatchSummaryOut,
    InternshipsListResponse,
    InternshipSourceInfo,
    InternshipSourcesResponse,
    SyncResultOut,
    ScoreBreakdown,
)

logger = logging.getLogger("devprofile_ai.internships.service")


class InternshipsService:
    """Service orchestrating ingestion, freshness lifecycle, matching, and bookmarks."""

    async def sync_all_sources(self, db: Session) -> SyncResultOut:
        """
        Polls official APIs across all configured employer job boards and feeds.
        Normalizes, deduplicates, and enforces freshness lifecycle.
        """
        sources = source_registry.get_configured_sources()
        if not sources:
            return SyncResultOut(
                status="no_sources_configured",
                sources_checked=0,
                listings_ingested=0,
                listings_updated=0,
                listings_marked_stale=0,
                message="No employer boards or feeds are currently configured in environment variables.",
            )

        ingested_count = 0
        updated_count = 0
        stale_count = 0
        now = datetime.now(timezone.utc)
        stale_cutoff = now - timedelta(hours=settings.INTERNSHIP_STALE_HOURS)

        async with httpx.AsyncClient(timeout=settings.INTERNSHIP_SYNC_TIMEOUT_SECONDS) as client:
            for src in sources:
                provider = src["provider"]
                identifier = src["identifier"]
                board_or_site = identifier.split(":", 1)[0] if ":" in identifier else identifier
                board_or_site = board_or_site.strip().lower()

                try:
                    adapter = source_registry.get_adapter(provider)
                    raw_items = await adapter.fetch_listings(identifier, client)
                    seen_job_ids: Set[str] = set()

                    for raw in raw_items:
                        norm = normalize_raw_listing(raw)
                        if not norm:
                            continue

                        seen_job_ids.add(norm.source_job_id)

                        existing = (
                            db.query(InternshipListing)
                            .filter(
                                InternshipListing.source_type == norm.source_type,
                                InternshipListing.source_board_or_site == norm.source_board_or_site,
                                InternshipListing.source_job_id == norm.source_job_id,
                            )
                            .first()
                        )

                        if existing:
                            # Update existing listing
                            existing.title = norm.title
                            existing.description_html = norm.description_html
                            existing.description_text = norm.description_text
                            existing.location = norm.location
                            existing.work_mode = norm.work_mode
                            existing.is_internship = norm.is_internship
                            existing.required_skills_json = json.dumps(norm.required_skills)
                            existing.preferred_skills_json = json.dumps(norm.preferred_skills)
                            existing.original_url = norm.original_url
                            existing.application_url = norm.application_url
                            existing.salary_currency = norm.salary_currency
                            existing.salary_min = norm.salary_min
                            existing.salary_max = norm.salary_max
                            existing.salary_interval = norm.salary_interval
                            existing.duration = norm.duration
                            existing.deadline = norm.deadline
                            if norm.updated_at_source:
                                existing.updated_at_source = norm.updated_at_source
                            existing.last_seen_at = now
                            existing.last_verified_at = now
                            existing.is_stale = False
                            existing.is_active = True
                            updated_count += 1
                        else:
                            # Insert new vacancy
                            new_listing = InternshipListing(
                                source_type=norm.source_type,
                                source_board_or_site=norm.source_board_or_site,
                                source_job_id=norm.source_job_id,
                                company_name=norm.company_name,
                                title=norm.title,
                                description_html=norm.description_html,
                                description_text=norm.description_text,
                                location=norm.location,
                                work_mode=norm.work_mode,
                                is_internship=norm.is_internship,
                                required_skills_json = json.dumps(norm.required_skills),
                                preferred_skills_json = json.dumps(norm.preferred_skills),
                                original_url=norm.original_url,
                                application_url=norm.application_url,
                                salary_currency=norm.salary_currency,
                                salary_min=norm.salary_min,
                                salary_max=norm.salary_max,
                                salary_interval=norm.salary_interval,
                                duration=norm.duration,
                                deadline=norm.deadline,
                                published_at=norm.published_at or now,
                                updated_at_source=norm.updated_at_source or now,
                                first_seen_at=now,
                                last_seen_at=now,
                                last_verified_at=now,
                                is_stale=False,
                                is_active=True,
                            )
                            db.add(new_listing)
                            ingested_count += 1

                    # Freshness policy: Mark DB listings not in the current API response as stale
                    board_listings = (
                        db.query(InternshipListing)
                        .filter(
                            InternshipListing.source_type == provider,
                            InternshipListing.source_board_or_site == board_or_site,
                            InternshipListing.is_active == True,
                        )
                        .all()
                    )
                    for bl in board_listings:
                        if bl.source_job_id not in seen_job_ids:
                            bl.is_stale = True
                            if bl.last_seen_at < stale_cutoff:
                                bl.is_active = False
                            stale_count += 1

                    db.commit()

                except Exception as e:
                    db.rollback()
                    logger.error(f"Error syncing provider {provider} identifier '{identifier}': {e}", exc_info=True)

        return SyncResultOut(
            status="completed",
            sources_checked=len(sources),
            listings_ingested=ingested_count,
            listings_updated=updated_count,
            listings_marked_stale=stale_count,
            message=(
                f"Sync completed across {len(sources)} source(s): {ingested_count} added, "
                f"{updated_count} updated, {stale_count} marked stale."
            ),
        )

    def get_candidate_profile(self, db: Session, user: User) -> Tuple[CandidateSkillsProfile, bool]:
        """Loads candidate's latest successful GitHub profile analysis run."""
        latest_run = (
            db.query(AnalysisRun)
            .filter(
                AnalysisRun.user_id == user.id,
                AnalysisRun.status == "success",
            )
            .order_by(desc(AnalysisRun.created_at))
            .first()
        )
        has_analysis = latest_run is not None
        profile = CandidateSkillsProfile(latest_run)
        return profile, has_analysis

    def list_internships(
        self,
        db: Session,
        user: User,
        search: Optional[str] = None,
        location: Optional[str] = None,
        work_mode: Optional[str] = None,
        is_internship_only: bool = True,
        saved_only: bool = False,
        include_stale: bool = False,
        min_score: Optional[int] = None,
        sort_by: str = "match",  # match | recent | company
        limit: int = 50,
        offset: int = 0,
    ) -> InternshipsListResponse:
        """
        Lists internships with deterministic profile matching, filtering, and pagination.
        """
        candidate, has_analysis = self.get_candidate_profile(db, user)

        # Retrieve IDs of internships bookmarked by user
        saved_ids: Set[int] = set(
            row[0]
            for row in db.query(UserSavedInternship.internship_id)
            .filter(UserSavedInternship.user_id == user.id)
            .all()
        )

        query = db.query(InternshipListing)

        # Default filters
        if not include_stale:
            query = query.filter(InternshipListing.is_active == True, InternshipListing.is_stale == False)

        if is_internship_only:
            query = query.filter(InternshipListing.is_internship == True)

        if saved_only:
            query = query.filter(InternshipListing.id.in_(saved_ids if saved_ids else [-1]))

        # Location filter
        if location and location.strip():
            query = query.filter(InternshipListing.location.ilike(f"%{location.strip()}%"))

        # Work mode filter (remote, hybrid, onsite)
        if work_mode and work_mode.lower() in ("remote", "hybrid", "onsite"):
            query = query.filter(InternshipListing.work_mode == work_mode.lower())

        # Keyword / Text search
        if search and search.strip():
            terms = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    InternshipListing.company_name.ilike(terms),
                    InternshipListing.title.ilike(terms),
                    InternshipListing.description_text.ilike(terms),
                    InternshipListing.required_skills_json.ilike(terms),
                )
            )

        # Count active before limit
        all_matches: List[Tuple[InternshipListing, Dict[str, Any]]] = []
        db_rows = query.all()

        for listing in db_rows:
            match_res = calculate_match_score(listing, candidate)
            if min_score is not None and match_res["match_score"] < min_score:
                continue
            all_matches.append((listing, match_res))

        # Sorting
        if sort_by == "match":
            all_matches.sort(
                key=lambda x: (x[1]["match_score"], x[0].published_at or x[0].last_seen_at),
                reverse=True,
            )
        elif sort_by == "recent":
            all_matches.sort(
                key=lambda x: (x[0].published_at or x[0].last_seen_at),
                reverse=True,
            )
        elif sort_by == "company":
            all_matches.sort(key=lambda x: x[0].company_name.lower())

        total = len(all_matches)
        paginated = all_matches[offset : offset + limit]

        items: List[InternshipListingSummaryOut] = []
        for listing, match_res in paginated:
            req_s = json.loads(listing.required_skills_json or "[]")
            pref_s = json.loads(listing.preferred_skills_json or "[]")
            is_saved = listing.id in saved_ids

            match_summary = InternshipMatchSummaryOut(
                match_score=match_res["match_score"],
                fit_level=match_res["fit_level"],
                matched_skills=match_res["matched_skills"],
                not_demonstrated_skills=match_res["not_demonstrated_skills"],
                score_breakdown=ScoreBreakdown(**match_res["score_breakdown"]),
                fit_reasons=match_res["fit_reasons"],
                evidence_used=match_res["evidence_used"],
            )

            item = InternshipListingSummaryOut(
                id=listing.id,
                source_type=listing.source_type,
                source_board_or_site=listing.source_board_or_site,
                source_job_id=listing.source_job_id,
                company_name=listing.company_name,
                title=listing.title,
                location=listing.location,
                work_mode=listing.work_mode,
                is_internship=listing.is_internship,
                required_skills=req_s,
                preferred_skills=pref_s,
                original_url=listing.original_url,
                application_url=listing.application_url,
                salary_currency=listing.salary_currency,
                salary_min=listing.salary_min,
                salary_max=listing.salary_max,
                salary_interval=listing.salary_interval,
                duration=listing.duration,
                deadline=listing.deadline,
                published_at=listing.published_at,
                last_seen_at=listing.last_seen_at,
                last_verified_at=listing.last_verified_at,
                is_stale=listing.is_stale,
                is_saved=is_saved,
                match=match_summary,
            )
            items.append(item)

        active_count = db.query(InternshipListing).filter(InternshipListing.is_active == True).count()
        sources_count = len(source_registry.get_configured_sources())

        return InternshipsListResponse(
            total=total,
            items=items,
            configured_sources_count=sources_count,
            active_listings_count=active_count,
            has_profile_analysis=has_analysis,
        )

    async def get_internship_detail(
        self,
        db: Session,
        internship_id: int,
        user: User,
        generate_ai: bool = False,
    ) -> Optional[InternshipDetailOut]:
        """Retrieves full vacancy details, sanitized HTML, matched skills, and optional AI summary."""
        listing = db.query(InternshipListing).filter(InternshipListing.id == internship_id).first()
        if not listing:
            return None

        candidate, _ = self.get_candidate_profile(db, user)
        match_res = calculate_match_score(listing, candidate)

        ai_explanation = None
        if generate_ai:
            ai_explanation = await generate_optional_ai_explanation(listing, match_res, candidate)

        saved = (
            db.query(UserSavedInternship)
            .filter(
                UserSavedInternship.user_id == user.id,
                UserSavedInternship.internship_id == listing.id,
            )
            .first()
        )

        req_s = json.loads(listing.required_skills_json or "[]")
        pref_s = json.loads(listing.preferred_skills_json or "[]")

        match_summary = InternshipMatchSummaryOut(
            match_score=match_res["match_score"],
            fit_level=match_res["fit_level"],
            matched_skills=match_res["matched_skills"],
            not_demonstrated_skills=match_res["not_demonstrated_skills"],
            score_breakdown=ScoreBreakdown(**match_res["score_breakdown"]),
            fit_reasons=match_res["fit_reasons"],
            evidence_used=match_res["evidence_used"],
        )

        return InternshipDetailOut(
            id=listing.id,
            source_type=listing.source_type,
            source_board_or_site=listing.source_board_or_site,
            source_job_id=listing.source_job_id,
            company_name=listing.company_name,
            title=listing.title,
            location=listing.location,
            work_mode=listing.work_mode,
            is_internship=listing.is_internship,
            required_skills=req_s,
            preferred_skills=pref_s,
            original_url=listing.original_url,
            application_url=listing.application_url,
            salary_currency=listing.salary_currency,
            salary_min=listing.salary_min,
            salary_max=listing.salary_max,
            salary_interval=listing.salary_interval,
            duration=listing.duration,
            deadline=listing.deadline,
            published_at=listing.published_at,
            last_seen_at=listing.last_seen_at,
            last_verified_at=listing.last_verified_at,
            is_stale=listing.is_stale,
            is_saved=saved is not None,
            match=match_summary,
            description_html=listing.description_html,
            description_text=listing.description_text,
            ai_explanation=ai_explanation,
        )

    def save_internship(
        self,
        db: Session,
        internship_id: int,
        user: User,
        notes: Optional[str] = None,
    ) -> bool:
        """Bookmarks an internship for the authenticated user."""
        listing = db.query(InternshipListing).filter(InternshipListing.id == internship_id).first()
        if not listing:
            return False

        existing = (
            db.query(UserSavedInternship)
            .filter(
                UserSavedInternship.user_id == user.id,
                UserSavedInternship.internship_id == internship_id,
            )
            .first()
        )
        if existing:
            if notes is not None:
                existing.notes = notes
                db.commit()
            return True

        saved = UserSavedInternship(
            user_id=user.id,
            internship_id=internship_id,
            notes=notes,
        )
        db.add(saved)
        db.commit()
        return True

    def unsave_internship(self, db: Session, internship_id: int, user: User) -> bool:
        """Removes an internship bookmark for the authenticated user."""
        saved = (
            db.query(UserSavedInternship)
            .filter(
                UserSavedInternship.user_id == user.id,
                UserSavedInternship.internship_id == internship_id,
            )
            .first()
        )
        if not saved:
            return False

        db.delete(saved)
        db.commit()
        return True

    def get_sources_overview(self, db: Session) -> InternshipSourcesResponse:
        """Returns metadata on all configured boards and current listing volume."""
        configured = source_registry.get_configured_sources()
        sources_info: List[InternshipSourceInfo] = []

        total_active = db.query(InternshipListing).filter(InternshipListing.is_active == True).count()

        for s in configured:
            provider = s["provider"]
            ident = s["identifier"]
            board = ident.split(":", 1)[0] if ":" in ident else ident
            board = board.strip().lower()

            count = (
                db.query(InternshipListing)
                .filter(
                    InternshipListing.source_type == provider,
                    InternshipListing.source_board_or_site == board,
                    InternshipListing.is_active == True,
                )
                .count()
            )

            sources_info.append(
                InternshipSourceInfo(
                    provider=provider,
                    identifier=ident,
                    label=s["label"],
                    api_endpoint=s["api_endpoint"],
                    listings_count=count,
                    last_sync_status="active" if count > 0 else "configured",
                )
            )

        return InternshipSourcesResponse(
            sources=sources_info,
            total_configured=len(configured),
            total_active_listings=total_active,
            stale_threshold_hours=settings.INTERNSHIP_STALE_HOURS,
        )


internships_service = InternshipsService()
