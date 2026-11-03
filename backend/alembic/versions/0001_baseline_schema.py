"""Baseline initial schema

Revision ID: 0001_baseline_schema
Revises: 
Create Date: 2026-11-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op, context
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001_baseline_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    is_offline = context.is_offline_mode()
    if is_offline:
        existing_tables = set()
    else:
        bind = op.get_bind()
        inspector = sa.inspect(bind)
        existing_tables = set(inspector.get_table_names())

    # 1. users
    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("hashed_password", sa.String(length=255), nullable=True),
            sa.Column("full_name", sa.String(length=255), nullable=True),
            sa.Column("default_profile_username", sa.String(length=100), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_users_id", "users", ["id"])
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. connected_github_accounts
    if "connected_github_accounts" not in existing_tables:
        op.create_table(
            "connected_github_accounts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
            sa.Column("github_user_id", sa.Integer(), unique=True, nullable=False),
            sa.Column("github_login", sa.String(length=100), nullable=False),
            sa.Column("avatar_url", sa.String(length=500), nullable=True),
            sa.Column("html_url", sa.String(length=500), nullable=True),
            sa.Column("connected_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_connected_github_accounts_id", "connected_github_accounts", ["id"])
        op.create_index("ix_connected_github_accounts_github_user_id", "connected_github_accounts", ["github_user_id"], unique=True)
        op.create_index("ix_connected_github_accounts_github_login", "connected_github_accounts", ["github_login"])

    # 3. analyzed_profiles
    if "analyzed_profiles" not in existing_tables:
        op.create_table(
            "analyzed_profiles",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("github_user_id", sa.Integer(), nullable=True),
            sa.Column("github_login", sa.String(length=100), nullable=False),
            sa.Column("display_name", sa.String(length=255), nullable=True),
            sa.Column("avatar_url", sa.String(length=500), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_analyzed_profiles_id", "analyzed_profiles", ["id"])
        op.create_index("ix_analyzed_profiles_github_login", "analyzed_profiles", ["github_login"])
        op.create_index("ix_analyzed_profiles_github_user_id", "analyzed_profiles", ["github_user_id"])

    # 4. analysis_runs
    if "analysis_runs" not in existing_tables:
        op.create_table(
            "analysis_runs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("analyzed_login", sa.String(length=100), nullable=False),
            sa.Column("is_demo_data", sa.Boolean(), server_default=sa.text("false"), nullable=False),
            sa.Column("overall_score", sa.Integer(), nullable=False),
            sa.Column("score_tier", sa.String(length=50), nullable=False),
            sa.Column("public_repos", sa.Integer(), server_default=sa.text("0"), nullable=False),
            sa.Column("total_stars", sa.Integer(), server_default=sa.text("0"), nullable=False),
            sa.Column("primary_language", sa.String(length=100), nullable=True),
            sa.Column("status", sa.String(length=50), server_default="completed", nullable=False),
            sa.Column("score_breakdown_json", sa.Text(), server_default="{}", nullable=False),
            sa.Column("profile_data_json", sa.Text(), server_default="{}", nullable=False),
            sa.Column("stats_data_json", sa.Text(), server_default="{}", nullable=False),
            sa.Column("languages_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("repositories_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("checklist_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("ai_analysis_json", sa.Text(), nullable=True),
            sa.Column("error_message", sa.String(length=500), nullable=True),
            sa.Column("previous_run_id", sa.Integer(), sa.ForeignKey("analysis_runs.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_analysis_runs_id", "analysis_runs", ["id"])
        op.create_index("ix_analysis_runs_user_id", "analysis_runs", ["user_id"])
        op.create_index("ix_analysis_runs_analyzed_login", "analysis_runs", ["analyzed_login"])

    # 5. tracked_recommendations
    if "tracked_recommendations" not in existing_tables:
        op.create_table(
            "tracked_recommendations",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("analyzed_login", sa.String(length=100), nullable=False),
            sa.Column("rule_id", sa.String(length=100), nullable=False),
            sa.Column("category", sa.String(length=100), nullable=False),
            sa.Column("priority", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("impact", sa.Text(), nullable=False),
            sa.Column("suggested_action", sa.Text(), nullable=False),
            sa.Column("evidence", sa.Text(), nullable=True),
            sa.Column("repo_name", sa.String(length=255), nullable=True),
            sa.Column("status", sa.String(length=50), server_default="active", nullable=False),
            sa.Column("first_detected_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("last_detected_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("recurrence_count", sa.Integer(), server_default=sa.text("1"), nullable=False),
        )
        op.create_index("ix_tracked_recommendations_id", "tracked_recommendations", ["id"])
        op.create_index("ix_tracked_recommendations_user_id", "tracked_recommendations", ["user_id"])
        op.create_index("ix_tracked_recommendations_analyzed_login", "tracked_recommendations", ["analyzed_login"])

    # 6. recommendation_events
    if "recommendation_events" not in existing_tables:
        op.create_table(
            "recommendation_events",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("recommendation_id", sa.Integer(), sa.ForeignKey("tracked_recommendations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("previous_status", sa.String(length=50), nullable=True),
            sa.Column("new_status", sa.String(length=50), nullable=False),
            sa.Column("trigger_reason", sa.String(length=255), nullable=False),
            sa.Column("evidence_snapshot", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_recommendation_events_id", "recommendation_events", ["id"])
        op.create_index("ix_recommendation_events_recommendation_id", "recommendation_events", ["recommendation_id"])

    # 7. oauth_states
    if "oauth_states" not in existing_tables:
        op.create_table(
            "oauth_states",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("state_token", sa.String(length=128), unique=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_oauth_states_id", "oauth_states", ["id"])
        op.create_index("ix_oauth_states_state_token", "oauth_states", ["state_token"], unique=True)

    # 8. internship_listings
    if "internship_listings" not in existing_tables:
        op.create_table(
            "internship_listings",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("source_type", sa.String(length=50), nullable=False),
            sa.Column("source_board_or_site", sa.String(length=100), nullable=False),
            sa.Column("source_job_id", sa.String(length=255), nullable=False),
            sa.Column("company_name", sa.String(length=255), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description_html", sa.Text(), nullable=False),
            sa.Column("description_text", sa.Text(), nullable=False),
            sa.Column("location", sa.String(length=255), nullable=True),
            sa.Column("work_mode", sa.String(length=50), server_default="unspecified", nullable=False),
            sa.Column("is_internship", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("required_skills_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("preferred_skills_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("original_url", sa.String(length=500), nullable=False),
            sa.Column("application_url", sa.String(length=500), nullable=True),
            sa.Column("salary_currency", sa.String(length=10), nullable=True),
            sa.Column("salary_min", sa.Float(), nullable=True),
            sa.Column("salary_max", sa.Float(), nullable=True),
            sa.Column("salary_interval", sa.String(length=20), nullable=True),
            sa.Column("duration", sa.String(length=100), nullable=True),
            sa.Column("deadline", sa.DateTime(), nullable=True),
            sa.Column("published_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at_source", sa.DateTime(), nullable=True),
            sa.Column("first_seen_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("last_seen_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("last_verified_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("is_stale", sa.Boolean(), server_default=sa.text("false"), nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.UniqueConstraint("source_type", "source_board_or_site", "source_job_id", name="uq_source_listing"),
        )
        op.create_index("ix_internship_listings_id", "internship_listings", ["id"])
        op.create_index("ix_internship_listings_source_type", "internship_listings", ["source_type"])
        op.create_index("ix_internship_listings_source_board_or_site", "internship_listings", ["source_board_or_site"])
        op.create_index("ix_internship_listings_source_job_id", "internship_listings", ["source_job_id"])
        op.create_index("ix_internship_listings_company_name", "internship_listings", ["company_name"])
        op.create_index("ix_internship_listings_title", "internship_listings", ["title"])
        op.create_index("ix_internship_listings_location", "internship_listings", ["location"])
        op.create_index("ix_internship_listings_work_mode", "internship_listings", ["work_mode"])
        op.create_index("ix_internship_listings_is_internship", "internship_listings", ["is_internship"])
        op.create_index("ix_internship_listings_last_seen_at", "internship_listings", ["last_seen_at"])
        op.create_index("ix_internship_listings_is_stale", "internship_listings", ["is_stale"])
        op.create_index("ix_internship_listings_is_active", "internship_listings", ["is_active"])
        op.create_index("idx_internship_active_stale", "internship_listings", ["is_internship", "is_active", "is_stale"])

    # 9. user_saved_internships
    if "user_saved_internships" not in existing_tables:
        op.create_table(
            "user_saved_internships",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("internship_id", sa.Integer(), sa.ForeignKey("internship_listings.id", ondelete="CASCADE"), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("saved_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("user_id", "internship_id", name="uq_user_saved_internship"),
        )
        op.create_index("ix_user_saved_internships_id", "user_saved_internships", ["id"])
        op.create_index("ix_user_saved_internships_user_id", "user_saved_internships", ["user_id"])
        op.create_index("ix_user_saved_internships_internship_id", "user_saved_internships", ["internship_id"])


def downgrade() -> None:
    is_offline = context.is_offline_mode()
    if is_offline:
        existing_tables = {
            "user_saved_internships", "internship_listings", "oauth_states",
            "recommendation_events", "tracked_recommendations", "analysis_runs",
            "analyzed_profiles", "connected_github_accounts", "users"
        }
    else:
        bind = op.get_bind()
        inspector = sa.inspect(bind)
        existing_tables = set(inspector.get_table_names())

    if "user_saved_internships" in existing_tables:
        op.drop_table("user_saved_internships")
    if "internship_listings" in existing_tables:
        op.drop_table("internship_listings")
    if "oauth_states" in existing_tables:
        op.drop_table("oauth_states")
    if "recommendation_events" in existing_tables:
        op.drop_table("recommendation_events")
    if "tracked_recommendations" in existing_tables:
        op.drop_table("tracked_recommendations")
    if "analysis_runs" in existing_tables:
        op.drop_table("analysis_runs")
    if "analyzed_profiles" in existing_tables:
        op.drop_table("analyzed_profiles")
    if "connected_github_accounts" in existing_tables:
        op.drop_table("connected_github_accounts")
    if "users" in existing_tables:
        op.drop_table("users")
