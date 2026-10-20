import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base
from app.db_models import User, ConnectedGitHubAccount, AnalysisRun
from app.services.auth_service import hash_password, create_access_token
from tests.conftest import TestSession, TEST_ENGINE

client = TestClient(app)


@pytest.fixture
def oauth_user_with_github():
    """Creates a user authenticated via GitHub OAuth without a local password."""
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


def auth_headers(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"Authorization": f"Bearer {token}"}


class TestSetupCredentials:
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
                "email": "newemail@example.com",
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
                "email": "newemail@example.com",
                "password": "Password123!",
                "confirm_password": "DifferentPassword123!"
            },
            headers=headers,
        )
        assert resp.status_code == 400
        assert "do not match" in resp.json()["detail"]

    def test_setup_credentials_rejects_duplicate_email(self, oauth_user_with_github):
        db = TestSession()
        try:
            existing_user = User(
                email="taken@example.com",
                hashed_password=hash_password("Password123!"),
                full_name="Existing User",
                is_active=True
            )
            db.add(existing_user)
            db.commit()
        finally:
            db.close()

        headers = auth_headers(oauth_user_with_github)
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

    def test_setup_credentials_success_enables_github_disconnect(self, oauth_user_with_github):
        headers = auth_headers(oauth_user_with_github)

        # Before setting credentials, attempting to disconnect GitHub must fail
        disc_fail = client.post("/api/auth/github/disconnect", headers=headers)
        assert disc_fail.status_code == 400
        assert "set an email and password first" in disc_fail.json()["detail"]

        # Set up email and password
        setup_resp = client.post(
            "/api/auth/setup-credentials",
            json={
                "email": "verified_dev@example.com",
                "password": "SuperSecurePassword123!",
                "confirm_password": "SuperSecurePassword123!"
            },
            headers=headers,
        )
        assert setup_resp.status_code == 200
        data = setup_resp.json()
        assert data["user"]["has_password"] is True
        assert data["user"]["email"] == "verified_dev@example.com"

        # Now disconnect GitHub should succeed
        disc_success = client.post("/api/auth/github/disconnect", headers=headers)
        assert disc_success.status_code == 200
        assert "disconnected safely" in disc_success.json()["message"]


class TestClearHistory:
    def test_clear_history_requires_auth(self):
        resp = client.delete("/api/history")
        assert resp.status_code == 401

    def test_clear_history_deletes_all_user_runs_including_chained_references(self, oauth_user_with_github):
        db = TestSession()
        try:
            # Create a second user who also has runs
            other_user = User(
                email="other@example.com",
                hashed_password=hash_password("Password123!"),
                full_name="Other User",
                is_active=True
            )
            db.add(other_user)
            db.commit()
            db.refresh(other_user)
            other_user_id = other_user.id

            # User 1 run 1 (base run)
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

            # User 1 run 2 (references run 1 via previous_run_id)
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

        # Verify history has 2 runs before deletion
        get_before = client.get("/api/history", headers=headers)
        assert get_before.status_code == 200
        assert get_before.json()["total_runs"] == 2

        # Delete history
        delete_resp = client.delete("/api/history", headers=headers)
        assert delete_resp.status_code == 200
        assert delete_resp.json()["deleted_count"] == 2

        # Verify history is now empty for oauth_user
        get_after = client.get("/api/history", headers=headers)
        assert get_after.status_code == 200
        assert get_after.json()["total_runs"] == 0
        assert len(get_after.json()["runs"]) == 0

        # Verify user account, credentials, and settings remain untouched
        user_check = client.get("/api/auth/me", headers=headers)
        assert user_check.status_code == 200
        assert user_check.json()["id"] == oauth_user_with_github.id

        # Verify other user's runs were NOT deleted
        db = TestSession()
        try:
            persisted_other_run = db.query(AnalysisRun).filter(AnalysisRun.id == other_run_id).first()
            assert persisted_other_run is not None
            assert persisted_other_run.user_id == other_user_id
        finally:
            db.close()
