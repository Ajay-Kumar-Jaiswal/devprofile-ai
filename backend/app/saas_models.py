from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field


# ============================================================================
# Authentication Models
# ============================================================================

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: Optional[str] = None
    default_profile_username: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class ConnectedGitHubOut(BaseModel):
    github_user_id: int
    github_login: str
    avatar_url: Optional[str] = None
    html_url: Optional[str] = None
    connected_at: datetime


class UserOut(BaseModel):
    id: int
    email: Optional[str] = None
    full_name: Optional[str] = None
    default_profile_username: Optional[str] = None
    connected_github: Optional[ConnectedGitHubOut] = None
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserOut
    token: str
    message: str


class GitHubOAuthUrlResponse(BaseModel):
    is_configured: bool
    auth_url: Optional[str] = None
    client_id: Optional[str] = None
    setup_instructions: Optional[str] = None


class GitHubOAuthCallbackRequest(BaseModel):
    code: str
    state: str


class DefaultProfileRequest(BaseModel):
    profile_input: str = Field(..., description="GitHub handle or profile URL to set as default")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    success: bool
    message: str
    requires_email_service: bool = True
    documentation: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# ============================================================================
# History & Comparison Models
# ============================================================================

class AnalysisRunSummary(BaseModel):
    id: int
    analyzed_login: str
    is_demo_data: bool
    overall_score: int
    score_tier: str
    public_repos: int
    total_stars: int
    primary_language: Optional[str] = None
    status: str
    created_at: datetime


class HistoryListResponse(BaseModel):
    total_runs: int
    runs: List[AnalysisRunSummary]


class ComparisonMetricDelta(BaseModel):
    metric: str
    previous: Any
    current: Any
    change: Any
    improved: Optional[bool] = None


class ComparisonIssueDelta(BaseModel):
    rule_id: str
    title: str
    priority: str
    category: str


class RunComparisonResponse(BaseModel):
    current_run_id: int
    previous_run_id: int
    analyzed_login: str
    current_date: datetime
    previous_date: datetime
    score_delta: int
    tier_change: Optional[str] = None
    metrics_deltas: List[ComparisonMetricDelta]
    newly_detected_issues: List[ComparisonIssueDelta]
    resolved_issues: List[ComparisonIssueDelta]
    persistent_issues: List[ComparisonIssueDelta]


# ============================================================================
# Tracked Recommendations Models
# ============================================================================

class RecommendationEventOut(BaseModel):
    id: int
    previous_status: str
    new_status: str
    trigger_reason: str
    evidence_snapshot: Optional[str] = None
    created_at: datetime


class TrackedRecommendationOut(BaseModel):
    id: int
    analyzed_login: str
    rule_id: str
    category: str
    priority: str
    title: str
    description: str
    impact: str
    suggested_action: str
    evidence: str
    repo_name: Optional[str] = None
    status: str  # open | resolved | dismissed | needs_verification
    first_detected_at: datetime
    last_detected_at: datetime
    resolved_at: Optional[datetime] = None
    recurrence_count: int
    events: List[RecommendationEventOut] = []


class RecommendationStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(open|dismissed)$", description="New status ('open' or 'dismissed')")
