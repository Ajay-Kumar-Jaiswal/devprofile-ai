"""Add password reset OTP table and cleanup indexes

Revision ID: 0003_add_password_reset_and_cleanup
Revises: 0002_add_verification_and_terms
Create Date: 2026-11-04 01:45:00.000000

"""
from typing import Sequence, Union

from alembic import op, context
import sqlalchemy as sa


revision: str = '0003_add_password_reset_and_cleanup'
down_revision: Union[str, None] = '0002_add_verification_and_terms'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    offline = context.is_offline_mode()
    if offline:
        existing_tables = set()
        dialect = "postgresql"
    else:
        bind = op.get_bind()
        dialect = bind.dialect.name
        inspector = sa.inspect(bind)
        existing_tables = set(inspector.get_table_names())

    # Create password_reset_otps table
    if offline or "password_reset_otps" not in existing_tables:
        op.create_table(
            "password_reset_otps",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("otp_hash", sa.String(length=255), nullable=False),
            sa.Column("salt", sa.String(length=64), nullable=False),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("max_attempts", sa.Integer(), nullable=False, server_default=sa.text("5")),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("is_consumed", sa.Boolean(), nullable=False, server_default=sa.text("0" if dialect == "sqlite" else "false")),
            sa.Column("reset_token", sa.String(length=128), nullable=True),
            sa.Column("reset_token_expires_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("consumed_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_password_reset_otps_id", "password_reset_otps", ["id"])
        op.create_index("ix_password_reset_otps_user_id", "password_reset_otps", ["user_id"])
        op.create_index("ix_password_reset_otps_email", "password_reset_otps", ["email"])
        op.create_index("ix_password_reset_otps_expires_at", "password_reset_otps", ["expires_at"])
        op.create_index("ix_password_reset_otps_is_consumed", "password_reset_otps", ["is_consumed"])
        op.create_index("ix_password_reset_otps_reset_token", "password_reset_otps", ["reset_token"])
        op.create_index("ix_password_reset_otps_reset_token_expires_at", "password_reset_otps", ["reset_token_expires_at"])
        op.create_index("idx_pwd_reset_otp_email", "password_reset_otps", ["email", "is_consumed", "expires_at"])
        op.create_index("idx_pwd_reset_token", "password_reset_otps", ["reset_token", "is_consumed", "reset_token_expires_at"])


def downgrade() -> None:
    op.drop_table("password_reset_otps")
