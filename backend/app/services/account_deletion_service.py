import logging
from sqlalchemy.orm import Session
from app.db_models import (
    User,
    ConnectedGitHubAccount,
    AnalysisRun,
    TrackedRecommendation,
    RecommendationEvent,
    UserSavedInternship,
    EmailVerificationOTP,
    AccountDeletionOTP,
    OAuthState,
)
from app.services.otp_service import otp_rate_limiter

logger = logging.getLogger("devprofile_ai.account_deletion")


class AccountDeletionError(Exception):
    """Raised when permanent account deletion fails."""
    pass


def permanently_delete_user_account(db: Session, user: User) -> dict:
    """
    Permanently erases a user account and all user-owned records in an atomic transaction.
    Guarantees no orphaned records remain, while leaving shared internship catalog
    and public cached analyzed profiles intact.
    
    Returns a dictionary of deleted item counts.
    """
    user_id = user.id
    user_email = user.email

    logger.warning(
        f"Initiating permanent account deletion for User #{user_id} (email: {user_email})."
    )

    try:
        # 1. Clear self-referential foreign keys in AnalysisRun before deletion
        db.query(AnalysisRun).filter(AnalysisRun.user_id == user_id).update(
            {AnalysisRun.previous_run_id: None},
            synchronize_session=False,
        )

        # 2. Delete user's analysis runs
        deleted_runs = (
            db.query(AnalysisRun)
            .filter(AnalysisRun.user_id == user_id)
            .delete(synchronize_session=False)
        )

        # 3. Delete recommendation events and tracked recommendations
        rec_ids = [
            r[0]
            for r in db.query(TrackedRecommendation.id)
            .filter(TrackedRecommendation.user_id == user_id)
            .all()
        ]
        deleted_rec_events = 0
        if rec_ids:
            deleted_rec_events = (
                db.query(RecommendationEvent)
                .filter(RecommendationEvent.recommendation_id.in_(rec_ids))
                .delete(synchronize_session=False)
            )

        deleted_recs = (
            db.query(TrackedRecommendation)
            .filter(TrackedRecommendation.user_id == user_id)
            .delete(synchronize_session=False)
        )

        # 4. Delete saved internships (preserves the actual shared internship listings!)
        deleted_saved_internships = (
            db.query(UserSavedInternship)
            .filter(UserSavedInternship.user_id == user_id)
            .delete(synchronize_session=False)
        )

        # 5. Delete linked GitHub accounts and OAuth tokens
        deleted_github_conns = (
            db.query(ConnectedGitHubAccount)
            .filter(ConnectedGitHubAccount.user_id == user_id)
            .delete(synchronize_session=False)
        )

        # 6. Delete all verification and deletion OTPs
        deleted_verification_otps = (
            db.query(EmailVerificationOTP)
            .filter(EmailVerificationOTP.user_id == user_id)
            .delete(synchronize_session=False)
        )
        deleted_deletion_otps = (
            db.query(AccountDeletionOTP)
            .filter(AccountDeletionOTP.user_id == user_id)
            .delete(synchronize_session=False)
        )

        # 7. Delete orphaned OAuth states associated with this user
        deleted_oauth_states = (
            db.query(OAuthState)
            .filter(OAuthState.user_id == user_id)
            .delete(synchronize_session=False)
        )

        # 8. Delete the User record itself
        deleted_users = (
            db.query(User)
            .filter(User.id == user_id)
            .delete(synchronize_session=False)
        )

        # Commit the atomic transaction
        db.commit()

        # Clear rate-limiter cooldowns for this user
        if user_email:
            otp_rate_limiter.clear()

        logger.info(
            f"Successfully permanently deleted User #{user_id} and all related data: "
            f"runs={deleted_runs}, recs={deleted_recs}, saved_internships={deleted_saved_internships}, "
            f"github_conns={deleted_github_conns}, otps={deleted_verification_otps + deleted_deletion_otps}."
        )

        return {
            "user_id": user_id,
            "deleted_runs": deleted_runs,
            "deleted_recommendations": deleted_recs,
            "deleted_recommendation_events": deleted_rec_events,
            "deleted_saved_internships": deleted_saved_internships,
            "deleted_github_connections": deleted_github_conns,
            "deleted_otps": deleted_verification_otps + deleted_deletion_otps,
            "deleted_oauth_states": deleted_oauth_states,
            "deleted_users": deleted_users,
        }

    except Exception as exc:
        db.rollback()
        logger.error(
            f"Transaction failed during account deletion for User #{user_id}: {exc}",
            exc_info=True,
        )
        raise AccountDeletionError(
            f"Failed to permanently delete user account: {str(exc)}"
        ) from exc
