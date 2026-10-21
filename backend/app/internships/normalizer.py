from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
import json

from app.internships.adapters.base import RawListing
from app.internships.keyword_extractor import (
    extract_required_and_preferred_skills,
    is_internship_or_early_career,
)
from app.internships.sanitizer import (
    sanitize_html,
    strip_html_to_plain_text,
    validate_web_url,
)


@dataclass
class NormalizedListing:
    """Normalized, sanitized, and validated representation of an internship listing."""
    source_type: str
    source_board_or_site: str
    source_job_id: str
    company_name: str
    title: str
    description_html: str
    description_text: str
    location: Optional[str]
    work_mode: str
    is_internship: bool
    required_skills: List[str]
    preferred_skills: List[str]
    original_url: str
    application_url: Optional[str]
    salary_currency: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_interval: Optional[str] = None
    duration: Optional[str] = None
    deadline: Optional[datetime] = None
    published_at: Optional[datetime] = None
    updated_at_source: Optional[datetime] = None


def normalize_raw_listing(raw: RawListing) -> Optional[NormalizedListing]:
    """
    Normalizes, sanitizes, and enriches a raw job listing from any permitted provider.
    Returns None if essential identifiers or URLs are invalid.
    """
    clean_title = (raw.title or "").strip()
    clean_company = (raw.company_name or "").strip()
    clean_job_id = (raw.source_job_id or "").strip()

    if not clean_title or not clean_company or not clean_job_id:
        return None

    # Validate URLs
    valid_original = validate_web_url(raw.original_url)
    if not valid_original:
        # Construct fallback URL based on provider if possible
        if raw.source_type == "greenhouse":
            valid_original = f"https://boards.greenhouse.io/{raw.source_board_or_site}/jobs/{clean_job_id}"
        elif raw.source_type == "lever":
            valid_original = f"https://jobs.lever.co/{raw.source_board_or_site}/{clean_job_id}"
        else:
            return None

    valid_apply = validate_web_url(raw.application_url) or valid_original

    # Sanitize HTML description
    sanitized_html = sanitize_html(raw.description_html)
    plain_text = strip_html_to_plain_text(sanitized_html)

    # Detect if role is an internship/student role
    is_intern = is_internship_or_early_career(clean_title, plain_text, raw.raw_metadata)

    # Extract required & preferred technical skills
    req_skills, pref_skills = extract_required_and_preferred_skills(plain_text, clean_title)

    # Work mode normalization
    wm = (raw.work_mode or "unspecified").lower()
    if wm not in ("remote", "hybrid", "onsite", "unspecified"):
        wm = "unspecified"

    return NormalizedListing(
        source_type=raw.source_type.lower(),
        source_board_or_site=raw.source_board_or_site.lower(),
        source_job_id=clean_job_id,
        company_name=clean_company,
        title=clean_title,
        description_html=sanitized_html,
        description_text=plain_text,
        location=raw.location.strip() if raw.location else None,
        work_mode=wm,
        is_internship=is_intern,
        required_skills=req_skills,
        preferred_skills=pref_skills,
        original_url=valid_original,
        application_url=valid_apply,
        salary_currency=raw.salary_currency,
        salary_min=raw.salary_min,
        salary_max=raw.salary_max,
        salary_interval=raw.salary_interval,
        duration=raw.duration,
        deadline=raw.deadline,
        published_at=raw.published_at,
        updated_at_source=raw.updated_at_source,
    )
