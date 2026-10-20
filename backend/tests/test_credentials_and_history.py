import json
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base
from app.db_models import User, ConnectedGitHubAccount, AnalysisRun
from app.services.auth_service import hash_password, verify_password, create_access_token
from tests.conftest import TestSession, TEST_ENGINE

client = TestClient(app)


@pytest.fixture
def oauth_user_with_github():
    """Creates a user authenticated via GitHub OAuth with a verified email but no password."""
    db = TestSession()
    try:
        user = User(
            email="oauthuser@example.com",
            hashed_password=None,
            full_name="OAuth Developer",
            is_active=True,
            default_profile_username="octocat",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        github_acct = ConnectedGitHubAccount(
            user_id=user.id,
            github_user_id=1234567,
            github_login="octocat",
            avatar_url="https://github.com/images/error/octocat_happy.gif",
            html_url="https://github.com/octocat",
        )
        db.add(github_acct)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


@pytest.fixture
def oauth_user_no_email():
    """Creates a user authenticated via GitHub OAuth without any initial email or password."""
    db = TestSession()
    try:
        user = User(
            email=None,
            hashed_password=None,
            full_name="Private Email Developer",
            is_active=True,
            default_profile_username="privatedev",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        github_acct = ConnectedGitHubAccount(
            user_id=user.id,
            github_user_id=7654321,
            github_login="privatedev",
            avatar_url="https://github.com/images/error/octocat_happy.gif",
            html_url="https://github.com/privatedev",
        )
        db.add(github_acct)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


@pytest.fixture
def password_user():
    """Creates an account with existing email and password credentials."""
    db = TestSession()
    try:
        user = User(
            email="regularuser@example.com",
            hashed_password=hash_password("CurrentPassword123!"),
            full_name="Regular Developer",
            is_active=True,
            default_profile_username="regulardev",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def auth_headers(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"Authorization": f"Bearer {token}"}


class TestCredentialStateAndSetup:
    # 1. GitHub-only account sees Set Up Email & Password (authoritative backend state)
    def test_github_only_account_reports_no_password(self, oauth_user_with_github):
        headers = auth_headers(oauth_user_with_github)
        me_resp = client.get("/api/auth/me", headers=headers)
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["has_password"] is False
        assert data["connected_github"] is not None
        assert data["connected_github"]["github_login"] == "octocat"

    # 2. Email/password account sees Change Password (authoritative backend state)
    def test_email_password_account_reports_has_password(self, password_user):
        headers = auth_headers(password_user)
        me_resp = client.get("/api/auth/me", headers=headers)
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["has_password"] is True

    # 4. Credential setup succeeds for an eligible account (attaching to existing user)
    def test_setup_credentials_success_for_account_without_email(self, oauth_user_no_email):
        headers = auth_headers(oauth_user_no_email)
        setup_resp = client.post(
            "/api/auth/setup-credentials",
            json={
                "email": "attached_dev@example.com",
                "password": "SuperSecurePassword123!",
                "confirm_password": "SuperSecurePassword123!"
            },
            headers=headers,
        )
        assert setup_resp.status_code == 200
        data = setup_resp.json()
        assert data["user"]["has_password"] is True
        assert data["user"]["email"] == "attached_dev@example.com"
        assert data["user"]["id"] == oauth_user_no_email.id

    def test_setup_credentials_success_with_existing_account_email(self, oauth_user_with_github):
        headers = auth_headers(oauth_user_with_github)
        setup_resp = client.post(
            "/api/auth/setup-credentials",
            json={
                "email": "oauthuser@example.com",
                "password": "SuperSecurePassword123!",
                "confirm_password": "SuperSecurePassword123!"
            },
            headers=headers,
        )
        assert setup_resp.status_code == 200
        data = setup_resp.json()
        assert data["user"]["has_password"] is True
        assert data["user"]["email"] == "oauthuser@example.com"

    # 5. Duplicate email, invalid credentials, and email overwriting rejected safely
    def test_setup_credentials_requires_auth(self):
        resp = client.post("/api/auth/setup-credentials", json={
            "email": "test@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!"
        })
        assert resp.status_code == 401

    def test_setup_credentials_rejects_short_password(self, oauth_user_with_github):
        headers = auth_headers(oauth_user_with_github)
        resp = client.post(
            "/api/auth/setup-credentials",
            json={
                "email": "oauthuser@example.com",
                "password": "short",
                "confirm_password": "short"
            },
            headers=headers,
        )
        assert resp.status_code == 422

    def test_setup_credentials_rejects_mismatched_passwords(self, oauth_user_with_github):
        headers = auth_headers(oauth_user_with_github)
        resp = client.post(
            "/api/auth/setup-credentials",
            json={
                "email": "oauthuser@example.com",
                "password": "Password123!",
                "confirm_password": "DifferentPassword123!"
            },
            headers=headers,
        )
        assert resp.status_code == 400
        assert "do not match" in resp.json()["detail"]

    def test_setup_credentials_rejects_silently_overwriting_existing_email(self, oauth_user_with_github):
        headers = auth_headers(oauth_user_with_github)
        resp = client.post(
            "/api/auth/setup-credentials",
            json={
                "email": "completely_different@example.com",
                "password": "Password123!",
                "confirm_password": "Password123!"
            },
            headers=headers,
        )
        assert resp.status_code == 400
        assert "registered with email" in resp.json()["detail"]

    def test_setup_credentials_rejects_duplicate_email(self, oauth_user_no_email):
        db = TestSession()
        try:
            existing = User(
                email="taken@example.com",
                hashed_password=hash_password("Password123!"),
                is_active=True
            )
            db.add(existing)
            db.commit()
        finally:
            db.close()

        headers = auth_headers(oauth_user_no_email)
        resp = client.post(
            "/api/auth/setup-credentials",
            json={
                "email": "taken@example.com",
                "password": "Password123!",
                "confirm_password": "Password123!"
            },
            headers=headers,
        )
        assert resp.status_code == 409
        assert "already associated with another account" in resp.json()["detail"]

    # 6. Successful credential setup updates the authenticated account state
    def test_setup_credentials_updates_account_state_and_enables_disconnect(self, oauth_user_with_github):
        headers = auth_headers(oauth_user_with_github)

        # Before setting credentials, attempting to disconnect GitHub must fail
        disc_fail = client.post("/api/auth/github/disconnect", headers=headers)
        assert disc_fail.status_code == 400
        assert "set an email and password first" in disc_fail.json()["detail"]

        # Setup credentials
        setup_resp = client.post(
            "/api/auth/setup-credentials",
            json={
                "email": "oauthuser@example.com",
                "password": "NewSecretPassword123!",
                "confirm_password": "NewSecretPassword123!"
            },
            headers=headers,
        )
        assert setup_resp.status_code == 200

        # Account state in /me now reports has_password is True
        me_after = client.get("/api/auth/me", headers=headers)
        assert me_after.status_code == 200
        assert me_after.json()["has_password"] is True

        # Now disconnect GitHub succeeds
        disc_success = client.post("/api/auth/github/disconnect", headers=headers)
        assert disc_success.status_code == 200

        # Attempting setup-credentials again must be rejected, directing user to Change Password
        dup_setup = client.post(
            "/api/auth/setup-credentials",
            json={
                "email": "oauthuser@example.com",
                "password": "AnotherPassword123!",
                "confirm_password": "AnotherPassword123!"
            },
            headers=headers,
        )
        assert dup_setup.status_code == 400
        assert "Change Password" in dup_setup.json()["detail"]

    # 7. Incorrect current password does not change an existing password
    def test_change_password_rejects_incorrect_current_password(self, password_user):
        headers = auth_headers(password_user)
        resp = client.post(
            "/api/auth/change-password",
            json={
                "current_password": "WrongPassword123!",
                "new_password": "BrandNewPassword123!"
            },
            headers=headers,
        )
        assert resp.status_code == 400
        assert "Current password is incorrect" in resp.json()["detail"]

        # Verify old password remains active
        db = TestSession()
        try:
            db_user = db.query(User).filter(User.id == password_user.id).first()
            assert verify_password("CurrentPassword123!", db_user.hashed_password)
            assert not verify_password("BrandNewPassword123!", db_user.hashed_password)
        finally:
            db.close()


class TestClearHistory:
    # 8. Clear History uses the correct endpoint and method
    def test_clear_history_requires_auth(self):
        resp = client.delete("/api/history")
        assert resp.status_code == 401

    def test_clear_history_supported_methods_and_paths(self, oauth_user_with_github):
        headers = auth_headers(oauth_user_with_github)
        # DELETE /api/history and aliases return 200
        for path in ("/api/history", "/api/history/", "/api/history/clear"):
            del_resp = client.delete(path, headers=headers)
            assert del_resp.status_code == 200, f"DELETE {path} returned {del_resp.status_code}"

        post_resp = client.post("/api/history/clear", headers=headers)
        assert post_resp.status_code == 200, f"POST /api/history/clear returned {post_resp.status_code}"

    # 9. Clearing history removes only the authenticated user's records
    def test_clear_history_removes_only_own_records(self, oauth_user_with_github):
        db = TestSession()
        try:
            # Create a second user who also has runs
            other_user = User(
                email="other_isolated@example.com",
                hashed_password=hash_password("Password123!"),
                full_name="Other User",
                is_active=True
            )
            db.add(other_user)
            db.commit()
            db.refresh(other_user)
            other_user_id = other_user.id

            # User 1 run 1
            run1 = AnalysisRun(
                user_id=oauth_user_with_github.id,
                analyzed_login="octocat",
                overall_score=75,
                score_tier="Competent",
                public_repos=10,
                total_stars=50,
                score_breakdown_json=json.dumps({"code_quality": 80}),
                profile_data_json=json.dumps({"login": "octocat"}),
                stats_data_json=json.dumps({}),
                languages_json=json.dumps([]),
                repositories_json=json.dumps([]),
                checklist_json=json.dumps([]),
                is_demo_data=False,
            )
            db.add(run1)
            db.commit()
            db.refresh(run1)

            # User 1 run 2 (chains to run1)
            run2 = AnalysisRun(
                user_id=oauth_user_with_github.id,
                analyzed_login="octocat",
                overall_score=85,
                score_tier="Proficient",
                public_repos=12,
                total_stars=60,
                previous_run_id=run1.id,
                score_breakdown_json=json.dumps({"code_quality": 88}),
                profile_data_json=json.dumps({"login": "octocat"}),
                stats_data_json=json.dumps({}),
                languages_json=json.dumps([]),
                repositories_json=json.dumps([]),
                checklist_json=json.dumps([]),
                is_demo_data=False,
            )
            db.add(run2)

            # Other user run
            other_run = AnalysisRun(
                user_id=other_user.id,
                analyzed_login="otherdev",
                overall_score=90,
                score_tier="Advanced",
                public_repos=20,
                total_stars=150,
                score_breakdown_json=json.dumps({}),
                profile_data_json=json.dumps({}),
                stats_data_json=json.dumps({}),
                languages_json=json.dumps([]),
                repositories_json=json.dumps([]),
                checklist_json=json.dumps([]),
                is_demo_data=False,
            )
            db.add(other_run)
            db.commit()
            other_run_id = other_run.id
        finally:
            db.close()

        headers = auth_headers(oauth_user_with_github)

        # Confirm 2 runs before deletion
        get_before = client.get("/api/history", headers=headers)
        assert get_before.status_code == 200
        assert get_before.json()["total_runs"] == 2

        # Delete history
        delete_resp = client.delete("/api/history", headers=headers)
        assert delete_resp.status_code == 200
        assert delete_resp.json()["deleted_count"] == 2

        # Confirm 0 runs after deletion for User 1
        get_after = client.get("/api/history", headers=headers)
        assert get_after.status_code == 200
        assert get_after.json()["total_runs"] == 0

        # Verify other user's run is untouched
        db = TestSession()
        try:
            persisted_other_run = db.query(AnalysisRun).filter(AnalysisRun.id == other_run_id).first()
            assert persisted_other_run is not None
            assert persisted_other_run.user_id == other_user_id
        finally:
            db.close()

    # 10. Failed deletion leaves data intact and displays an appropriate error
    def test_clear_history_error_handling_leaves_data_intact(self, oauth_user_with_github):
        from sqlalchemy.orm import Session
        db = TestSession()
        try:
            run = AnalysisRun(
                user_id=oauth_user_with_github.id,
                analyzed_login="octocat",
                overall_score=80,
                score_tier="Competent",
                public_repos=5,
                total_stars=20,
                score_breakdown_json=json.dumps({}),
                profile_data_json=json.dumps({"login": "octocat"}),
                stats_data_json=json.dumps({}),
                languages_json=json.dumps([]),
                repositories_json=json.dumps([]),
                checklist_json=json.dumps([]),
                is_demo_data=False,
            )
            db.add(run)
            db.commit()
            db.refresh(run)
            run_id = run.id
        finally:
            db.close()

        headers = auth_headers(oauth_user_with_github)

        # Mock an exception during db.commit() to test transactional rollback
        with patch.object(Session, "commit", side_effect=Exception("Database lock error")):
            resp = client.delete("/api/history", headers=headers)
            assert resp.status_code == 500
            assert "Failed to clear analysis history" in resp.json()["detail"]

        # Confirm run still exists after rollback
        db = TestSession()
        try:
            persisted_run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
            assert persisted_run is not None
            assert persisted_run.user_id == oauth_user_with_github.id
        finally:
            db.close()
