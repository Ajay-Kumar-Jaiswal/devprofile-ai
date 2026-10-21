import pytest
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock, MagicMock
import httpx
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db_models import InternshipListing, UserSavedInternship, User, AnalysisRun
from app.services.auth_service import hash_password, create_access_token
from app.internships.adapters.base import RawListing
from app.internships.adapters.greenhouse import GreenhouseJobBoardAdapter
from app.internships.adapters.lever import LeverPostingsAdapter
from app.internships.adapters.rss import RssJobFeedAdapter, is_safe_public_feed_url
from app.internships.sanitizer import sanitize_html, strip_html_to_plain_text, validate_web_url
from app.internships.keyword_extractor import extract_skills_from_text, is_internship_or_early_career
from app.internships.matcher import CandidateSkillsProfile, calculate_match_score
from app.internships.normalizer import normalize_raw_listing
from app.internships.service import internships_service
from tests.conftest import TestSession


# ==============================================================================
# 1. Sanitizer & Security Tests
# ==============================================================================

def test_html_sanitizer_removes_dangerous_tags():
    """Verify script, iframe, object, and onerror handlers are stripped."""
    dirty_html = (
        '<div><h3>Title</h3><script>alert("xss")</script>'
        '<img src="x" onerror="alert(1)" />'
        '<a href="javascript:stealToken()">Malicious Link</a>'
        '<a href="https://example.com/apply">Legit Link</a></div>'
    )
    cleaned = sanitize_html(dirty_html)
    assert "<script" not in cleaned
    assert "alert" not in cleaned
    assert "javascript:" not in cleaned
    assert "onerror" not in cleaned
    assert "https://example.com/apply" in cleaned


def test_plain_text_extractor():
    """Verify HTML entities and markup are converted to clean plain text."""
    html_sample = "<p>Looking for a <strong>Software Engineer Intern</strong> &amp; passionate coder.</p>"
    plain = strip_html_to_plain_text(html_sample)
    assert plain == "Looking for a Software Engineer Intern & passionate coder."


def test_url_validation():
    """Verify strict URL validation accepts only http/https and rejects invalid URIs."""
    assert validate_web_url("https://boards.greenhouse.io/stripe/jobs/12345") is not None
    assert validate_web_url("http://jobs.lever.co/figma/67890") is not None
    assert validate_web_url("javascript:alert(1)") is None
    assert validate_web_url("file:///etc/passwd") is None
    assert validate_web_url("ftp://ftp.example.com") is None
    assert validate_web_url("") is None
    assert validate_web_url(None) is None


# ==============================================================================
# 2. Keyword Extractor & Internship Classification Tests
# ==============================================================================

def test_keyword_extractor_finds_languages_and_tools():
    """Verify technical skills, frameworks, and tools are accurately extracted."""
    text = (
        "We are seeking an intern proficient in Python, TypeScript, React, and FastAPI. "
        "Familiarity with PostgreSQL, Docker, Git, and AWS is a plus."
    )
    skills = extract_skills_from_text(text)
    assert "Python" in skills
    assert "TypeScript" in skills
    assert "React" in skills
    assert "FastAPI" in skills
    assert "PostgreSQL" in skills
    assert "Docker" in skills
    assert "Git" in skills
    assert "AWS" in skills


def test_is_internship_posting_detection():
    """Verify internship classification accurately detects intern roles and rejects senior roles."""
    assert is_internship_or_early_career("Software Engineer Intern - Summer 2026", "Join our intern cohort") is True
    assert is_internship_or_early_career("Frontend Co-op Student", "Work alongside our product team") is True
    assert is_internship_or_early_career("University Graduate / Student Trainee", "") is True

    # Negative cases
    assert is_internship_or_early_career("Senior Staff Software Engineer", "10+ years experience required") is False
    assert is_internship_or_early_career("Director of Engineering", "Lead a team of 40 people") is False


# ==============================================================================
# 3. Provider Adapters Tests (Greenhouse, Lever, RSS/Atom)
# ==============================================================================

@pytest.mark.asyncio
async def test_greenhouse_adapter():
    """Verify Greenhouse adapter fetches and formats job listings correctly."""
    mock_payload = {
        "jobs": [
            {
                "id": 98765,
                "title": "Software Engineering Intern - Frontend",
                "absolute_url": "https://boards.greenhouse.io/stripe/jobs/98765",
                "location": {"name": "San Francisco, CA / Remote"},
                "content": "<p>Requirements: React, TypeScript, GraphQL</p>",
                "updated_at": "2026-05-01T12:00:00Z",
            },
            {
                "id": 54321,
                "title": "VP of Global Sales",
                "absolute_url": "https://boards.greenhouse.io/stripe/jobs/54321",
                "location": {"name": "New York, NY"},
                "content": "<p>15 years experience closing enterprise deals.</p>",
                "updated_at": "2026-05-01T12:00:00Z",
            },
        ]
    }

    adapter = GreenhouseJobBoardAdapter()

    mock_client = AsyncMock(spec=AsyncClient)
    mock_client.get.return_value = httpx.Response(200, json=mock_payload)

    listings = await adapter.fetch_listings(board_token="stripe", client=mock_client)
    assert len(listings) == 2

    # Verify first listing
    intern_job = next(j for j in listings if j.source_job_id == "98765")
    assert intern_job.source_type == "greenhouse"
    assert intern_job.company_name == "Stripe"
    assert "Frontend" in intern_job.title
    assert "React" in intern_job.description_html
    norm = normalize_raw_listing(intern_job)
    assert norm is not None
    assert norm.is_internship is True


@pytest.mark.asyncio
async def test_lever_adapter():
    """Verify Lever adapter fetches and normalizes postings."""
    mock_payload = [
        {
            "id": "lever-111",
            "text": "Backend Engineering Intern",
            "hostedUrl": "https://jobs.lever.co/figma/lever-111",
            "applyUrl": "https://jobs.lever.co/figma/lever-111/apply",
            "categories": {
                "location": "Remote - US",
                "commitment": "Intern",
                "workplaceType": "remote",
            },
            "description": "<div>Experience with Python, Go, and PostgreSQL.</div>",
            "createdAt": 1746000000000,
        }
    ]

    adapter = LeverPostingsAdapter()

    mock_client = AsyncMock(spec=AsyncClient)
    mock_client.get.return_value = httpx.Response(200, json=mock_payload)

    listings = await adapter.fetch_listings(site_identifier="figma", client=mock_client)
    assert len(listings) == 1
    listing = listings[0]
    assert listing.source_job_id == "lever-111"
    assert listing.source_type == "lever"
    norm = normalize_raw_listing(listing)
    assert norm is not None
    assert norm.is_internship is True
    assert norm.application_url == "https://jobs.lever.co/figma/lever-111/apply"


@pytest.mark.asyncio
async def test_rss_feed_adapter():
    """Verify RSS adapter safely parses RSS 2.0 and Atom feeds without entity injection."""
    rss_xml = """<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
    <channel>
        <title>Tech Internships</title>
        <link>https://example.com/jobs</link>
        <item>
            <title>Data Science Intern - Machine Learning</title>
            <link>https://example.com/jobs/ds-intern</link>
            <description>Python, PyTorch, and SQL skills required.</description>
            <pubDate>Mon, 18 May 2026 10:00:00 GMT</pubDate>
            <guid>ds-intern-2026</guid>
        </item>
    </channel>
    </rss>
    """

    adapter = RssJobFeedAdapter()

    mock_client = AsyncMock(spec=AsyncClient)
    mock_client.get.return_value = httpx.Response(200, content=rss_xml.encode("utf-8"))

    listings = await adapter.fetch_listings(
        feed_config="tech_feed:https://example.com/feed.xml", client=mock_client
    )
    assert len(listings) == 1
    listing = listings[0]
    assert listing.source_job_id == "ds-intern-2026"
    assert listing.title == "Data Science Intern - Machine Learning"
    norm = normalize_raw_listing(listing)
    assert norm is not None
    assert norm.is_internship is True


# ==============================================================================
# 4. Deterministic Match Scoring & Transparent Evidence Tests
# ==============================================================================

def test_match_score_calculation_with_profile():
    """Verify 4-pillar deterministic match score and explicit 'Not demonstrated' labeling."""
    candidate = CandidateSkillsProfile(run=None)
    candidate.username = "testdev"
    candidate.primary_language = "Python"
    candidate.overall_score = 85
    candidate.demonstrated_skills = {"Python", "FastAPI", "PostgreSQL", "Docker", "Git"}

    listing = InternshipListing(
        id=1,
        source_type="greenhouse",
        source_board_or_site="stripe",
        source_job_id="stripe-123",
        company_name="Stripe",
        title="Backend Engineering Intern",
        location="Remote",
        work_mode="remote",
        is_internship=True,
        required_skills_json=json.dumps(["Python", "FastAPI", "Docker"]),
        preferred_skills_json=json.dumps(["Kubernetes", "Redis", "PostgreSQL"]),
        original_url="https://boards.greenhouse.io/stripe/jobs/stripe-123",
    )

    result = calculate_match_score(listing=listing, candidate=candidate)

    assert result["match_score"] >= 75
    assert result["fit_level"] == "Strong Match"
    assert "Python" in result["matched_skills"]
    assert "FastAPI" in result["matched_skills"]
    assert "Docker" in result["matched_skills"]

    # Verify transparent disclaimer on missing skills
    assert "Kubernetes" in result["not_demonstrated_skills"]
    assert "Redis" in result["not_demonstrated_skills"]

    # Verify score breakdown has the 4 pillars
    breakdown = result["score_breakdown"]
    assert "tech_stack_score" in breakdown
    assert "tools_score" in breakdown
    assert "readiness_score" in breakdown
    assert "domain_score" in breakdown

    # Verify fit reasons are clear and grounded
    assert any("Demonstrated skills" in reason for reason in result["fit_reasons"])


def test_match_score_with_no_candidate_overlap():
    """Verify fallback handling when candidate has no overlapping skills."""
    candidate = CandidateSkillsProfile(run=None)
    candidate.username = "testdev"
    candidate.overall_score = 40
    candidate.demonstrated_skills = set()

    listing = InternshipListing(
        id=2,
        source_type="lever",
        source_board_or_site="embedded_co",
        source_job_id="emb-456",
        company_name="Embedded Systems Inc",
        title="Firmware Intern",
        location="Onsite",
        work_mode="onsite",
        is_internship=True,
        required_skills_json=json.dumps(["Rust", "C++"]),
        preferred_skills_json=json.dumps(["RTOS"]),
        original_url="https://jobs.lever.co/embedded_co/emb-456",
    )

    result = calculate_match_score(listing=listing, candidate=candidate)

    assert result["match_score"] < 50
    assert len(result["matched_skills"]) == 0
    assert "Rust" in result["not_demonstrated_skills"]
    assert "C++" in result["not_demonstrated_skills"]


# ==============================================================================
# 5. Database Ingestion, Deduplication, and Freshness Lifecycle
# ==============================================================================

@pytest.mark.asyncio
async def test_internship_deduplication_and_freshness():
    """Verify repeated sync updates last_seen_at without duplicating rows."""
    db = TestSession()
    try:
        raw = RawListing(
            source_type="greenhouse",
            source_board_or_site="acme",
            source_job_id="acme-001",
            company_name="Acme Corp",
            title="Full Stack Intern",
            description_html="<p>React and Node.js</p>",
            location="Remote",
            original_url="https://boards.greenhouse.io/acme/jobs/acme-001",
        )

        fake_sources = [
            {
                "provider": "greenhouse",
                "identifier": "acme",
                "label": "Acme (Greenhouse)",
                "api_endpoint": "https://boards-api.greenhouse.io/v1/boards/acme/jobs",
            }
        ]

        with patch("app.internships.adapters.registry.source_registry.get_configured_sources", return_value=fake_sources):
            with patch("app.internships.adapters.greenhouse.GreenhouseJobBoardAdapter.fetch_listings", return_value=[raw]):
                # First sync
                res1 = await internships_service.sync_all_sources(db)
                assert res1.listings_ingested == 1
                assert res1.listings_updated == 0

                # Verify saved row
                item = (
                    db.query(InternshipListing)
                    .filter_by(
                        source_type="greenhouse",
                        source_board_or_site="acme",
                        source_job_id="acme-001",
                    )
                    .first()
                )
                assert item is not None
                first_seen = item.first_seen_at
                last_seen_1 = item.last_seen_at

                # Second sync (same item, should be counted as updated)
                res2 = await internships_service.sync_all_sources(db)
                assert res2.listings_ingested == 0
                assert res2.listings_updated == 1

                db.refresh(item)
                assert item.first_seen_at == first_seen
                assert item.last_seen_at >= last_seen_1
                assert db.query(InternshipListing).count() == 1
    finally:
        db.close()


# ==============================================================================
# 6. API Endpoints & Bookmarking Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_internships_api_requires_auth():
    """Verify unauthenticated requests to internships API are rejected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/internships")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_internships_api_flow(auth_headers, test_user):
    """Verify listing, filtering, detail, bookmarking, and user isolation."""
    # Seed an internship in test database
    db = TestSession()
    try:
        listing = InternshipListing(
            source_type="greenhouse",
            source_board_or_site="airbnb",
            source_job_id="air-101",
            company_name="Airbnb",
            title="Software Engineering Intern, Infrastructure",
            location="San Francisco, CA",
            work_mode="hybrid",
            is_internship=True,
            is_active=True,
            description_html="<p>Work on cloud infrastructure using Python and Docker.</p>",
            description_text="Work on cloud infrastructure using Python and Docker.",
            required_skills_json=json.dumps(["Python", "Docker"]),
            preferred_skills_json=json.dumps(["Kubernetes"]),
            original_url="https://boards.greenhouse.io/airbnb/jobs/air-101",
            application_url="https://boards.greenhouse.io/airbnb/jobs/air-101/apply",
            published_at=datetime.now(timezone.utc),
            last_seen_at=datetime.now(timezone.utc),
            last_verified_at=datetime.now(timezone.utc),
        )
        db.add(listing)
        db.commit()
        db.refresh(listing)
        listing_id = listing.id
    finally:
        db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch listings
        resp = await client.get("/api/internships", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["company_name"] == "Airbnb"
        assert data["items"][0]["is_saved"] is False

        # 2. Search filter
        search_resp = await client.get("/api/internships?q=Infrastructure", headers=auth_headers)
        assert search_resp.status_code == 200
        assert search_resp.json()["total"] == 1

        miss_resp = await client.get("/api/internships?q=NonExistentKeywordXYZ", headers=auth_headers)
        assert miss_resp.status_code == 200
        assert miss_resp.json()["total"] == 0

        # 3. Work mode filter
        wm_resp = await client.get("/api/internships?work_mode=hybrid", headers=auth_headers)
        assert wm_resp.status_code == 200
        assert wm_resp.json()["total"] == 1

        # 4. View Detail
        detail_resp = await client.get(f"/api/internships/{listing_id}", headers=auth_headers)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["id"] == listing_id
        assert detail["match"]["skill_evidence_disclaimer"] == "Not demonstrated in GitHub profile"

        # 5. Save / Bookmark
        save_resp = await client.post(f"/api/internships/{listing_id}/save", headers=auth_headers)
        assert save_resp.status_code == 200
        assert save_resp.json()["is_saved"] is True

        # 6. Verify in saved tab
        saved_list_resp = await client.get("/api/internships/saved", headers=auth_headers)
        assert saved_list_resp.status_code == 200
        saved_items = saved_list_resp.json()["items"]
        assert len(saved_items) == 1
        assert saved_items[0]["id"] == listing_id
        assert saved_items[0]["is_saved"] is True

        # 7. User isolation: create a second user and verify listing is NOT marked saved for them
        db = TestSession()
        try:
            second_user = User(
                email="second@campus.edu",
                hashed_password=hash_password("pw123"),
                full_name="Second User",
                is_active=True,
            )
            db.add(second_user)
            db.commit()
            db.refresh(second_user)
            second_user_id = second_user.id
        finally:
            db.close()

        other_token = create_access_token({"sub": str(second_user_id), "email": "second@campus.edu"})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        other_list_resp = await client.get("/api/internships", headers=other_headers)
        assert other_list_resp.status_code == 200
        assert other_list_resp.json()["items"][0]["is_saved"] is False

        other_saved_resp = await client.get("/api/internships/saved", headers=other_headers)
        assert other_saved_resp.status_code == 200
        assert other_saved_resp.json()["total"] == 0

        # 8. Unsave / Remove Bookmark
        unsave_resp = await client.delete(f"/api/internships/{listing_id}/save", headers=auth_headers)
        assert unsave_resp.status_code == 200
        assert unsave_resp.json()["is_saved"] is False

        # Confirm saved list is now empty
        empty_saved = await client.get("/api/internships/saved", headers=auth_headers)
        assert empty_saved.json()["total"] == 0

        # 9. Sources overview
        sources_resp = await client.get("/api/internships/sources", headers=auth_headers)
        assert sources_resp.status_code == 200
        sources_data = sources_resp.json()
        assert "sources" in sources_data
        assert "total_configured" in sources_data


# ==============================================================================
# 7. SSRF Protection, Enhanced Filters & Source Health Taxonomy Tests
# ==============================================================================

def test_rss_ssrf_protection_blocks_private_and_metadata_ips():
    """Verify SSRF protection strictly rejects loopback, RFC-1918, link-local, and non-http URLs."""
    # Loopback
    is_safe, _ = is_safe_public_feed_url("http://127.0.0.1:8000/feed.xml")
    assert is_safe is False
    is_safe, _ = is_safe_public_feed_url("http://localhost/rss")
    assert is_safe is False
    is_safe, _ = is_safe_public_feed_url("http://127.0.0.2/feed")
    assert is_safe is False

    # Link-local cloud metadata (AWS / GCP / Azure / DigitalOcean metadata endpoints)
    is_safe, _ = is_safe_public_feed_url("http://169.254.169.254/latest/meta-data")
    assert is_safe is False
    is_safe, _ = is_safe_public_feed_url("http://169.254.169.254/computeMetadata/v1/")
    assert is_safe is False

    # Private RFC-1918 networks
    is_safe, _ = is_safe_public_feed_url("http://10.0.0.1/rss")
    assert is_safe is False
    is_safe, _ = is_safe_public_feed_url("http://192.168.1.1/feed.xml")
    assert is_safe is False
    is_safe, _ = is_safe_public_feed_url("http://172.16.0.5/jobs.rss")
    assert is_safe is False

    # Dangerous schemes
    is_safe, _ = is_safe_public_feed_url("file:///etc/passwd")
    assert is_safe is False
    is_safe, _ = is_safe_public_feed_url("ftp://ftp.example.com/rss.xml")
    assert is_safe is False
    is_safe, _ = is_safe_public_feed_url("javascript:alert(1)")
    assert is_safe is False
    is_safe, _ = is_safe_public_feed_url("")
    assert is_safe is False

    # Valid public feed URL
    is_safe, _ = is_safe_public_feed_url("https://weworkremotely.com/categories/remote-programming-jobs.rss")
    assert is_safe is True


@pytest.mark.asyncio
async def test_internships_india_and_remote_filtering():
    """Verify location='india' filters for Indian tech hubs and remote roles while excluding foreign onsite roles."""
    db = TestSession()
    try:
        user = User(email="india_filter_user@example.com", is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
        uid = user.id

        now = datetime.now(timezone.utc)
        listing_blr = InternshipListing(
            source_type="greenhouse",
            source_board_or_site="groww",
            source_job_id="blr_101",
            company_name="Groww",
            title="Software Engineering Intern",
            description_html="<p>Bangalore office</p>",
            description_text="Bangalore office",
            location="Bangalore, Karnataka, India",
            work_mode="onsite",
            is_internship=True,
            original_url="https://groww.in/careers/101",
            first_seen_at=now,
            last_seen_at=now,
            last_verified_at=now,
            is_stale=False,
            is_active=True,
        )
        listing_remote = InternshipListing(
            source_type="greenhouse",
            source_board_or_site="gitlab",
            source_job_id="rem_102",
            company_name="GitLab",
            title="Backend Intern",
            description_html="<p>Global remote</p>",
            description_text="Global remote",
            location="Remote, Global",
            work_mode="remote",
            is_internship=True,
            original_url="https://gitlab.com/careers/102",
            first_seen_at=now,
            last_seen_at=now,
            last_verified_at=now,
            is_stale=False,
            is_active=True,
        )
        listing_sf = InternshipListing(
            source_type="greenhouse",
            source_board_or_site="stripe",
            source_job_id="sf_103",
            company_name="Stripe",
            title="Frontend Intern",
            description_html="<p>San Francisco HQ</p>",
            description_text="San Francisco HQ",
            location="San Francisco, CA, USA",
            work_mode="onsite",
            is_internship=True,
            original_url="https://stripe.com/careers/103",
            first_seen_at=now,
            last_seen_at=now,
            last_verified_at=now,
            is_stale=False,
            is_active=True,
        )
        db.add_all([listing_blr, listing_remote, listing_sf])
        db.commit()
    finally:
        db.close()

    token = create_access_token({"sub": str(uid), "email": "india_filter_user@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/internships?location=india", headers=headers)
        assert resp.status_code == 200
        items = resp.json()["items"]
        company_names = [it["company_name"] for it in items]

        assert "Groww" in company_names
        assert "GitLab" in company_names
        assert "Stripe" not in company_names


@pytest.mark.asyncio
async def test_internships_role_category_and_employer_filtering():
    """Verify role_category and employer query parameters accurately filter vacancies."""
    db = TestSession()
    try:
        user = User(email="role_filter_user@example.com", is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
        uid = user.id

        now = datetime.now(timezone.utc)
        listing_fe = InternshipListing(
            source_type="greenhouse",
            source_board_or_site="figma",
            source_job_id="figma_fe_1",
            company_name="Figma",
            title="Frontend Engineer Intern",
            description_html="<p>React and WebGL</p>",
            description_text="React and WebGL",
            location="Remote",
            work_mode="remote",
            is_internship=True,
            required_skills_json=json.dumps(["React", "TypeScript", "CSS"]),
            original_url="https://figma.com/careers/fe_1",
            first_seen_at=now,
            last_seen_at=now,
            last_verified_at=now,
            is_stale=False,
            is_active=True,
        )
        listing_be = InternshipListing(
            source_type="greenhouse",
            source_board_or_site="stripe",
            source_job_id="stripe_be_1",
            company_name="Stripe",
            title="Backend Infrastructure Intern",
            description_html="<p>Distributed payment systems</p>",
            description_text="Distributed payment systems",
            location="Remote",
            work_mode="remote",
            is_internship=True,
            required_skills_json=json.dumps(["Go", "PostgreSQL", "Docker"]),
            original_url="https://stripe.com/careers/be_1",
            first_seen_at=now,
            last_seen_at=now,
            last_verified_at=now,
            is_stale=False,
            is_active=True,
        )
        listing_ml = InternshipListing(
            source_type="greenhouse",
            source_board_or_site="datadog",
            source_job_id="datadog_ml_1",
            company_name="Datadog",
            title="Machine Learning Research Intern",
            description_html="<p>Time series forecasting models</p>",
            description_text="Time series forecasting models",
            location="Remote",
            work_mode="remote",
            is_internship=True,
            required_skills_json=json.dumps(["Python", "PyTorch", "Pandas"]),
            original_url="https://datadog.com/careers/ml_1",
            first_seen_at=now,
            last_seen_at=now,
            last_verified_at=now,
            is_stale=False,
            is_active=True,
        )
        db.add_all([listing_fe, listing_be, listing_ml])
        db.commit()
    finally:
        db.close()

    token = create_access_token({"sub": str(uid), "email": "role_filter_user@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test Frontend filter
        resp_fe = await client.get("/api/internships?role_category=frontend", headers=headers)
        assert resp_fe.status_code == 200
        fe_titles = [it["title"] for it in resp_fe.json()["items"]]
        assert "Frontend Engineer Intern" in fe_titles
        assert "Backend Infrastructure Intern" not in fe_titles
        assert "Machine Learning Research Intern" not in fe_titles

        # Test AI/ML filter
        resp_ml = await client.get("/api/internships?role_category=ai_ml_data", headers=headers)
        assert resp_ml.status_code == 200
        ml_titles = [it["title"] for it in resp_ml.json()["items"]]
        assert "Machine Learning Research Intern" in ml_titles
        assert "Frontend Engineer Intern" not in ml_titles

        # Test Employer filter
        resp_emp = await client.get("/api/internships?employer=Figma", headers=headers)
        assert resp_emp.status_code == 200
        emp_companies = [it["company_name"] for it in resp_emp.json()["items"]]
        assert "Figma" in emp_companies
        assert "Stripe" not in emp_companies
        assert "Datadog" not in emp_companies


@pytest.mark.asyncio
async def test_sources_health_taxonomy_and_disabled_indian_platforms():
    """Verify /api/internships/sources surfaces granular health statuses and investigated Indian platforms."""
    db = TestSession()
    try:
        user = User(email="sources_health_user@example.com", is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
        uid = user.id
    finally:
        db.close()

    token = create_access_token({"sub": str(uid), "email": "sources_health_user@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/internships/sources", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "sources" in data
        sources = data["sources"]

        # 1. Health status field exists on all sources
        for src in sources:
            assert "health_status" in src
            assert "provider" in src

        # 2. Investigated Indian platforms are surfaced as disabled_no_authorized_api with official portal URLs
        disabled_sources = [s for s in sources if s.get("health_status") == "disabled_no_authorized_api"]
        disabled_labels = [s["label"].lower() for s in disabled_sources]

        assert any("internshala" in lbl for lbl in disabled_labels)
        assert any("naukri" in lbl for lbl in disabled_labels)
        assert any("unstop" in lbl for lbl in disabled_labels)

        for ds in disabled_sources:
            assert ds["authorized_api_available"] is False
            assert ds["official_portal_url"].startswith("https://")
            assert "api" in ds["status_message"].lower()

