import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User
from app.dependencies import get_current_user
from app.internships.service import internships_service
from app.internships.schemas import (
    InternshipsListResponse,
    InternshipDetailOut,
    InternshipSourcesResponse,
    SyncResultOut,
    SaveInternshipRequest,
)

logger = logging.getLogger("devprofile_ai.routers.internships")

router = APIRouter(prefix="/api/internships", tags=["Internship Matches"])


@router.get(
    "",
    response_model=InternshipsListResponse,
    summary="List internship vacancies with personalized candidate match scores",
)
@router.get(
    "/",
    response_model=InternshipsListResponse,
    include_in_schema=False,
)
async def list_internships(
    search: Optional[str] = Query(None, description="Search keyword for role title, company, or skills"),
    q: Optional[str] = Query(None, description="Search keyword alias"),
    location: Optional[str] = Query(None, description="Filter by location string"),
    work_mode: Optional[str] = Query(None, description="Filter by work mode (remote, hybrid, onsite)"),
    is_internship_only: bool = Query(True, description="Strictly filter for intern, co-op, and early-career roles"),
    saved_only: bool = Query(False, description="Filter to only internships bookmarked by the user"),
    include_stale: bool = Query(False, description="Include unverified or stale vacancies"),
    min_score: Optional[int] = Query(None, ge=0, le=100, description="Minimum match score threshold (0-100)"),
    role_category: Optional[str] = Query(None, description="Filter by role category (frontend, backend, fullstack, ai_ml_data, devops_cloud)"),
    employer: Optional[str] = Query(None, description="Filter by company name or employer board"),
    sort_by: str = Query("match", pattern="^(match|recent|company)$", description="Sorting criteria"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns verified internship listings enriched with deterministic profile match scoring,
    skills comparison, and freshness telemetry.
    """
    effective_search = search if search is not None else q
    return internships_service.list_internships(
        db=db,
        user=current_user,
        search=effective_search,
        location=location,
        work_mode=work_mode,
        is_internship_only=is_internship_only,
        saved_only=saved_only,
        include_stale=include_stale,
        min_score=min_score,
        role_category=role_category,
        employer=employer,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/saved",
    response_model=InternshipsListResponse,
    summary="List all internships saved by current user",
)
@router.get(
    "/saved/",
    response_model=InternshipsListResponse,
    include_in_schema=False,
)
async def list_saved_internships(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return internships_service.list_internships(
        db=db,
        user=current_user,
        saved_only=True,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/sources",
    response_model=InternshipSourcesResponse,
    summary="List configured official job board sources and synchronization telemetry",
)
@router.get(
    "/sources/",
    response_model=InternshipSourcesResponse,
    include_in_schema=False,
)
async def get_sources_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return internships_service.get_sources_overview(db)


@router.post(
    "/refresh-matches",
    response_model=SyncResultOut,
    summary="Synchronize vacancies from official public employer APIs and recompute freshness",
)
@router.post(
    "/refresh-matches/",
    response_model=SyncResultOut,
    include_in_schema=False,
)
@router.post(
    "/sync",
    response_model=SyncResultOut,
    include_in_schema=False,
)
async def sync_internship_sources(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Polls official Greenhouse, Lever, and permitted RSS/Atom job feeds,
    updates database records, and marks unconfirmed vacancies stale.
    """
    return await internships_service.sync_all_sources(db)


@router.get(
    "/{internship_id}",
    response_model=InternshipDetailOut,
    summary="Get detailed vacancy description, sanitized HTML, matched skills, and fit explanation",
)
@router.get(
    "/{internship_id}/",
    response_model=InternshipDetailOut,
    include_in_schema=False,
)
async def get_internship_detail(
    internship_id: int,
    ai: bool = Query(False, description="Generate optional Groq AI explanation of candidate fit"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    detail = await internships_service.get_internship_detail(
        db=db,
        internship_id=internship_id,
        user=current_user,
        generate_ai=ai,
    )
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Internship vacancy #{internship_id} was not found.",
        )
    return detail


@router.post(
    "/{internship_id}/save",
    summary="Bookmark an internship for the authenticated user",
)
@router.post(
    "/{internship_id}/save/",
    include_in_schema=False,
)
async def save_internship(
    internship_id: int,
    body: Optional[SaveInternshipRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notes = body.notes if body else None
    success = internships_service.save_internship(
        db=db,
        internship_id=internship_id,
        user=current_user,
        notes=notes,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Internship #{internship_id} not found.",
        )
    return {"message": "Internship successfully saved to your bookmarks.", "is_saved": True}


@router.delete(
    "/{internship_id}/save",
    summary="Remove a saved internship bookmark",
)
@router.delete(
    "/{internship_id}/save/",
    include_in_schema=False,
)
async def unsave_internship(
    internship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    success = internships_service.unsave_internship(
        db=db,
        internship_id=internship_id,
        user=current_user,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Saved internship bookmark not found.",
        )
    return {"message": "Internship removed from saved bookmarks.", "is_saved": False}
