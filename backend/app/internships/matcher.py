import json
import logging
from typing import Dict, List, Optional, Set, Tuple, Any
from app.db_models import AnalysisRun, InternshipListing
from app.internships.keyword_extractor import extract_skills_from_text

logger = logging.getLogger("devprofile_ai.internships.matcher")


class CandidateSkillsProfile:
    """Represents candidate technical skills demonstrated in their GitHub analysis."""

    def __init__(self, run: Optional[AnalysisRun]):
        self.username = run.analyzed_login if run else "developer"
        self.overall_score = run.overall_score if run else 60
        self.score_tier = run.score_tier if run else "Competent"
        self.primary_language = run.primary_language if run else None

        self.languages: Dict[str, float] = {}  # language -> percentage
        self.demonstrated_skills: Set[str] = set()
        self.repository_names: List[str] = []

        if run:
            self._extract_from_run(run)

    def _extract_from_run(self, run: AnalysisRun):
        # 1. Languages
        try:
            langs = json.loads(run.languages_json or "[]")
            for l in langs:
                lang_name = l.get("language")
                pct = float(l.get("percentage") or 0.0)
                if lang_name:
                    self.languages[lang_name] = pct
                    self.demonstrated_skills.add(lang_name)
                    # Common aliases/stacks
                    if lang_name in ("TypeScript", "JavaScript"):
                        self.demonstrated_skills.add("JavaScript")
                        self.demonstrated_skills.add("HTML/CSS")
                    if lang_name == "Python":
                        self.demonstrated_skills.add("Python")
        except Exception as e:
            logger.warning(f"Error parsing languages_json: {e}")

        # 2. Repositories, topics, and descriptions
        try:
            repos = json.loads(run.repositories_json or "[]")
            all_text_fragments = []
            for r in repos:
                name = r.get("name", "")
                self.repository_names.append(name)
                desc = r.get("description", "") or ""
                topics = r.get("topics", []) or []
                all_text_fragments.append(f"{name} {desc} {' '.join(topics)}")

            corpus = " ".join(all_text_fragments)
            extracted = extract_skills_from_text(corpus)
            for s in extracted:
                self.demonstrated_skills.add(s)

            # Git is demonstrated if candidate has public repositories
            if repos:
                self.demonstrated_skills.add("Git")

        except Exception as e:
            logger.warning(f"Error parsing repositories_json: {e}")

    @property
    def evidence_summary(self) -> str:
        top_langs = sorted(self.languages.items(), key=lambda x: x[1], reverse=True)[:3]
        lang_str = ", ".join(f"{l} ({round(p)}%)" for l, p in top_langs) if top_langs else "Software Engineering"
        return (
            f"Derived from @{self.username}'s public repositories; "
            f"primary stack: {lang_str}; overall portfolio hygiene score: {self.overall_score}/100."
        )


def calculate_match_score(
    listing: InternshipListing,
    candidate: CandidateSkillsProfile,
) -> Dict[str, Any]:
    """
    Transparent, deterministic 4-pillar matching algorithm:
    1. Primary Tech Stack Match (Max 40)
    2. Frameworks & Secondary Tools Overlap (Max 30)
    3. Portfolio Readiness & Hygiene (Max 20)
    4. Domain & Role Alignment (Max 10)
    """
    # Parse listing skills
    req_skills: List[str] = []
    pref_skills: List[str] = []
    try:
        req_skills = json.loads(listing.required_skills_json or "[]")
        pref_skills = json.loads(listing.preferred_skills_json or "[]")
    except Exception:
        pass

    all_listing_skills = set(req_skills + pref_skills)
    if not all_listing_skills:
        # Fallback to extracting skills from description
        all_listing_skills = set(extract_skills_from_text(f"{listing.title} {listing.description_text}"))

    # Matched vs Not Demonstrated
    matched: Set[str] = set()
    not_demonstrated: Set[str] = set()

    for s in all_listing_skills:
        if s in candidate.demonstrated_skills:
            matched.add(s)
        else:
            not_demonstrated.add(s)

    # 1. Tech Stack Match (Max 40)
    c1 = 0.0
    if all_listing_skills:
        req_matched_count = sum(1 for s in req_skills if s in candidate.demonstrated_skills)
        req_total = max(1, len(req_skills))
        c1 += (req_matched_count / req_total) * 30.0

        # Primary language bonus
        if candidate.primary_language and candidate.primary_language in all_listing_skills:
            c1 += 10.0
        elif any(s in candidate.languages for s in all_listing_skills):
            c1 += 6.0
    else:
        # If listing lists no specific tech, grant neutral baseline
        c1 = 25.0
    c1 = min(40.0, c1)

    # 2. Frameworks & Secondary Tools (Max 30)
    c2 = 0.0
    if pref_skills:
        pref_matched_count = sum(1 for s in pref_skills if s in candidate.demonstrated_skills)
        pref_total = max(1, len(pref_skills))
        c2 += (pref_matched_count / pref_total) * 20.0
    else:
        c2 += 15.0

    # General tools bonus (Git, Docker, SQL, CI/CD)
    shared_tools = {"Git", "Docker", "SQL", "CI/CD", "Linux"} & candidate.demonstrated_skills
    c2 += min(10.0, len(shared_tools) * 2.5)
    c2 = min(30.0, c2)

    # 3. Portfolio Readiness & Hygiene (Max 20)
    # Directly grounded in the verified PortfolioScore
    c3 = min(20.0, (candidate.overall_score / 100.0) * 20.0)

    # 4. Domain & Role Alignment (Max 10)
    c4 = 5.0
    title_lower = listing.title.lower()
    if "frontend" in title_lower and any(s in candidate.demonstrated_skills for s in ("React", "TypeScript", "JavaScript", "HTML/CSS")):
        c4 += 5.0
    elif "backend" in title_lower and any(s in candidate.demonstrated_skills for s in ("Python", "Go", "FastAPI", "Django", "SQL")):
        c4 += 5.0
    elif "full" in title_lower and len(candidate.demonstrated_skills) >= 4:
        c4 += 5.0
    elif "intern" in title_lower:
        c4 += 3.0
    c4 = min(10.0, c4)

    total_score = min(100, max(15, round(c1 + c2 + c3 + c4)))

    if total_score >= 75:
        fit_level = "Strong Match"
    elif total_score >= 50:
        fit_level = "Good Match"
    else:
        fit_level = "Potential Fit"

    # Fit reasons based on observed evidence
    fit_reasons: List[str] = []
    if matched:
        fit_reasons.append(f"Demonstrated skills in your repositories match role requirements: {', '.join(sorted(list(matched))[:4])}.")
    if candidate.primary_language and candidate.primary_language in all_listing_skills:
        fit_reasons.append(f"Your primary language ({candidate.primary_language}) is specifically requested for this vacancy.")
    if candidate.overall_score >= 70:
        fit_reasons.append(f"Your strong portfolio score ({candidate.overall_score}/100) signals ready placement hygiene.")
    if not fit_reasons:
        fit_reasons.append("Early-career student opportunity matching general software engineering fundamentals.")

    return {
        "match_score": total_score,
        "fit_level": fit_level,
        "matched_skills": sorted(list(matched)),
        "not_demonstrated_skills": sorted(list(not_demonstrated)),
        "score_breakdown": {
            "tech_stack_score": round(c1),
            "tools_score": round(c2),
            "readiness_score": round(c3),
            "domain_score": round(c4),
        },
        "fit_reasons": fit_reasons,
        "evidence_used": candidate.evidence_summary,
    }


async def generate_optional_ai_explanation(
    listing: InternshipListing,
    match_result: Dict[str, Any],
    candidate: CandidateSkillsProfile,
) -> Optional[str]:
    """
    Optional Groq-powered explanation strictly grounded in job description and portfolio evidence.
    Fails safely and returns None if Groq is unavailable or unconfigured.
    """
    from app.services.ai_service import ai_service
    if not ai_service.is_configured:
        return None

    matched_str = ", ".join(match_result.get("matched_skills", [])) or "foundational programming"
    not_demo_str = ", ".join(match_result.get("not_demonstrated_skills", [])) or "none specified"

    prompt = (
        f"Analyze this internship match objectively in 2 concise sentences without fluff:\n"
        f"Candidate: @{candidate.username}, Top language: {candidate.primary_language or 'General'}, Score: {candidate.overall_score}/100.\n"
        f"Role: {listing.title} at {listing.company_name} ({listing.work_mode}).\n"
        f"Matched skills: {matched_str}.\n"
        f"Skills not demonstrated in GitHub profile: {not_demo_str}.\n"
        f"Explain why this position is a {match_result.get('fit_level')} and suggest 1 targeted project touchpoint."
    )

    try:
        from app.config import settings
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        resp = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a pragmatic technical recruiter. Be factual, concise, and grounded."},
                {"role": "user", "content": prompt},
            ],
            model="llama-3.3-70b-versatile",
            max_tokens=150,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"Groq AI explanation generation skipped: {e}")
        return None
