from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Index,
    Float,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    default_profile_username = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    @property
    def has_password(self) -> bool:
        """Authoritative check on whether the user has a local password hash configured."""
        return bool(self.hashed_password and str(self.hashed_password).strip())

    connected_github = relationship(
        "ConnectedGitHubAccount",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    analysis_runs = relationship(
        "AnalysisRun",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(AnalysisRun.created_at)",
    )
    recommendations = relationship(
        "TrackedRecommendation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    saved_internships = relationship(
        "UserSavedInternship",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class ConnectedGitHubAccount(Base):
    __tablename__ = "connected_github_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    github_user_id = Column(Integer, unique=True, index=True, nullable=False)
    github_login = Column(String(100), index=True, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    html_url = Column(String(500), nullable=True)
    connected_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="connected_github")


class AnalyzedProfile(Base):
    __tablename__ = "analyzed_profiles"

    id = Column(Integer, primary_key=True, index=True)
    github_user_id = Column(Integer, index=True, nullable=True)
    github_login = Column(String(100), index=True, nullable=False)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    analyzed_login = Column(String(100), index=True, nullable=False)
    is_demo_data = Column(Boolean, default=False, nullable=False)
    overall_score = Column(Integer, nullable=False)
    score_tier = Column(String(50), nullable=False)
    public_repos = Column(Integer, default=0, nullable=False)
    total_stars = Column(Integer, default=0, nullable=False)
    primary_language = Column(String(100), nullable=True)
    status = Column(String(50), default="success", nullable=False)  # success | failed | stale

    # Serialized snapshots
    score_breakdown_json = Column(Text, nullable=False)
    profile_data_json = Column(Text, nullable=False)
    stats_data_json = Column(Text, nullable=False)
    languages_json = Column(Text, nullable=False)
    repositories_json = Column(Text, nullable=False)
    checklist_json = Column(Text, nullable=False)
    ai_analysis_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)

    previous_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="analysis_runs")


class TrackedRecommendation(Base):
    __tablename__ = "tracked_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    analyzed_login = Column(String(100), index=True, nullable=False)
    rule_id = Column(String(100), index=True, nullable=False)
    category = Column(String(100), nullable=False)
    priority = Column(String(20), nullable=False)  # high | medium | low
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    impact = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=False)
    evidence = Column(Text, nullable=False)
    repo_name = Column(String(255), nullable=True)
    status = Column(String(50), default="open", nullable=False)  # open | resolved | dismissed | needs_verification
    first_detected_at = Column(DateTime, default=utcnow, nullable=False)
    last_detected_at = Column(DateTime, default=utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    recurrence_count = Column(Integer, default=0, nullable=False)

    user = relationship("User", back_populates="recommendations")
    events = relationship(
        "RecommendationEvent",
        back_populates="recommendation",
        cascade="all, delete-orphan",
        order_by="desc(RecommendationEvent.created_at)",
    )

    __table_args__ = (
        Index("idx_user_login_rule_repo", "user_id", "analyzed_login", "rule_id", "repo_name"),
    )


class RecommendationEvent(Base):
    __tablename__ = "recommendation_events"

    id = Column(Integer, primary_key=True, index=True)
    recommendation_id = Column(
        Integer,
        ForeignKey("tracked_recommendations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    previous_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    trigger_reason = Column(String(100), nullable=False)  # initial_detection | confirmed_present | no_longer_detected | reopened_recurring | user_dismissed
    evidence_snapshot = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    recommendation = relationship("TrackedRecommendation", back_populates="events")


class OAuthState(Base):
    __tablename__ = "oauth_states"

    id = Column(Integer, primary_key=True, index=True)
    state_token = Column(String(128), unique=True, index=True, nullable=False)
    user_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime, nullable=True)


class InternshipListing(Base):
    """Normalized internship vacancy ingested via official public employer board APIs."""
    __tablename__ = "internship_listings"

    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(String(50), nullable=False, index=True)  # greenhouse | lever | rss
    source_board_or_site = Column(String(100), nullable=False, index=True)  # e.g. "cloudflare", "spotify"
    source_job_id = Column(String(255), nullable=False, index=True)

    company_name = Column(String(255), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    description_html = Column(Text, nullable=False)
    description_text = Column(Text, nullable=False)
    location = Column(String(255), nullable=True, index=True)
    work_mode = Column(String(50), default="unspecified", nullable=False, index=True)  # remote | hybrid | onsite | unspecified
    is_internship = Column(Boolean, default=True, nullable=False, index=True)

    # Identifiable skills (JSON lists of strings)
    required_skills_json = Column(Text, default="[]", nullable=False)
    preferred_skills_json = Column(Text, default="[]", nullable=False)

    # Verified URLs
    original_url = Column(String(500), nullable=False)
    application_url = Column(String(500), nullable=True)

    # Structured metadata (Only populated when provided by upstream source)
    salary_currency = Column(String(10), nullable=True)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_interval = Column(String(20), nullable=True)  # year | month | hour
    duration = Column(String(100), nullable=True)
    deadline = Column(DateTime, nullable=True)

    # Timestamps & Freshness
    published_at = Column(DateTime, nullable=True)
    updated_at_source = Column(DateTime, nullable=True)
    first_seen_at = Column(DateTime, default=utcnow, nullable=False)
    last_seen_at = Column(DateTime, default=utcnow, nullable=False, index=True)
    last_verified_at = Column(DateTime, default=utcnow, nullable=False)
    is_stale = Column(Boolean, default=False, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    saved_by_users = relationship(
        "UserSavedInternship",
        back_populates="internship",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("source_type", "source_board_or_site", "source_job_id", name="uq_source_listing"),
        Index("idx_internship_active_stale", "is_internship", "is_active", "is_stale"),
    )


class UserSavedInternship(Base):
    """Tracks internships bookmarked or saved by an authenticated user."""
    __tablename__ = "user_saved_internships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    internship_id = Column(Integer, ForeignKey("internship_listings.id", ondelete="CASCADE"), nullable=False, index=True)
    notes = Column(Text, nullable=True)
    saved_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="saved_internships")
    internship = relationship("InternshipListing", back_populates="saved_by_users")

    __table_args__ = (
        UniqueConstraint("user_id", "internship_id", name="uq_user_saved_internship"),
    )
