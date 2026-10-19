import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from groq import AuthenticationError, RateLimitError, APITimeoutError, APIError, NotFoundError, BadRequestError

from app.models import (
    UserProfile,
    RepositoryItem,
    LanguageStat,
    AggregateStats,
    RepoQualityChecklist,
    AIAnalysisResult,
    AIAnalysisEnvelope,
)
from app.services.ai_service import AIService


@pytest.fixture
def sample_candidate_data():
    profile = UserProfile(
        login="testdev",
        name="Test Developer",
        avatar_url="https://avatars.githubusercontent.com/u/123",
        html_url="https://github.com/testdev",
        bio="Full stack Python & React engineer",
        public_repos=5,
        followers=20,
    )
    repos = [
        RepositoryItem(
            id=1,
            name="micro-service-core",
            full_name="testdev/micro-service-core",
            description="FastAPI async microservice template with docker",
            html_url="https://github.com/testdev/micro-service-core",
            language="Python",
            stargazers_count=15,
            forks_count=3,
            has_readme=True,
            has_description=True,
            has_topics=True,
            has_license=True,
            license_name="MIT License",
            topics=["fastapi", "python", "docker"],
            is_fork=False,
            created_at="2023-01-01T00:00:00Z",
            updated_at="2026-10-01T00:00:00Z",
            days_since_last_push=18,
            quality_score=90,
        )
    ]
    languages = [LanguageStat(language="Python", repo_count=1, percentage=100.0)]
    stats = AggregateStats(
        total_stars=15,
        total_forks=3,
        total_public_repos=5,
        total_analyzed_repos=1,
        detected_languages_count=1,
        primary_language="Python",
        average_stars_per_repo=15.0,
        total_open_issues=0,
    )
    checklist = RepoQualityChecklist(
        total_repos_analyzed=1,
        repos_with_description=1,
        repos_with_description_pct=100.0,
        repos_with_topics=1,
        repos_with_topics_pct=100.0,
        repos_with_license=1,
        repos_with_license_pct=100.0,
        repos_active_within_6_months=1,
        repos_active_within_6_months_pct=100.0,
        original_repos_count=1,
        forked_repos_count=0,
    )
    return profile, stats, languages, repos, checklist


@pytest.mark.asyncio
async def test_ai_service_missing_api_key(sample_candidate_data):
    """When GROQ_API_KEY is unset, service returns status='disabled' with helpful instruction."""
    profile, stats, languages, repos, checklist = sample_candidate_data
    service = AIService()
    service.api_key = None

    envelope = await service.analyze_portfolio(profile, stats, languages, repos, checklist)
    assert envelope.status == "disabled"
    assert envelope.is_mock is False
    assert envelope.analysis is None
    assert "GROQ_API_KEY is not configured" in envelope.error_message


@pytest.mark.asyncio
async def test_ai_service_demo_mode_returns_curated_mock(sample_candidate_data):
    """When demo mode is requested, service returns rich curated output with is_mock=True."""
    profile, stats, languages, repos, checklist = sample_candidate_data
    service = AIService()

    envelope = await service.analyze_portfolio(
        profile, stats, languages, repos, checklist, is_demo=True
    )
    assert envelope.status == "success"
    assert envelope.is_mock is True
    assert envelope.analysis is not None
    assert len(envelope.analysis.strengths) > 0
    assert len(envelope.analysis.weaknesses) > 0
    assert len(envelope.analysis.project_feedback) > 0
    assert len(envelope.analysis.recommendations) > 0
    assert len(envelope.analysis.roadmap_7_days) > 0
    assert len(envelope.analysis.roadmap_30_days) > 0


@pytest.mark.asyncio
async def test_ai_service_successful_groq_response(sample_candidate_data):
    """Verify Groq JSON output is properly parsed and validated against Pydantic schema."""
    profile, stats, languages, repos, checklist = sample_candidate_data
    service = AIService()
    service.api_key = "gsk_dummy_test_key_12345"

    mock_llm_payload = {
        "summary": "Solid technical foundation in asynchronous Python and containerized services.",
        "strengths": ["Clean microservice architecture", "Good documentation hygiene"],
        "weaknesses": ["Single language focus", "Could add live deployment links"],
        "project_feedback": [
            {
                "repo_name": "micro-service-core",
                "feedback": "Well-structured repository with clear separation of concerns.",
                "suggested_improvements": ["Add automated CI test workflow", "Deploy on Render"],
            }
        ],
        "profile_improvements": ["Add LinkedIn link to profile", "Specify target engineering roles in bio"],
        "placement_readiness": ["Ready for entry-level backend and Python developer interviews."],
        "recommendations": [
            {
                "priority": "high",
                "category": "Deployment",
                "title": "Deploy Service on Render",
                "reason": "Allows interviewers to hit live endpoints without local cloning.",
                "suggested_action": "Set up a free Render Web Service pointing to main branch.",
            }
        ],
        "roadmap_7_days": [
            {
                "day": "Day 1-2",
                "task": "CI/CD Setup",
                "details": "Create GitHub Actions workflow for pytest.",
                "expected_outcome": "Passing build badge.",
            }
        ],
        "roadmap_30_days": [
            {
                "week": "Week 1",
                "milestone": "Full API Documentation",
                "details": "Host Swagger/OpenAPI docs publicly.",
                "expected_outcome": "Interactive API docs URL.",
            }
        ],
        "missing_evidence": ["Closed-source collaborative git workflow cannot be verified."],
    }

    mock_response = MagicMock()
    mock_message = MagicMock()
    mock_message.content = json.dumps(mock_llm_payload)
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response.choices = [mock_choice]

    mock_client = AsyncMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch.object(service, "_get_groq_client", return_value=mock_client):
        envelope = await service.analyze_portfolio(profile, stats, languages, repos, checklist)
        assert envelope.status == "success"
        assert envelope.is_mock is False
        assert envelope.analysis is not None
        assert envelope.analysis.summary == mock_llm_payload["summary"]
        assert len(envelope.analysis.project_feedback) == 1
        assert envelope.analysis.project_feedback[0].repo_name == "micro-service-core"


@pytest.mark.asyncio
async def test_ai_service_handles_auth_error(sample_candidate_data):
    """Verify invalid API key (401) results in status='unavailable' without exposing credentials."""
    profile, stats, languages, repos, checklist = sample_candidate_data
    service = AIService()
    service.api_key = "gsk_invalid_key"

    mock_client = AsyncMock()
    mock_client.chat.completions.create.side_effect = AuthenticationError(
        message="Invalid API Key", response=MagicMock(), body=None
    )

    with patch.object(service, "_get_groq_client", return_value=mock_client):
        envelope = await service.analyze_portfolio(profile, stats, languages, repos, checklist)
        assert envelope.status == "unavailable"
        assert envelope.analysis is None
        assert "Invalid or revoked Groq API key" in envelope.error_message


@pytest.mark.asyncio
async def test_ai_service_handles_rate_limit(sample_candidate_data):
    """Verify rate limit (429) results in status='rate_limited'."""
    profile, stats, languages, repos, checklist = sample_candidate_data
    service = AIService()
    service.api_key = "gsk_valid_key"

    mock_client = AsyncMock()
    mock_client.chat.completions.create.side_effect = RateLimitError(
        message="Rate limit exceeded", response=MagicMock(), body=None
    )

    with patch.object(service, "_get_groq_client", return_value=mock_client):
        envelope = await service.analyze_portfolio(profile, stats, languages, repos, checklist)
        assert envelope.status == "rate_limited"
        assert envelope.analysis is None
        assert "rate limit reached" in envelope.error_message.lower()


@pytest.mark.asyncio
async def test_ai_service_handles_timeout(sample_candidate_data):
    """Verify provider timeout results in status='unavailable'."""
    profile, stats, languages, repos, checklist = sample_candidate_data
    service = AIService()
    service.api_key = "gsk_valid_key"

    mock_client = AsyncMock()
    mock_client.chat.completions.create.side_effect = APITimeoutError(request=MagicMock())

    with patch.object(service, "_get_groq_client", return_value=mock_client):
        envelope = await service.analyze_portfolio(profile, stats, languages, repos, checklist)
        assert envelope.status == "unavailable"
        assert envelope.analysis is None
        assert "timed out" in envelope.error_message.lower()


@pytest.mark.asyncio
async def test_ai_service_handles_malformed_json(sample_candidate_data):
    """Verify malformed JSON from LLM is caught and returns status='error' safely."""
    profile, stats, languages, repos, checklist = sample_candidate_data
    service = AIService()
    service.api_key = "gsk_valid_key"

    mock_response = MagicMock()
    mock_message = MagicMock()
    mock_message.content = "Not a json object: {broken"
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response.choices = [mock_choice]

    mock_client = AsyncMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch.object(service, "_get_groq_client", return_value=mock_client):
        envelope = await service.analyze_portfolio(profile, stats, languages, repos, checklist)
        assert envelope.status == "error"
        assert envelope.analysis is None
        assert "malformed JSON" in envelope.error_message


@pytest.mark.asyncio
async def test_ai_service_handles_markdown_fences(sample_candidate_data):
    """Verify JSON wrapped in markdown code fences (```json ... ```) is parsed successfully."""
    profile, stats, languages, repos, checklist = sample_candidate_data
    service = AIService()
    service.api_key = "gsk_valid_key"

    valid_json = json.dumps({
        "summary": "Great portfolio presentation.",
        "strengths": ["Strong FastAPI knowledge"],
        "weaknesses": ["Needs testing badges"],
        "project_feedback": [
            {
                "repo_name": "micro-service-core",
                "feedback": "Clean async code",
                "suggested_improvements": ["Add Dockerfile"],
            }
        ],
        "profile_improvements": ["Add location"],
        "placement_readiness": ["Interview ready"],
        "recommendations": [
            {
                "priority": "high",
                "category": "Testing",
                "title": "Add tests",
                "reason": "Quality check",
                "suggested_action": "Run pytest in CI",
            }
        ],
        "roadmap_7_days": [
            {
                "day": "Day 1-2",
                "task": "CI setup",
                "details": "GitHub actions",
                "expected_outcome": "Passing badge",
            }
        ],
        "roadmap_30_days": [
            {
                "week": "Week 1",
                "milestone": "Testing suite",
                "details": "80% coverage",
                "expected_outcome": "Coverage badge",
            }
        ],
        "missing_evidence": ["PR reviews"],
    })

    # Wrap in markdown fences with preamble
    fenced_content = f"Here is the evaluation:\n```json\n{valid_json}\n```\nHope this helps!"

    mock_response = MagicMock()
    mock_message = MagicMock()
    mock_message.content = fenced_content
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response.choices = [mock_choice]

    mock_client = AsyncMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch.object(service, "_get_groq_client", return_value=mock_client):
        envelope = await service.analyze_portfolio(profile, stats, languages, repos, checklist)
        assert envelope.status == "success"
        assert envelope.analysis is not None
        assert envelope.analysis.summary == "Great portfolio presentation."


@pytest.mark.asyncio
async def test_ai_service_normalizes_priority_and_strings(sample_candidate_data):
    """Verify non-standard casing like 'High' priority and string fields are normalized gracefully."""
    profile, stats, languages, repos, checklist = sample_candidate_data
    service = AIService()
    service.api_key = "gsk_valid_key"

    payload_with_capital_priority = {
        "summary": "Solid candidate.",
        "strengths": "Single string strength item",  # string instead of list
        "weaknesses": ["Missing docs"],
        "project_feedback": [
            {
                "name": "micro-service-core",  # 'name' instead of 'repo_name'
                "feedback": "Good job",
                "suggested_improvements": "Add tests",  # string instead of list
            }
        ],
        "profile_improvements": [],
        "placement_readiness": [],
        "recommendations": [
            {
                "priority": "HIGH",  # Capitalized priority
                "category": "CI",
                "title": "Set up CI",
                "reason": "Reliability",
                "suggested_action": "Add yaml",
            }
        ],
        "roadmap_7_days": [],
        "roadmap_30_days": [],
        "missing_evidence": [],
    }

    mock_response = MagicMock()
    mock_message = MagicMock()
    mock_message.content = json.dumps(payload_with_capital_priority)
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response.choices = [mock_choice]

    mock_client = AsyncMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch.object(service, "_get_groq_client", return_value=mock_client):
        envelope = await service.analyze_portfolio(profile, stats, languages, repos, checklist)
        assert envelope.status == "success"
        assert envelope.analysis is not None
        assert envelope.analysis.recommendations[0].priority == "high"
        assert len(envelope.analysis.strengths) == 1
        assert envelope.analysis.project_feedback[0].repo_name == "micro-service-core"


@pytest.mark.asyncio
async def test_ai_service_dynamic_key_and_model():
    """Verify api_key and model properties read dynamically and update properly."""
    from app.config import settings
    orig_key = settings.GROQ_API_KEY
    orig_model = settings.GROQ_MODEL
    try:
        service = AIService()
        service.api_key = "gsk_dynamic_test"
        assert service.api_key == "gsk_dynamic_test"

        service.model = "llama-3.1-8b-instant"
        assert service.model == "llama-3.1-8b-instant"

        service.api_key = None
        assert service.api_key is None
    finally:
        settings.GROQ_API_KEY = orig_key
        settings.GROQ_MODEL = orig_model


def test_ai_service_groq_model_env_override_and_default():
    """Verify GROQ_MODEL reads dynamically from os.environ and defaults to openai/gpt-oss-120b."""
    import os
    from app.config import settings
    service = AIService()

    # Save original env and settings
    orig_env = os.environ.get("GROQ_MODEL")
    orig_settings_model = settings.GROQ_MODEL
    try:
        if "GROQ_MODEL" in os.environ:
            del os.environ["GROQ_MODEL"]

        settings.GROQ_MODEL = "openai/gpt-oss-120b"

        # Default model is openai/gpt-oss-120b
        assert service.model == "openai/gpt-oss-120b"

        # Explicit environment variable overrides
        os.environ["GROQ_MODEL"] = "openai/gpt-oss-120b"
        assert service.model == "openai/gpt-oss-120b"

        os.environ["GROQ_MODEL"] = "llama-3.1-8b-instant"
        assert service.model == "llama-3.1-8b-instant"
    finally:
        settings.GROQ_MODEL = orig_settings_model
        if orig_env is not None:
            os.environ["GROQ_MODEL"] = orig_env
        elif "GROQ_MODEL" in os.environ:
            del os.environ["GROQ_MODEL"]


@pytest.mark.asyncio
async def test_ai_service_handles_model_not_found_404(sample_candidate_data):
    """Verify 404 / NotFoundError (decommissioned model) returns status='unavailable' with clear message."""
    profile, stats, languages, repos, checklist = sample_candidate_data
    service = AIService()
    service.api_key = "gsk_test_key"
    service.model = "llama-3.3-70b-versatile"  # simulate old decommissioned model

    mock_client = AsyncMock()
    mock_err_response = MagicMock(status_code=404)
    # Both initial call and fallback call fail with 404 / NotFoundError
    mock_client.chat.completions.create.side_effect = NotFoundError(
        message="The model `llama-3.3-70b-versatile` does not exist or has been decommissioned.",
        response=mock_err_response,
        body={"error": {"message": "model_not_found", "code": "model_not_found"}},
    )

    with patch.object(service, "_get_groq_client", return_value=mock_client):
        envelope = await service.analyze_portfolio(profile, stats, languages, repos, checklist)
        assert envelope.status == "unavailable"
        assert envelope.analysis is None
        assert "unavailable or decommissioned" in envelope.error_message.lower()
        assert "GROQ_MODEL" in envelope.error_message


@pytest.mark.asyncio
async def test_ai_service_model_not_found_triggers_fallback_success(sample_candidate_data):
    """Verify when primary model returns 404, fallback succeeds and reports the fallback model."""
    profile, stats, languages, repos, checklist = sample_candidate_data
    service = AIService()
    service.api_key = "gsk_test_key"
    service.model = "deprecated-model-xyz"

    mock_fallback_payload = {
        "summary": "Fallback model analysis generated successfully.",
        "strengths": ["Fast and efficient fallback"],
        "weaknesses": ["None"],
        "project_feedback": [],
        "profile_improvements": [],
        "placement_readiness": ["Ready"],
        "recommendations": [],
        "roadmap_7_days": [],
        "roadmap_30_days": [],
        "missing_evidence": [],
    }

    mock_response = MagicMock()
    mock_message = MagicMock()
    mock_message.content = json.dumps(mock_fallback_payload)
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response.choices = [mock_choice]

    mock_client = AsyncMock()
    # First call (deprecated model) raises NotFoundError, second call (fallback model) succeeds
    mock_client.chat.completions.create.side_effect = [
        NotFoundError(
            message="model_not_found",
            response=MagicMock(status_code=404),
            body={"error": {"code": "model_not_found"}},
        ),
        mock_response,
    ]

    with patch.object(service, "_get_groq_client", return_value=mock_client):
        envelope = await service.analyze_portfolio(profile, stats, languages, repos, checklist)
        assert envelope.status == "success"
        assert envelope.model_used == "llama-3.1-8b-instant"
        assert envelope.analysis is not None
        assert envelope.analysis.summary == "Fallback model analysis generated successfully."


