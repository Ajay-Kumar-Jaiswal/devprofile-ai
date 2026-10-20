from typing import List, Dict, Optional, Literal, Any
from pydantic import BaseModel, Field, field_validator, model_validator


class UserProfile(BaseModel):
    """Normalized GitHub user profile information."""
    login: str
    name: Optional[str] = None
    avatar_url: str
    html_url: str
    bio: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    blog: Optional[str] = None
    twitter_username: Optional[str] = None
    social_accounts: List[Dict[str, Any]] = Field(default_factory=list)
    public_repos: int = 0
    public_gists: int = 0
    followers: int = 0
    following: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    account_age_years: Optional[float] = None


class RepositoryItem(BaseModel):
    """Detailed repository metrics and quality indicators."""
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    html_url: str
    homepage: Optional[str] = None
    language: Optional[str] = None
    stargazers_count: int = 0
    forks_count: int = 0
    open_issues_count: int = 0
    watchers_count: int = 0
    has_readme: bool = True  # Verified or inferred where accessible
    has_description: bool = False
    has_topics: bool = False
    has_license: bool = False
    license_name: Optional[str] = None
    topics: List[str] = Field(default_factory=list)
    is_fork: bool = False
    created_at: str
    updated_at: str
    pushed_at: Optional[str] = None
    days_since_last_push: Optional[int] = None
    quality_score: int = 0  # Per-repo hygiene score (0-100)


class LanguageStat(BaseModel):
    """Language breakdown statistics."""
    language: str
    repo_count: int
    percentage: float
    color: Optional[str] = None


class ScoreCategory(BaseModel):
    """Component category for the deterministic portfolio score."""
    category: str
    score: int
    max_score: int
    percentage: float
    status: Literal["poor", "average", "good", "excellent"]
    feedback: str


class PortfolioScore(BaseModel):
    """Deterministic, documented portfolio score (0-100)."""
    overall_score: int
    tier: Literal["Needs Work", "Developing", "Competitive", "Strong", "Exceptional"]
    summary: str
    breakdown: List[ScoreCategory]
    disclaimer: str = (
        "This score is calculated by a deterministic rule-based algorithm evaluating "
        "public repository presentation, documentation coverage, tech stack diversity, and activity hygiene. "
        "It does NOT claim to predict hiring outcomes or true engineering ability."
    )


class RepoQualityChecklist(BaseModel):
    """Repository quality and presentation hygiene checklist."""
    total_repos_analyzed: int
    repos_with_description: int
    repos_with_description_pct: float
    repos_with_topics: int
    repos_with_topics_pct: float
    repos_with_license: int
    repos_with_license_pct: float
    repos_active_within_6_months: int
    repos_active_within_6_months_pct: float
    original_repos_count: int
    forked_repos_count: int
    pinned_notice: str = (
        "Note: The public GitHub repository list API does not reliably indicate user-pinned repositories. "
        "This audit reflects all accessible public repositories (up to the analyzed cap)."
    )


class RecommendationItem(BaseModel):
    """Actionable improvement recommendation based on collected data."""
    id: str
    priority: Literal["high", "medium", "low"]
    category: str
    title: str
    description: str
    impact: str
    action: str


class RoadmapStep(BaseModel):
    """Single step within an action roadmap."""
    day_or_week: str
    task: str
    details: str
    expected_outcome: str


class RoadmapPhase(BaseModel):
    """Structured improvement roadmap."""
    title: str
    timeline: str
    objective: str
    is_mock_ai: bool = True
    ai_engine_badge: str = "Phase 1: Deterministic Engine (Groq AI Integration scheduled for Phase 2)"
    steps: List[RoadmapStep]


class AggregateStats(BaseModel):
    """Calculated aggregate metrics across repositories."""
    total_stars: int
    total_forks: int
    total_public_repos: int
    total_analyzed_repos: int
    detected_languages_count: int
    primary_language: Optional[str] = None
    average_stars_per_repo: float
    total_open_issues: int


# ============================================================================
# Phase 2: Groq Structured AI Analysis Models
# ============================================================================

class ProjectFeedbackItem(BaseModel):
    """Targeted feedback on a specific repository."""
    repo_name: str
    feedback: str
    suggested_improvements: List[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_project_keys(cls, data: Any) -> Any:
        if isinstance(data, dict):
            repo_name = data.get("repo_name") or data.get("name") or data.get("repository") or "project"
            feedback = data.get("feedback") or data.get("critique") or data.get("observations") or "No feedback recorded"
            improvements = data.get("suggested_improvements") or data.get("improvements") or []
            if isinstance(improvements, str):
                improvements = [improvements]
            return {
                "repo_name": str(repo_name),
                "feedback": str(feedback),
                "suggested_improvements": improvements if isinstance(improvements, list) else [str(improvements)],
            }
        return data


class AIRecommendationItem(BaseModel):
    """Prioritized recommendation produced by Groq AI."""
    priority: Literal["high", "medium", "low"]
    category: str
    title: str
    reason: str
    suggested_action: str

    @model_validator(mode="before")
    @classmethod
    def normalize_recommendation_keys(cls, data: Any) -> Any:
        if isinstance(data, dict):
            raw_p = str(data.get("priority") or "medium").strip().lower()
            if "high" in raw_p or "urgent" in raw_p or "critical" in raw_p or "p0" in raw_p or "p1" in raw_p:
                priority = "high"
            elif "low" in raw_p or "minor" in raw_p or "optional" in raw_p or "p3" in raw_p:
                priority = "low"
            else:
                priority = "medium"

            category = data.get("category") or data.get("area") or "Portfolio"
            title = data.get("title") or data.get("recommendation") or "Improvement recommendation"
            reason = data.get("reason") or data.get("why") or data.get("impact") or "Enhances portfolio presentation"
            action = data.get("suggested_action") or data.get("action") or data.get("how") or "Implement suggested update"
            return {
                "priority": priority,
                "category": str(category),
                "title": str(title),
                "reason": str(reason),
                "suggested_action": str(action),
            }
        return data


class AIRoadmapTask(BaseModel):
    """Daily/short-term achievable task in the 7-day AI plan."""
    day: str
    task: str
    details: str
    expected_outcome: str

    @model_validator(mode="before")
    @classmethod
    def normalize_task_keys(cls, data: Any) -> Any:
        if isinstance(data, dict):
            day = data.get("day") or data.get("day_or_step") or data.get("timeline") or "Day 1-2"
            task = data.get("task") or data.get("title") or data.get("action") or "Task"
            details = data.get("details") or data.get("description") or data.get("actionable_steps") or ""
            outcome = data.get("expected_outcome") or data.get("outcome") or data.get("deliverable") or "Completed task"
            return {
                "day": str(day),
                "task": str(task),
                "details": str(details),
                "expected_outcome": str(outcome),
            }
        return data


class AIRoadmapMilestone(BaseModel):
    """Weekly strategic milestone in the 30-day AI plan."""
    week: str
    milestone: str
    details: str
    expected_outcome: str

    @model_validator(mode="before")
    @classmethod
    def normalize_milestone_keys(cls, data: Any) -> Any:
        if isinstance(data, dict):
            week = data.get("week") or data.get("timeline") or data.get("phase") or "Week 1"
            milestone = data.get("milestone") or data.get("title") or data.get("task") or "Milestone"
            details = data.get("details") or data.get("description") or ""
            outcome = data.get("expected_outcome") or data.get("outcome") or data.get("deliverable") or "Weekly deliverable"
            return {
                "week": str(week),
                "milestone": str(milestone),
                "details": str(details),
                "expected_outcome": str(outcome),
            }
        return data


class AIAnalysisResult(BaseModel):
    """Structured, validated JSON produced by Groq LLM."""
    summary: str
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    project_feedback: List[ProjectFeedbackItem] = Field(default_factory=list)
    profile_improvements: List[str] = Field(default_factory=list)
    placement_readiness: List[str] = Field(default_factory=list)
    interviewer_talking_points: List[str] = Field(default_factory=list)
    recommendations: List[AIRecommendationItem] = Field(default_factory=list)
    roadmap_7_days: List[AIRoadmapTask] = Field(default_factory=list)
    roadmap_30_days: List[AIRoadmapMilestone] = Field(default_factory=list)
    missing_evidence: List[str] = Field(default_factory=list)

    @field_validator("strengths", "weaknesses", "profile_improvements", "placement_readiness", "interviewer_talking_points", "missing_evidence", mode="before")
    @classmethod
    def normalize_string_lists(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            lines = [line.strip().lstrip("-*•0123456789. ") for line in v.splitlines() if line.strip()]
            return lines if lines else [v]
        if isinstance(v, list):
            return [str(item) for item in v if item]
        return []


class AIAnalysisEnvelope(BaseModel):
    """Envelope wrapping AI execution status, model used, and validated output."""
    status: Literal["success", "disabled", "unavailable", "rate_limited", "error"]
    model_used: Optional[str] = None
    is_mock: bool = False
    error_message: Optional[str] = None
    analysis: Optional[AIAnalysisResult] = None


class AnalysisResponse(BaseModel):
    """Complete analysis payload returned to the frontend."""
    username: str
    analyzed_at: str
    is_demo_data: bool = False
    profile: UserProfile
    stats: AggregateStats
    languages: List[LanguageStat]
    top_repositories: List[RepositoryItem]
    portfolio_score: PortfolioScore
    quality_checklist: RepoQualityChecklist
    recommendations: List[RecommendationItem]
    roadmap_7_day: RoadmapPhase
    roadmap_30_day: RoadmapPhase
    ai_analysis: Optional[AIAnalysisEnvelope] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    environment: str
    version: str
    github_api_status: str
    groq_api_status: str
    github_authenticated: bool = False
    github_rate_limited: bool = False
    github_rate_limit_reset: Optional[int] = None
    groq_configured: bool = False

