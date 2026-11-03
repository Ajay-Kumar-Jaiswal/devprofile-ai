"""Add verification and terms acceptance schema

Revision ID: 0002_add_verification_and_terms
Revises: 0001_baseline_schema
Create Date: 2026-11-04 00:05:00.000000

"""
from typing import Sequence, Union

from alembic import op, context
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_add_verification_and_terms'
down_revision: Union[str, None] = '0001_baseline_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    is_offline = context.is_offline_mode()
    if is_offline:
        existing_tables = {"users", "oauth_states"}
        user_columns = set()
        oauth_columns = set()
    else:
        bind = op.get_bind()
        inspector = sa.inspect(bind)
        existing_tables = set(inspector.get_table_names())
        user_columns = {c["name"] for c in inspector.get_columns("users")} if "users" in existing_tables else set()
        oauth_columns = {c["name"] for c in inspector.get_columns("oauth_states")} if "oauth_states" in existing_tables else set()

    # 1. Update `users` table columns
    if "users" in existing_tables:
        with op.batch_alter_table("users", schema=None) as batch_op:
            if "is_verified" not in user_columns:
                batch_op.add_column(
                    sa.Column("is_verified", sa.Boolean(), server_default=sa.text("true"), nullable=False)
                )
            if "terms_accepted" not in user_columns:
                batch_op.add_column(
                    sa.Column("terms_accepted", sa.Boolean(), server_default=sa.text("false"), nullable=False)
                )
            if "terms_accepted_version" not in user_columns:
                batch_op.add_column(
                    sa.Column("terms_accepted_version", sa.String(length=50), nullable=True)
                )
            if "terms_accepted_at" not in user_columns:
                batch_op.add_column(
                    sa.Column("terms_accepted_at", sa.DateTime(), nullable=True)
                )

    # 2. Update `oauth_states` table columns
    if "oauth_states" in existing_tables:
        if "consumed_at" not in oauth_columns:
            with op.batch_alter_table("oauth_states", schema=None) as batch_op:
                batch_op.add_column(
                    sa.Column("consumed_at", sa.DateTime(), nullable=True)
                )

    # 3. Create `email_verification_otps` table if missing
    if "email_verification_otps" not in existing_tables:
        op.create_table(
            "email_verification_otps",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("otp_hash", sa.String(length=255), nullable=False),
            sa.Column("salt", sa.String(length=64), nullable=False),
            sa.Column("attempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
            sa.Column("max_attempts", sa.Integer(), server_default=sa.text("5"), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("is_consumed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("consumed_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_email_verification_otps_id", "email_verification_otps", ["id"])
        op.create_index("ix_email_verification_otps_user_id", "email_verification_otps", ["user_id"])
        op.create_index("ix_email_verification_otps_email", "email_verification_otps", ["email"])
        op.create_index("ix_email_verification_otps_expires_at", "email_verification_otps", ["expires_at"])
        op.create_index("ix_email_verification_otps_is_consumed", "email_verification_otps", ["is_consumed"])
        op.create_index("idx_otp_email_active", "email_verification_otps", ["email", "is_consumed", "expires_at"])

    # 4. Create `account_deletion_otps` table if missing
    if "account_deletion_otps" not in existing_tables:
        op.create_table(
            "account_deletion_otps",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("otp_hash", sa.String(length=255), nullable=False),
            sa.Column("salt", sa.String(length=64), nullable=False),
            sa.Column("attempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
            sa.Column("max_attempts", sa.Integer(), server_default=sa.text("5"), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("is_consumed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("consumed_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_account_deletion_otps_id", "account_deletion_otps", ["id"])
        op.create_index("ix_account_deletion_otps_user_id", "account_deletion_otps", ["user_id"])
        op.create_index("ix_account_deletion_otps_email", "account_deletion_otps", ["email"])
        op.create_index("ix_account_deletion_otps_expires_at", "account_deletion_otps", ["expires_at"])
        op.create_index("ix_account_deletion_otps_is_consumed", "account_deletion_otps", ["is_consumed"])
        op.create_index("idx_deletion_otp_user_active", "account_deletion_otps", ["user_id", "is_consumed", "expires_at"])


def downgrade() -> None:
    is_offline = context.is_offline_mode()
    if is_offline:
        existing_tables = {"account_deletion_otps", "email_verification_otps", "oauth_states", "users"}
        user_columns = {"terms_accepted_at", "terms_accepted_version", "terms_accepted", "is_verified"}
        oauth_columns = {"consumed_at"}
    else:
        bind = op.get_bind()
        inspector = sa.inspect(bind)
        existing_tables = set(inspector.get_table_names())
        user_columns = {c["name"] for c in inspector.get_columns("users")} if "users" in existing_tables else set()
        oauth_columns = {c["name"] for c in inspector.get_columns("oauth_states")} if "oauth_states" in existing_tables else set()

    # 1. Drop OTP tables
    if "account_deletion_otps" in existing_tables:
        op.drop_table("account_deletion_otps")

    if "email_verification_otps" in existing_tables:
        op.drop_table("email_verification_otps")

    # 2. Revert oauth_states column
    if "oauth_states" in existing_tables:
        if "consumed_at" in oauth_columns:
            with op.batch_alter_table("oauth_states", schema=None) as batch_op:
                batch_op.drop_column("consumed_at")

    # 3. Revert users table columns
    if "users" in existing_tables:
        with op.batch_alter_table("users", schema=None) as batch_op:
            if "terms_accepted_at" in user_columns:
                batch_op.drop_column("terms_accepted_at")
            if "terms_accepted_version" in user_columns:
                batch_op.drop_column("terms_accepted_version")
            if "terms_accepted" in user_columns:
                batch_op.drop_column("terms_accepted")
            if "is_verified" in user_columns:
                batch_op.drop_column("is_verified")
