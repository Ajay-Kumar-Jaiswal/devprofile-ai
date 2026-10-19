import pytest
from httpx import AsyncClient, ASGITransport, Response
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException
import httpx

from app.main import app
from app.services.github_service import github_service


@pytest.mark.asyncio
async def test_health_endpoint():
    """Verify health endpoint returns status 200 and expected schema."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "environment" in data
        assert "version" in data


@pytest.mark.asyncio
async def test_demo_profile_analysis():
    """Verify demo mode returns complete structure with is_demo_data=True."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/analyze/demo")
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_demo_data"] is True
        assert data["profile"]["login"] == "alex-dev-demo"
        assert len(data["top_repositories"]) > 0
        assert data["portfolio_score"]["overall_score"] > 0
        assert len(data["recommendations"]) > 0
        assert data["roadmap_7_day"]["is_mock_ai"] is True


@pytest.mark.asyncio
async def test_invalid_username_format(auth_headers):
    """Verify invalid GitHub handles fail validation with 400 Bad Request."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Cannot begin with hyphen
        resp = await client.get("/api/analyze/-invalid", headers=auth_headers)
        assert resp.status_code == 400
        assert "not a valid GitHub username" in resp.json()["detail"]

        # Cannot contain special symbols
        resp2 = await client.get("/api/analyze/invalid@user!", headers=auth_headers)
        assert resp2.status_code == 400


@pytest.mark.asyncio
async def test_valid_profile_analysis_with_mocked_github(auth_headers):
    """Verify successful end-to-end analysis when GitHub API returns valid user & repos."""
    mock_profile_json = {
        "login": "testuser",
        "name": "Test User",
        "avatar_url": "https://avatars.githubusercontent.com/u/1000",
        "html_url": "https://github.com/testuser",
        "bio": "Full-stack engineer passionate about web APIs",
        "public_repos": 2,
        "followers": 15,
        "following": 5,
        "created_at": "2023-01-01T00:00:00Z",
    }
    mock_repos_json = [
        {
            "id": 1,
            "name": "fastapi-starter",
            "full_name": "testuser/fastapi-starter",
            "description": "Clean template for production FastAPI apps",
            "html_url": "https://github.com/testuser/fastapi-starter",
            "language": "Python",
            "stargazers_count": 25,
            "forks_count": 4,
            "open_issues_count": 0,
            "topics": ["fastapi", "python"],
            "license": {"key": "mit", "name": "MIT License"},
            "fork": False,
            "created_at": "2023-05-01T00:00:00Z",
            "updated_at": "2026-10-01T00:00:00Z",
            "pushed_at": "2026-10-01T00:00:00Z",
        }
    ]

    with (
        patch.object(github_service, "fetch_profile", new_callable=AsyncMock) as mock_fetch_p,
        patch.object(github_service, "fetch_repositories", new_callable=AsyncMock) as mock_fetch_r,
    ):
        mock_fetch_p.return_value = mock_profile_json
        mock_fetch_r.return_value = mock_repos_json

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/analyze/testuser", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()
            assert data["username"] == "testuser"
            assert data["stats"]["total_stars"] == 25
            assert data["stats"]["primary_language"] == "Python"
            assert data["is_demo_data"] is False


@pytest.mark.asyncio
async def test_nonexistent_github_user_404(auth_headers):
    """Verify 404 response when GitHub API returns user not found."""
    with patch.object(github_service, "fetch_profile", new_callable=AsyncMock) as mock_fetch_p:
        mock_fetch_p.side_effect = HTTPException(status_code=404, detail="GitHub user 'unknown' was not found.")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/analyze/unknown", headers=auth_headers)
            assert resp.status_code == 404
            assert "was not found" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_github_rate_limit_429(auth_headers):
    """Verify 429 response when GitHub returns rate limit exceeded."""
    with patch.object(github_service, "fetch_profile", new_callable=AsyncMock) as mock_fetch_p:
        mock_fetch_p.side_effect = HTTPException(status_code=429, detail="GitHub API rate limit exceeded.")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/analyze/popularuser", headers=auth_headers)
            assert resp.status_code == 429
            assert "rate limit exceeded" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_github_network_timeout_504(auth_headers):
    """Verify 504 Gateway Timeout when GitHub request times out."""
    with patch.object(github_service, "fetch_profile", new_callable=AsyncMock) as mock_fetch_p:
        mock_fetch_p.side_effect = HTTPException(status_code=504, detail="GitHub API connection timed out.")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/analyze/slowuser", headers=auth_headers)
            assert resp.status_code == 504
            assert "timed out" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_user_with_empty_repositories(auth_headers):
    """Verify analyzer handles profiles with zero public repositories gracefully."""
    mock_profile_json = {
        "login": "zerorepos",
        "name": "Zero Repos",
        "avatar_url": "https://avatars.githubusercontent.com/u/2000",
        "html_url": "https://github.com/zerorepos",
        "bio": "Student developer starting out",
        "public_repos": 0,
        "followers": 1,
        "following": 1,
        "created_at": "2024-01-01T00:00:00Z",
    }

    with (
        patch.object(github_service, "fetch_profile", new_callable=AsyncMock) as mock_fetch_p,
        patch.object(github_service, "fetch_repositories", new_callable=AsyncMock) as mock_fetch_r,
    ):
        mock_fetch_p.return_value = mock_profile_json
        mock_fetch_r.return_value = []

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/analyze/zerorepos", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()
            assert data["stats"]["total_analyzed_repos"] == 0
            assert data["stats"]["total_stars"] == 0
            assert data["portfolio_score"]["overall_score"] >= 0


@pytest.mark.asyncio
async def test_github_service_fetch_profile_unit_mapping():
    """Directly test github_service.fetch_profile handling 404, 403, and timeout."""
    github_service._rate_limit_reset_epoch = None
    mock_client = AsyncMock()

    # 404
    mock_client.get.return_value = Response(404, request=httpx.Request("GET", "https://api.github.com/users/none"))
    with pytest.raises(HTTPException) as exc_404:
        await github_service.fetch_profile(mock_client, "none")
    assert exc_404.value.status_code == 404

    # 403 Rate limit
    mock_client.get.return_value = Response(
        403,
        headers={"x-ratelimit-reset": "1760832000", "x-ratelimit-remaining": "0"},
        request=httpx.Request("GET", "https://api.github.com/users/rate"),
    )
    with pytest.raises(HTTPException) as exc_403:
        await github_service.fetch_profile(mock_client, "rate")
    assert exc_403.value.status_code == 429

    # Reset lockout so subsequent test call doesn't fast-fail
    github_service._rate_limit_reset_epoch = None

    # Timeout
    mock_client.get.side_effect = httpx.TimeoutException("Timeout")
    with pytest.raises(HTTPException) as exc_504:
        await github_service.fetch_profile(mock_client, "timeout")
    assert exc_504.value.status_code == 504


@pytest.mark.asyncio
async def test_post_analyze_ai_only_demo():
    """Verify POST /api/analyze/{username}/ai returns AIAnalysisEnvelope."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/analyze/demo/ai")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["is_mock"] is True
        assert data["analysis"]["summary"] is not None


@pytest.mark.asyncio
async def test_ai_failure_preserves_github_metrics_and_score(auth_headers):
    """Verify that if Groq returns an error or is unconfigured, core GitHub analysis succeeds."""
    mock_profile_json = {
        "login": "codehero",
        "name": "Code Hero",
        "avatar_url": "https://avatars.githubusercontent.com/u/3000",
        "html_url": "https://github.com/codehero",
        "bio": "Open-source contributor",
        "public_repos": 1,
        "followers": 10,
        "following": 5,
        "created_at": "2023-01-01T00:00:00Z",
    }
    mock_repos_json = [
        {
            "id": 1,
            "name": "core-lib",
            "full_name": "codehero/core-lib",
            "description": "Core library",
            "html_url": "https://github.com/codehero/core-lib",
            "language": "Go",
            "stargazers_count": 50,
            "forks_count": 10,
            "open_issues_count": 0,
            "topics": ["go"],
            "license": {"key": "apache-2.0", "name": "Apache-2.0"},
            "fork": False,
            "created_at": "2023-05-01T00:00:00Z",
            "updated_at": "2026-10-01T00:00:00Z",
            "pushed_at": "2026-10-01T00:00:00Z",
        }
    ]

    with (
        patch.object(github_service, "fetch_profile", new_callable=AsyncMock) as mock_p,
        patch.object(github_service, "fetch_repositories", new_callable=AsyncMock) as mock_r,
        patch.object(github_service, "fetch_readme_excerpt", new_callable=AsyncMock) as mock_readme,
    ):
        mock_p.return_value = mock_profile_json
        mock_r.return_value = mock_repos_json
        mock_readme.return_value = None

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/analyze/codehero", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()

            # Core GitHub metrics and score MUST be present and accurate
            assert data["username"] == "codehero"
            assert data["stats"]["total_stars"] == 50
            assert data["portfolio_score"]["overall_score"] > 0
            assert len(data["recommendations"]) > 0

            # AI envelope is present and reports status without throwing a 500 error
            assert data["ai_analysis"] is not None
            assert data["ai_analysis"]["status"] in ("disabled", "unavailable", "success", "error")


@pytest.mark.asyncio
async def test_ai_retry_endpoint_invokes_service_and_persists_to_analysis_run():
    """Verify that POST /api/analyze/{username}/ai invokes ai_service and saves successful result to AnalysisRun."""
    import json
    from tests.conftest import TestSession
    from app.db_models import User, AnalysisRun
    from app.services.auth_service import hash_password, create_access_token
    from app.services.ai_service import ai_service
    from app.models import AIAnalysisEnvelope, AIAnalysisResult

    db = TestSession()
    user = User(
        email="ai_retry_user@example.com",
        hashed_password=hash_password("SecurePassword123!"),
        full_name="AI Retry Tester",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create an existing analysis run with empty / old AI analysis
    run = AnalysisRun(
        user_id=user.id,
        analyzed_login="alex-dev-demo",
        is_demo_data=True,
        overall_score=85,
        score_tier="Proficient",
        public_repos=5,
        total_stars=20,
        primary_language="Python",
        status="success",
        score_breakdown_json="{}",
        profile_data_json="{}",
        stats_data_json="{}",
        languages_json="[]",
        repositories_json="[]",
        checklist_json="{}",
        ai_analysis_json=None,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    run_id = run.id
    token = create_access_token({"sub": str(user.id), "email": user.email})
    db.close()

    mock_result = AIAnalysisResult(
        summary="Retried AI analysis summary with targeted feedback.",
        strengths=["Strong architecture", "Good tests"],
        weaknesses=["Need more documentation"],
        project_feedback=[],
        profile_improvements=["Add bio link"],
        placement_readiness=["Interview ready"],
        recommendations=[],
        roadmap_7_days=[],
        roadmap_30_days=[],
        missing_evidence=[],
    )
    mock_envelope = AIAnalysisEnvelope(
        status="success",
        model_used="openai/gpt-oss-120b",
        is_mock=False,
        error_message=None,
        analysis=mock_result,
    )

    with patch.object(ai_service, "analyze_portfolio", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = mock_envelope

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/analyze/alex-dev-demo/ai?demo=true&run_id={run_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "success"
            assert data["model_used"] == "openai/gpt-oss-120b"
            assert data["analysis"]["summary"] == "Retried AI analysis summary with targeted feedback."

            # Verify that ai_service.analyze_portfolio was indeed called
            mock_analyze.assert_awaited_once()

    # Verify that the DB record AnalysisRun was updated with the new AI envelope
    db2 = TestSession()
    updated_run = db2.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    assert updated_run is not None
    assert updated_run.ai_analysis_json is not None
    saved_ai = json.loads(updated_run.ai_analysis_json)
    assert saved_ai["status"] == "success"
    assert saved_ai["analysis"]["summary"] == "Retried AI analysis summary with targeted feedback."
    assert saved_ai["model_used"] == "openai/gpt-oss-120b"
    db2.close()

