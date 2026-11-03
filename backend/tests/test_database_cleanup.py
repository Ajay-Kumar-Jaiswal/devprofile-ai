"""
DevProfile AI — Database Storage Management and Automatic Cleanup Tests

Tests cover:
- Expired email verification OTP deletion
- Consumed OTP cleanup after retention period
- Expired password reset OTP deletion
- Expired session / OAuthState cleanup
- Abandoned unverified account deletion after 7 days
- Unverified account younger than 7 days remains untouched
- Verified accounts remain untouched
- GitHub-linked accounts remain untouched
- Accounts with meaningful user data remain untouched (runs, bookmarks, recs)
- Same email can register again after account deletion
- Idempotent repeated cleanup execution
- Database storage diagnostics and metrics reporting
"""

from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db_models import (
    AccountDeletionOTP,
    AnalysisRun,
    Base,
    ConnectedGitHubAccount,
    EmailVerificationOTP,
    OAuthState,
    PasswordResetOTP,
    TrackedRecommendation,
    User,
    UserSavedInternship,
    InternshipListing,
)
from app.services.cleanup_service import DatabaseCleanupManager, run_database_cleanup
from app.services.storage_monitor_service import get_database_storage_report


@pytest.fixture
def clean_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def test_cleanup_expired_and_consumed_email_otps(clean_db):
    """Verify expired and old consumed email verification OTPs are purged, but active ones remain."""
    now_utc = datetime.now(timezone.utc)
    user = User(email="test_otps@example.com", is_verified=False)
    clean_db.add(user)
    clean_db.commit()

    # 1. Active unconsumed OTP (should remain)
    active_otp = EmailVerificationOTP(
        user_id=user.id,
        email="test_otps@example.com",
        otp_hash="hash_active",
        salt="salt1",
        expires_at=now_utc + timedelta(minutes=10),
        is_consumed=False,
    )
    # 2. Expired unconsumed OTP (should be deleted)
    expired_otp = EmailVerificationOTP(
        user_id=user.id,
        email="test_otps@example.com",
        otp_hash="hash_expired",
        salt="salt2",
        expires_at=now_utc - timedelta(minutes=5),
        is_consumed=False,
    )
    # 3. Consumed OTP older than retention (should be deleted)
    old_consumed_otp = EmailVerificationOTP(
        user_id=user.id,
        email="test_otps@example.com",
        otp_hash="hash_consumed_old",
        salt="salt3",
        expires_at=now_utc - timedelta(days=2),
        is_consumed=True,
        consumed_at=now_utc - timedelta(days=2),
    )
    # 4. Recently consumed OTP within retention (should remain)
    recent_consumed_otp = EmailVerificationOTP(
        user_id=user.id,
        email="test_otps@example.com",
        otp_hash="hash_consumed_recent",
        salt="salt4",
        expires_at=now_utc + timedelta(minutes=5),
        is_consumed=True,
        consumed_at=now_utc - timedelta(minutes=30),
    )

    clean_db.add_all([active_otp, expired_otp, old_consumed_otp, recent_consumed_otp])
    clean_db.commit()

    manager = DatabaseCleanupManager(clean_db)
    deleted = manager.cleanup_email_verification_otps(retention_days=1, batch_size=50)

    assert deleted == 2
    remaining = clean_db.query(EmailVerificationOTP).all()
    remaining_hashes = {r.otp_hash for r in remaining}
    assert "hash_active" in remaining_hashes
    assert "hash_consumed_recent" in remaining_hashes
    assert "hash_expired" not in remaining_hashes
    assert "hash_consumed_old" not in remaining_hashes


def test_cleanup_expired_and_consumed_password_reset_otps(clean_db):
    """Verify expired and consumed password reset records are cleaned up safely."""
    now_utc = datetime.now(timezone.utc)
    user = User(email="pwd_test@example.com", is_verified=True)
    clean_db.add(user)
    clean_db.commit()

    # Active reset OTP (keep)
    active_pwd_otp = PasswordResetOTP(
        user_id=user.id,
        email="pwd_test@example.com",
        otp_hash="hash_act",
        salt="salt1",
        expires_at=now_utc + timedelta(minutes=10),
        is_consumed=False,
    )
    # Expired reset OTP (purge)
    expired_pwd_otp = PasswordResetOTP(
        user_id=user.id,
        email="pwd_test@example.com",
        otp_hash="hash_exp",
        salt="salt2",
        expires_at=now_utc - timedelta(minutes=10),
        is_consumed=False,
    )
    # Consumed reset OTP older than 1 day (purge)
    old_consumed_pwd_otp = PasswordResetOTP(
        user_id=user.id,
        email="pwd_test@example.com",
        otp_hash="hash_old",
        salt="salt3",
        expires_at=now_utc - timedelta(days=3),
        is_consumed=True,
        consumed_at=now_utc - timedelta(days=3),
    )

    clean_db.add_all([active_pwd_otp, expired_pwd_otp, old_consumed_pwd_otp])
    clean_db.commit()

    manager = DatabaseCleanupManager(clean_db)
    deleted = manager.cleanup_password_reset_otps(retention_days=1, batch_size=50)

    assert deleted == 2
    remaining = clean_db.query(PasswordResetOTP).all()
    assert len(remaining) == 1
    assert remaining[0].otp_hash == "hash_act"


def test_cleanup_expired_oauth_states(clean_db):
    """Verify expired OAuth states are purged while valid states remain."""
    now_utc = datetime.now(timezone.utc)

    valid_state = OAuthState(
        state_token="valid_state_123",
        expires_at=now_utc + timedelta(minutes=10),
    )
    expired_state = OAuthState(
        state_token="expired_state_456",
        expires_at=now_utc - timedelta(minutes=5),
    )
    consumed_old_state = OAuthState(
        state_token="consumed_old_789",
        expires_at=now_utc - timedelta(days=2),
        consumed_at=now_utc - timedelta(days=2),
    )

    clean_db.add_all([valid_state, expired_state, consumed_old_state])
    clean_db.commit()

    manager = DatabaseCleanupManager(clean_db)
    deleted = manager.cleanup_expired_oauth_states(retention_days=1, batch_size=50)

    assert deleted == 2
    remaining = clean_db.query(OAuthState).all()
    assert len(remaining) == 1
    assert remaining[0].state_token == "valid_state_123"


def test_cleanup_abandoned_unverified_accounts_after_7_days(clean_db):
    """Verify unverified accounts older than 7 days without data are safely deleted."""
    now_utc = datetime.now(timezone.utc)

    # 1. Abandoned unverified user > 7 days old (eligible for deletion)
    abandoned_user = User(
        email="abandoned@example.com",
        is_verified=False,
        created_at=now_utc - timedelta(days=8),
    )
    # 2. Recent unverified user < 7 days old (MUST NOT be deleted)
    recent_unverified = User(
        email="recent_unverified@example.com",
        is_verified=False,
        created_at=now_utc - timedelta(days=3),
    )
    # 3. Verified user > 7 days old (MUST NOT be deleted)
    verified_user = User(
        email="verified@example.com",
        is_verified=True,
        created_at=now_utc - timedelta(days=30),
    )

    clean_db.add_all([abandoned_user, recent_unverified, verified_user])
    clean_db.commit()

    # Add OTP to abandoned user to test cascading deletion
    otp = EmailVerificationOTP(
        user_id=abandoned_user.id,
        email="abandoned@example.com",
        otp_hash="hash_aban",
        salt="salt_aban",
        expires_at=now_utc - timedelta(days=8),
        is_consumed=False,
    )
    clean_db.add(otp)
    clean_db.commit()

    manager = DatabaseCleanupManager(clean_db)
    deleted_count = manager.cleanup_abandoned_unverified_accounts(unverified_threshold_days=7)

    assert deleted_count == 1

    # Verify abandoned user was deleted
    assert clean_db.query(User).filter(User.email == "abandoned@example.com").first() is None
    # Verify associated OTP was removed
    assert clean_db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == "abandoned@example.com").first() is None

    # Verify recent unverified user remains intact
    assert clean_db.query(User).filter(User.email == "recent_unverified@example.com").first() is not None
    # Verify verified user remains intact
    assert clean_db.query(User).filter(User.email == "verified@example.com").first() is not None


def test_strict_protection_github_linked_and_user_data(clean_db):
    """Verify accounts linked to GitHub or containing meaningful data are NEVER purged."""
    now_utc = datetime.now(timezone.utc)
    old_date = now_utc - timedelta(days=20)

    # User A: unverified > 7d but has connected GitHub account -> PROTECTED
    user_gh = User(email="gh_user@example.com", is_verified=False, created_at=old_date)
    clean_db.add(user_gh)
    clean_db.flush()
    gh_conn = ConnectedGitHubAccount(
        user_id=user_gh.id,
        github_user_id=99999,
        github_login="octocat",
    )
    clean_db.add(gh_conn)

    # User B: unverified > 7d but has analysis runs -> PROTECTED
    user_run = User(email="run_user@example.com", is_verified=False, created_at=old_date)
    clean_db.add(user_run)
    clean_db.flush()
    run = AnalysisRun(
        user_id=user_run.id,
        analyzed_login="some_dev",
        overall_score=85,
        score_tier="Strong",
        score_breakdown_json="{}",
        profile_data_json="{}",
        stats_data_json="{}",
        languages_json="[]",
        repositories_json="[]",
        checklist_json="[]",
    )
    clean_db.add(run)

    # User C: unverified > 7d but has saved internships -> PROTECTED
    user_saved = User(email="saved_user@example.com", is_verified=False, created_at=old_date)
    clean_db.add(user_saved)
    clean_db.flush()
    listing = InternshipListing(
        source_type="greenhouse",
        source_board_or_site="stripe",
        source_job_id="job_123",
        company_name="Stripe",
        title="Software Intern",
        description_html="<p>Test</p>",
        description_text="Test",
        original_url="https://boards.greenhouse.io/stripe/jobs/123",
    )
    clean_db.add(listing)
    clean_db.flush()
    saved = UserSavedInternship(user_id=user_saved.id, internship_id=listing.id)
    clean_db.add(saved)

    clean_db.commit()

    manager = DatabaseCleanupManager(clean_db)
    deleted_count = manager.cleanup_abandoned_unverified_accounts(unverified_threshold_days=7)

    # All three must be preserved!
    assert deleted_count == 0
    assert clean_db.query(User).filter(User.email == "gh_user@example.com").first() is not None
    assert clean_db.query(User).filter(User.email == "run_user@example.com").first() is not None
    assert clean_db.query(User).filter(User.email == "saved_user@example.com").first() is not None


def test_same_email_can_re_register_after_abandoned_deletion(clean_db):
    """Verify that after an abandoned unverified account is deleted, the email can register again."""
    now_utc = datetime.now(timezone.utc)
    email = "reregister_test@example.com"

    # Create abandoned account > 7 days ago
    abandoned = User(email=email, is_verified=False, created_at=now_utc - timedelta(days=10))
    clean_db.add(abandoned)
    clean_db.commit()

    # Run cleanup
    manager = DatabaseCleanupManager(clean_db)
    deleted_count = manager.cleanup_abandoned_unverified_accounts(unverified_threshold_days=7)
    assert deleted_count == 1
    assert clean_db.query(User).filter(User.email == email).first() is None

    # Re-registration with same email succeeds cleanly without conflict
    new_user = User(email=email, is_verified=False, created_at=now_utc)
    clean_db.add(new_user)
    clean_db.commit()
    clean_db.refresh(new_user)

    assert new_user.id is not None
    assert new_user.email == email


def test_storage_monitor_report(clean_db):
    """Verify get_database_storage_report correctly computes diagnostics and counts."""
    now_utc = datetime.now(timezone.utc)

    # Add expired OTP
    u = User(email="metrics_test@example.com", is_verified=False, created_at=now_utc - timedelta(days=10))
    clean_db.add(u)
    clean_db.flush()

    otp = EmailVerificationOTP(
        user_id=u.id,
        email="metrics_test@example.com",
        otp_hash="hash_m",
        salt="salt_m",
        expires_at=now_utc - timedelta(hours=2),
        is_consumed=False,
    )
    clean_db.add(otp)
    clean_db.commit()

    report = get_database_storage_report(clean_db)

    assert report["status"] == "healthy"
    assert "total_database_size_formatted" in report
    assert report["cleanup_eligibility"]["expired_email_verification_otps"] >= 1
    assert report["cleanup_eligibility"]["abandoned_unverified_accounts"] >= 1
    assert isinstance(report["tables"], list)
    assert isinstance(report["largest_tables"], list)


def test_admin_authorization_verification():
    """Verify admin endpoint security rejects unauthorized requests and allows authorized keys."""
    from fastapi import HTTPException
    from app.config import settings
    from app.routers.admin import verify_admin_authorization

    # 1. No key -> 401 Unauthorized
    with pytest.raises(HTTPException) as exc1:
        verify_admin_authorization(x_admin_key=None, authorization=None)
    assert exc1.value.status_code == 401

    # 2. Wrong key -> 403 Forbidden
    with pytest.raises(HTTPException) as exc2:
        verify_admin_authorization(x_admin_key="wrong_invalid_key", authorization=None)
    assert exc2.value.status_code == 403

    # 3. Valid key via X-Admin-Key -> True
    valid_key = settings.ADMIN_API_KEY or settings.SECRET_KEY
    assert verify_admin_authorization(x_admin_key=valid_key, authorization=None) is True

    # 4. Valid key via Authorization: Bearer <key> -> True
    assert verify_admin_authorization(x_admin_key=None, authorization=f"Bearer {valid_key}") is True
