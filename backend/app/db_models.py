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
