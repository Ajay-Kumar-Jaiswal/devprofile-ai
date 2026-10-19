import pytest
import time
import httpx
from httpx import AsyncClient, ASGITransport, Response
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.main import app
from app.services.github_service import github_service
from app.services.ai_service import ai_service
from app.models import UserProfile, AggregateStats, RepoQualityChecklist


@pytest.fixture(autouse=True)
def reset_services():
    github_service.clear_cache()
    github_service._rate_limit_reset_epoch = None
    yield
    github_service.clear_cache()
    github_service._rate_limit_reset_epoch = None


@pytest.mark.asyncio
async def test_github_5xx_outage_returns_502_bad_gateway():
    """Verify that GitHub 500/502/503 responses return 502 Bad Gateway without leaking raw HTML/body."""
    github_service.clear_cache()
    raw_html_error = "<html><body><h1>503 Service Unavailable</h1><p>Internal gateway failure</p></body></html>"

    mock_client = AsyncMock()
    mock_client.get.return_value = Response(
        503,
        text=raw_html_error,
        headers={"content-type": "text/html"},
        request=httpx.Request("GET", "https://api.github.com/users/torvalds"),
    )

    with pytest.raises(HTTPException) as exc_info:
        await github_service.fetch_profile(mock_client, "torvalds")

    assert exc_info.value.status_code == 502
    assert "outage" in exc_info.value.detail.lower() or "service" in exc_info.value.detail.lower()
    # Crucial: verify raw HTML is NOT leaked in detail
    assert "<html>" not in exc_info.value.detail
    assert "Internal gateway failure" not in exc_info.value.detail


@pytest.mark.asyncio
async def test_github_rate_limit_headers_in_response():
    """Verify that when rate-limited, standard Retry-After and X-RateLimit-Reset headers are attached."""
    github_service.clear_cache()
    future_reset = int(time.time() + 120)

    mock_client = AsyncMock()
    mock_client.get.return_value = Response(
        403,
        text="API rate limit exceeded",
        headers={
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": str(future_reset),
            "retry-after": "120",
        },
        request=httpx.Request("GET", "https://api.github.com/users/torvalds"),
    )

    with pytest.raises(HTTPException) as exc_info:
        await github_service.fetch_profile(mock_client, "torvalds")

    assert exc_info.value.status_code == 429
    assert exc_info.value.headers is not None
    assert int(exc_info.value.headers.get("Retry-After", "0")) in (119, 120)
    assert exc_info.value.headers.get("X-RateLimit-Reset") == str(future_reset)



@pytest.mark.asyncio
async def test_db_commit_failure_preserves_analysis_response():
    """Verify that if database persistence fails during analysis, the user still receives calculated results."""
    github_service.clear_cache()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Patch db.commit to simulate database lock or connection failure
        with patch("sqlalchemy.orm.Session.commit", side_effect=OperationalError("database locked", params=None, orig=Exception("locked"))):
            resp = await client.get("/api/analyze/demo")
            # Analysis must succeed and not crash with 500
            assert resp.status_code == 200
            data = resp.json()
            assert data["username"] == "alex-dev-demo"
            assert data["portfolio_score"]["overall_score"] > 0
            assert len(data["recommendations"]) > 0


@pytest.mark.asyncio
async def test_groq_5xx_outage_classified_as_unavailable():
    """Verify that Groq 500/503 outages are marked as unavailable while preserving deterministic score."""
    from groq import APIError

    profile = UserProfile(
        login="testdev",
        name="Test Dev",
        avatar_url="https://example.com/avatar.png",
        html_url="https://github.com/testdev",
        public_repos=5,
        public_gists=0,
        followers=10,
        following=5,
    )
    stats = AggregateStats(
        total_stars=50,
        total_forks=10,
        total_public_repos=5,
        total_analyzed_repos=5,
        detected_languages_count=2,
        primary_language="TypeScript",
        average_stars_per_repo=10.0,
        total_open_issues=2,
    )
    checklist = RepoQualityChecklist(
        total_repos_analyzed=5,
        repos_with_description=5,
        repos_with_description_pct=100.0,
        repos_with_topics=4,
        repos_with_topics_pct=80.0,
        repos_with_license=5,
        repos_with_license_pct=100.0,
        repos_active_within_6_months=4,
        repos_active_within_6_months_pct=80.0,
        original_repos_count=5,
        forked_repos_count=0,
    )

    ai_service.api_key = "gsk_dummy_test_key"

    mock_client = AsyncMock()
    api_err = APIError(
        message="Internal server error on Groq cluster",
        request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions"),
        body=None,
    )
    api_err.status_code = 503
    mock_client.chat.completions.create.side_effect = api_err

    with patch.object(ai_service, "_get_groq_client", return_value=mock_client):
        envelope = await ai_service.analyze_portfolio(
            profile=profile,
            stats=stats,
            languages=[],
            repos=[],
            checklist=checklist,
        )
        assert envelope.status == "unavailable"
        assert "outage" in envelope.error_message.lower() or "503" in envelope.error_message


@pytest.mark.asyncio
async def test_health_endpoint_structured_fields():
    """Verify health endpoint provides structured rate-limit and provider status flags."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "github_authenticated" in data
        assert "github_rate_limited" in data
        assert "groq_configured" in data
        assert isinstance(data["github_rate_limited"], bool)
        assert isinstance(data["github_authenticated"], bool)
