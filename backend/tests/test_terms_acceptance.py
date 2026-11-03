import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db_models import User
from app.services.auth_service import hash_password
from tests.conftest import TestSession


@pytest.mark.asyncio
async def test_registration_requires_terms_acceptance():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Attempt registration with terms_accepted = False -> 400 Bad Request
        payload_rejected = {
            "email": "terms_reject@example.com",
            "password": "Password123!",
            "full_name": "Terms Reject",
            "terms_accepted": False,
        }
        resp = await client.post("/api/auth/register", json=payload_rejected)
        assert resp.status_code == 400
        assert "Terms & Conditions and Privacy Policy" in resp.json()["detail"]

        # Verify no user created
        db = TestSession()
        user_none = db.query(User).filter(User.email == "terms_reject@example.com").first()
        db.close()
        assert user_none is None

        # 2. Registration with terms_accepted = True -> 201 Created
        payload_accepted = {
            "email": "terms_accept@example.com",
            "password": "Password123!",
            "full_name": "Terms Accept",
            "terms_accepted": True,
        }
        resp_ok = await client.post("/api/auth/register", json=payload_accepted)
        assert resp_ok.status_code == 201
        data = resp_ok.json()
        assert data["success"] is True
        assert data["requires_verification"] is True
        assert data["user"]["terms_accepted_version"] == "2026-11-01"

        # Verify database record
        db = TestSession()
        user = db.query(User).filter(User.email == "terms_accept@example.com").first()
        assert user is not None
        assert user.terms_accepted is True
        assert user.terms_accepted_version == "2026-11-01"
        assert user.terms_accepted_at is not None
        db.close()


@pytest.mark.asyncio
async def test_existing_user_login_not_blocked_by_terms():
    # Pre-create an existing user without terms_accepted
    db = TestSession()
    existing_user = User(
        email="legacy_user@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Legacy Developer",
        is_active=True,
        is_verified=True,
        terms_accepted=False,
        terms_accepted_version=None,
    )
    db.add(existing_user)
    db.commit()
    db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Existing user logs in normally
        resp = await client.post(
            "/api/auth/login",
            json={"email": "legacy_user@example.com", "password": "Password123!"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "access_token" in data
        assert data["user"]["email"] == "legacy_user@example.com"
