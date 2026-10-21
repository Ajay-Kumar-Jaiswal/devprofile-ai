from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ScoreBreakdown(BaseModel):
    tech_stack_score: int
    tools_score: int
    readiness_score: int
    domain_score: int


class InternshipMatchSummaryOut(BaseModel):
    match_score: int
    fit_level: str
    matched_skills: List[str]
    not_demonstrated_skills: List[str]
    score_breakdown: ScoreBreakdown
    fit_reasons: List[str]
    evidence_used: str
    skill_evidence_disclaimer: str = "Not demonstrated in GitHub profile"


class InternshipListingSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_type: str
    source_board_or_site: str
    source_job_id: str
    company_name: str
    title: str
    location: Optional[str] = None
    work_mode: str
    is_internship: bool
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    original_url: str
    application_url: Optional[str] = None

    salary_currency: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_interval: Optional[str] = None
    duration: Optional[str] = None
    deadline: Optional[datetime] = None

    published_at: Optional[datetime] = None
    last_seen_at: datetime
    last_verified_at: datetime
    is_stale: bool
    is_saved: bool = False
    match: Optional[InternshipMatchSummaryOut] = None


class InternshipDetailOut(InternshipListingSummaryOut):
    description_html: str
    description_text: str
    ai_explanation: Optional[str] = None


class InternshipsListResponse(BaseModel):
    total: int
    items: List[InternshipListingSummaryOut]
    configured_sources_count: int
    active_listings_count: int
    has_profile_analysis: bool


class InternshipSourceInfo(BaseModel):
    provider: str
    identifier: str
    label: str
    api_endpoint: str
    listings_count: int = 0
    last_sync_status: str = "configured"
    health_status: str = "configured"  # configured | healthy_with_results | healthy_empty | rate_limited | invalid_config | requires_auth_or_partner | temporarily_unavailable | disabled_no_authorized_api
    status_message: Optional[str] = None
    last_checked_at: Optional[datetime] = None
    official_portal_url: Optional[str] = None
    authorized_api_available: bool = True


class InternshipSourcesResponse(BaseModel):
    sources: List[InternshipSourceInfo]
    total_configured: int
    total_active_listings: int
    stale_threshold_hours: int


class SyncResultOut(BaseModel):
    status: str
    sources_checked: int
    listings_ingested: int
    listings_updated: int
    listings_marked_stale: int
    message: str


class SaveInternshipRequest(BaseModel):
    notes: Optional[str] = None
