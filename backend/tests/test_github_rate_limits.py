import os
import time
import pytest
import httpx
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException
from httpx import AsyncClient, ASGITransport, Response

from app.config import settings
from app.main import app
from app.services.github_service import github_service, CachedUserData


@pytest.mark.asyncio
async def test_authenticated_headers_when_token_configured(monkeypatch):
    """Verify Authorization header is correctly attached when GITHUB_TOKEN is present."""
    monkeypatch.setenv("GITHUB_TOKEN", "ghp_securetesttoken12345")
    headers = github_service._get_headers()
    assert headers["Authorization"] == "Bearer ghp_securetesttoken12345"
    assert headers["User-Agent"] == "DevProfile-AI-Analyzer"
    assert headers["X-GitHub-Api-Version"] == "2022-11-28"


@pytest.mark.asyncio
async def test_authenticated_headers_with_existing_bearer_prefix(monkeypatch):
    """Verify token already prefixed with 'Bearer ' or 'token ' is cleanly normalized."""
    monkeypatch.setenv("GITHUB_TOKEN", "Bearer ghp_alreadyprefixed")
    headers = github_service._get_headers()
    assert headers["Authorization"] == "Bearer ghp_alreadyprefixed"

    monkeypatch.setenv("GITHUB_TOKEN", "token ghp_classicprefixed")
    headers2 = github_service._get_headers()
    assert headers2["Authorization"] == "Bearer ghp_classicprefixed"


@pytest.mark.asyncio
async def test_unauthenticated_headers_when_no_token(monkeypatch):
    """Verify Authorization header is omitted when GITHUB_TOKEN is empty or unset."""
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    monkeypatch.setattr(settings, "GITHUB_TOKEN", None)
    headers = github_service._get_headers()
    assert "Authorization" not in headers
    assert headers["User-Agent"] == "DevProfile-AI-Analyzer"


@pytest.mark.asyncio
async def test_token_is_never_leaked_in_exceptions(monkeypatch):
    """Verify GITHUB_TOKEN value is never exposed in error responses or exception text."""
    secret_token = "ghp_super_secret_token_never_leak_me_98765"
    monkeypatch.setenv("GITHUB_TOKEN", secret_token)
    monkeypatch.setattr(settings, "GITHUB_TOKEN", secret_token)

    mock_client = AsyncMock()
    # Simulate a 403 Forbidden with rate limit
    mock_client.get.return_value = Response(
        403,
        headers={"x-ratelimit-remaining": "0", "x-ratelimit-reset": str(int(time.time() + 60))},
        request=httpx.Request("GET", "https://api.github.com/users/secretleaktest"),
    )

    with pytest.raises(HTTPException) as exc_info:
        await github_service.fetch_profile(mock_client, "secretleaktest")

    assert exc_info.value.status_code == 429
    assert secret_token not in exc_info.value.detail
    assert "rate limit exceeded" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_rate_limit_403_parses_reset_and_calculates_countdown(monkeypatch):
    """Verify 403 response with x-ratelimit headers parses reset time and displays countdown."""
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    monkeypatch.setattr(settings, "GITHUB_TOKEN", None)
    mock_client = AsyncMock()
    future_epoch = int(time.time() + 300)  # 5 minutes in future
    mock_client.get.return_value = Response(
        403,
        headers={
            "x-ratelimit-remaining": "0",
            "x-ratelimit-limit": "60",
            "x-ratelimit-reset": str(future_epoch),
        },
        request=httpx.Request("GET", "https://api.github.com/users/ratelimiteduser"),
    )

    with pytest.raises(HTTPException) as exc_info:
        await github_service.fetch_profile(mock_client, "ratelimiteduser")

        assert exc_info.value.status_code == 429
        detail = exc_info.value.detail
        assert "unauthenticated rate limit exceeded" in detail
        assert "60 req/hr" in detail
        assert "GITHUB_TOKEN" in detail
        assert "Load Demo Profile" in detail
        assert github_service._rate_limit_reset_epoch == future_epoch


@pytest.mark.asyncio
async def test_rate_limit_429_with_retry_after():
    """Verify 429 status with retry-after header calculates future lockout epoch."""
    mock_client = AsyncMock()
    mock_client.get.return_value = Response(
        429,
        headers={"retry-after": "120"},
        request=httpx.Request("GET", "https://api.github.com/users/spammeduser"),
    )

    now = time.time()
    with pytest.raises(HTTPException) as exc_info:
        await github_service.fetch_profile(mock_client, "spammeduser")

    assert exc_info.value.status_code == 429
    assert github_service._rate_limit_reset_epoch is not None
    assert github_service._rate_limit_reset_epoch >= int(now + 119)


@pytest.mark.asyncio
async def test_fast_fail_lockout_prevents_network_hammering():
    """Verify that when quota is exhausted, subsequent calls immediately fail without HTTP calls."""
    github_service._rate_limit_reset_epoch = int(time.time() + 300)
    mock_client = AsyncMock()

    # Calling fetch_profile should fast-fail before mock_client.get is called
    with pytest.raises(HTTPException) as exc_profile:
        await github_service.fetch_profile(mock_client, "anyuser")
    assert exc_profile.value.status_code == 429
    assert mock_client.get.call_count == 0

    # Calling fetch_repositories should also fast-fail
    with pytest.raises(HTTPException) as exc_repos:
        await github_service.fetch_repositories(mock_client, "anyuser")
    assert exc_repos.value.status_code == 429
    assert mock_client.get.call_count == 0

    # Calling fetch_readme_excerpt should quietly return None without error
    excerpt = await github_service.fetch_readme_excerpt(mock_client, "anyuser", "anyrepo")
    assert excerpt is None
    assert mock_client.get.call_count == 0


@pytest.mark.asyncio
async def test_lockout_expires_cleanly():
    """Verify that once the lockout epoch has passed, requests are allowed through again."""
    # Set reset epoch in the past
    github_service._rate_limit_reset_epoch = int(time.time() - 5)
    mock_client = AsyncMock()
    mock_client.get.return_value = Response(
        200,
        json={"login": "unlockeduser", "public_repos": 0},
        request=httpx.Request("GET", "https://api.github.com/users/unlockeduser"),
    )

    data = await github_service.fetch_profile(mock_client, "unlockeduser")
    assert data["login"] == "unlockeduser"
    assert github_service._rate_limit_reset_epoch is None
    assert mock_client.get.call_count == 1


@pytest.mark.asyncio
async def test_invalid_token_401_response():
    """Verify that 401 Unauthorized returns clear actionable guidance regarding GITHUB_TOKEN."""
    mock_client = AsyncMock()
    mock_client.get.return_value = Response(
        401,
        json={"message": "Bad credentials"},
        request=httpx.Request("GET", "https://api.github.com/users/badcredsuser"),
    )

    with pytest.raises(HTTPException) as exc_info:
        await github_service.fetch_profile(mock_client, "badcredsuser")

    assert exc_info.value.status_code == 401
    assert "Invalid GitHub personal access token" in exc_info.value.detail


@pytest.mark.asyncio
async def test_in_memory_cache_prevents_duplicate_calls():
    """Verify caching prevents redundant API calls within TTL window."""
    username = "cachingtester"
    raw_profile = {"login": username, "public_repos": 1, "followers": 2, "created_at": "2024-01-01T00:00:00Z"}
    raw_repos = [
        {
            "id": 999,
            "name": "cached-repo",
            "full_name": f"{username}/cached-repo",
            "html_url": f"https://github.com/{username}/cached-repo",
            "stargazers_count": 5,
            "forks_count": 1,
            "open_issues_count": 0,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2026-10-01T00:00:00Z",
            "fork": False,
        }
    ]

    github_service.set_cached_user(username, raw_profile, raw_repos, {"cached-repo": "Excerpts here"})

    cached = github_service.get_cached_user(username)
    assert cached is not None
    assert cached.raw_profile["login"] == username
    assert len(cached.raw_repos) == 1
    assert cached.readme_excerpts["cached-repo"] == "Excerpts here"

    # End-to-end endpoint check with cache hit
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mock github_service.fetch_profile so we can verify it is NOT called
        with patch.object(github_service, "fetch_profile", new_callable=AsyncMock) as mock_fetch:
            resp = await client.get(f"/api/analyze/{username}?skip_ai=true")
            assert resp.status_code == 200
            assert mock_fetch.call_count == 0  # Served from cache!
            data = resp.json()
            assert data["username"] == username
            assert data["stats"]["total_stars"] == 5


@pytest.mark.asyncio
async def test_cache_expires_after_ttl():
    """Verify that cached data expires after the configured TTL."""
    username = "expireduser"
    github_service.set_cached_user(username, {"login": username}, [])
    
    # Manually backdate the cached_at timestamp past the 300s TTL
    github_service._cache[username].cached_at = time.time() - 305

    assert github_service.get_cached_user(username) is None
    assert username not in github_service._cache


@pytest.mark.asyncio
async def test_pagination_stops_when_public_repos_count_met():
    """Verify pagination does not request page 2 when public_repos_count is reached."""
    mock_client = AsyncMock()
    page1_repos = [{"id": i, "name": f"repo-{i}", "fork": False, "stargazers_count": 1, "created_at": "2024-01-01T00:00:00Z", "updated_at": "2026-10-01T00:00:00Z"} for i in range(5)]
    
    mock_client.get.return_value = Response(
        200,
        json=page1_repos,
        request=httpx.Request("GET", "https://api.github.com/users/five_repos/repos"),
    )

    # User has 5 repos total
    repos = await github_service.fetch_repositories(mock_client, "five_repos", max_repos=100, public_repos_count=5)
    assert len(repos) == 5
    assert mock_client.get.call_count == 1  # Did NOT call page 2!


@pytest.mark.asyncio
async def test_pagination_zero_repos_makes_no_calls():
    """Verify that when public_repos is 0, fetch_repositories returns [] with zero HTTP calls."""
    mock_client = AsyncMock()
    repos = await github_service.fetch_repositories(mock_client, "zero_repos", max_repos=100, public_repos_count=0)
    assert repos == []
    assert mock_client.get.call_count == 0
