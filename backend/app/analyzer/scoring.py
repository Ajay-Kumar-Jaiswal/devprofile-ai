from typing import List, Tuple
from datetime import datetime, timezone
from app.models import (
    UserProfile,
    RepositoryItem,
    LanguageStat,
    ScoreCategory,
    PortfolioScore,
)


def calculate_portfolio_score(
    profile: UserProfile,
    repos: List[RepositoryItem],
    languages: List[LanguageStat],
) -> PortfolioScore:
    """
    Computes a deterministic, documented 0-100 score based on 5 weighted pillars:
    1. Profile Completeness & Branding (20 pts)
    2. Documentation & Presentation Hygiene (20 pts)
    3. Reach & Community Engagement (20 pts)
    4. Tech Stack Diversity & Depth (20 pts)
    5. Maintenance & Activity Freshness (20 pts)
    """
    categories: List[ScoreCategory] = []

    # 1. Profile Completeness & Branding (Max 20)
    p_score = 0
    p_feedback = []

    if profile.name and profile.name.strip():
        p_score += 4
    else:
        p_feedback.append("Add a full display name to make your profile human-readable.")

    if profile.bio and len(profile.bio.strip()) >= 10:
        p_score += 4
    else:
        p_feedback.append("Craft a concise bio highlighting your core domains or interests.")

    if profile.avatar_url and "identicon" not in profile.avatar_url:
        p_score += 3

    if profile.location and profile.location.strip():
        p_score += 3
    else:
        p_feedback.append("Specify a location or timezone for recruiters.")

    if (profile.blog and profile.blog.strip()) or (profile.company and profile.company.strip()):
        p_score += 4
    else:
        p_feedback.append("Link your portfolio website, LinkedIn, or current affiliation.")

    if profile.account_age_years is not None and profile.account_age_years >= 0.5:
        p_score += 2
    elif profile.account_age_years is not None:
        p_score += 1

    p_score = min(20, p_score)
    categories.append(
        ScoreCategory(
            category="Profile Completeness",
            score=p_score,
            max_score=20,
            percentage=round((p_score / 20) * 100, 1),
            status=_score_status(p_score, 20),
            feedback="; ".join(p_feedback) if p_feedback else "Profile metadata is well-populated.",
        )
    )

    # 2. Documentation & Presentation Hygiene (Max 20)
    d_score = 0
    d_feedback = []
    original_repos = [r for r in repos if not r.is_fork]
    eval_repos = original_repos if original_repos else repos
    total_eval = len(eval_repos)

    if total_eval > 0:
        repos_with_desc = sum(1 for r in eval_repos if r.has_description)
        desc_ratio = repos_with_desc / total_eval
        if desc_ratio >= 0.8:
            d_score += 8
        elif desc_ratio >= 0.5:
            d_score += 5
            d_feedback.append("Several repositories lack summary descriptions.")
        elif desc_ratio >= 0.2:
            d_score += 2
            d_feedback.append("Most repositories lack descriptions explaining their purpose.")
        else:
            d_feedback.append("Add clear descriptions and live demo links to your repositories.")

        repos_with_topics = sum(1 for r in eval_repos if r.has_topics)
        topic_ratio = repos_with_topics / total_eval
        if topic_ratio >= 0.5:
            d_score += 6
        elif topic_ratio >= 0.2:
            d_score += 3
            d_feedback.append("Tag more repositories with descriptive GitHub topics.")
        else:
            d_feedback.append("Tag projects with relevant tech stack topics (e.g. react, fastapi, docker).")

        repos_with_license = sum(1 for r in eval_repos if r.has_license)
        license_ratio = repos_with_license / total_eval
        if license_ratio >= 0.5:
            d_score += 6
        elif license_ratio >= 0.2:
            d_score += 3
            d_feedback.append("Consider adding MIT or Apache 2.0 open source licenses to showcase projects.")
        else:
            d_feedback.append("Add open source licenses (e.g. MIT) to invite collaboration and show professional polish.")
    else:
        d_feedback.append("No public repositories found to evaluate documentation.")

    d_score = min(20, d_score)
    categories.append(
        ScoreCategory(
            category="Documentation Hygiene",
            score=d_score,
            max_score=20,
            percentage=round((d_score / 20) * 100, 1),
            status=_score_status(d_score, 20),
            feedback="; ".join(d_feedback) if d_feedback else "Strong documentation hygiene across repositories.",
        )
    )

    # 3. Reach & Community Engagement (Max 20)
    r_score = 0
    r_feedback = []
    total_stars = sum(r.stargazers_count for r in repos)
    total_forks = sum(r.forks_count for r in repos)

    # Stars (Max 8)
    if total_stars >= 50:
        r_score += 8
    elif total_stars >= 20:
        r_score += 6
    elif total_stars >= 5:
        r_score += 4
    elif total_stars >= 1:
        r_score += 2
    else:
        r_feedback.append("Build projects targeting real pain points or share your work in dev communities to earn initial stars.")

    # Forks (Max 6)
    if total_forks >= 10:
        r_score += 6
    elif total_forks >= 3:
        r_score += 4
    elif total_forks >= 1:
        r_score += 2

    # Followers (Max 6)
    if profile.followers >= 25:
        r_score += 6
    elif profile.followers >= 10:
        r_score += 4
    elif profile.followers >= 2:
        r_score += 2
    else:
        r_feedback.append("Engage in open source discussions or write technical blogs to build followers.")

    r_score = min(20, r_score)
    categories.append(
        ScoreCategory(
            category="Reach & Engagement",
            score=r_score,
            max_score=20,
            percentage=round((r_score / 20) * 100, 1),
            status=_score_status(r_score, 20),
            feedback="; ".join(r_feedback) if r_feedback else "Solid community reach and peer recognition.",
        )
    )

    # 4. Tech Stack Diversity & Depth (Max 20)
    t_score = 0
    t_feedback = []
    lang_count = len(languages)

    if lang_count >= 5:
        t_score += 8
    elif lang_count >= 3:
        t_score += 6
    elif lang_count >= 2:
        t_score += 4
    elif lang_count >= 1:
        t_score += 2
    else:
        t_feedback.append("Ensure repositories contain recognized programming languages.")

    # Has strong primary language (> 30% of repos)
    if languages and languages[0].percentage >= 30.0:
        t_score += 6
    elif languages:
        t_score += 3
        t_feedback.append("Establish a distinct primary specialization while maintaining versatility.")

    # Depth in primary language
    primary_lang = languages[0].language if languages else None
    if primary_lang:
        primary_repos_count = sum(1 for r in repos if r.language == primary_lang)
        if primary_repos_count >= 3:
            t_score += 6
        elif primary_repos_count >= 1:
            t_score += 3
    else:
        t_feedback.append("Develop multi-repository depth in a primary framework or language.")

    t_score = min(20, t_score)
    categories.append(
        ScoreCategory(
            category="Tech Stack Depth",
            score=t_score,
            max_score=20,
            percentage=round((t_score / 20) * 100, 1),
            status=_score_status(t_score, 20),
            feedback="; ".join(t_feedback) if t_feedback else "Healthy balance of core specialization and tech versatility.",
        )
    )

    # 5. Maintenance & Activity Freshness (Max 20)
    m_score = 0
    m_feedback = []

    # Check recent pushes across all repos
    recent_push_days = [r.days_since_last_push for r in repos if r.days_since_last_push is not None]
    min_days = min(recent_push_days) if recent_push_days else 999

    if min_days <= 30:
        m_score += 8
    elif min_days <= 90:
        m_score += 6
    elif min_days <= 180:
        m_score += 4
        m_feedback.append("Last repository push was over 3 months ago; keep an active commit cadence.")
    else:
        m_feedback.append("No repository activity within the last 6 months. Maintain recent active commits.")

    # Original repos ratio vs forks
    if len(original_repos) >= 3:
        m_score += 6
    elif len(original_repos) >= 1:
        m_score += 3
        m_feedback.append("Create more original standalone projects rather than relying on forks.")
    else:
        m_feedback.append("Publish original project code rather than only forking third-party repos.")

    # Active repository maintenance / open issues balance
    total_issues = sum(r.open_issues_count for r in repos)
    if len(repos) > 0 and (total_issues / len(repos)) <= 10:
        m_score += 6
    else:
        m_score += 3

    m_score = min(20, m_score)
    categories.append(
        ScoreCategory(
            category="Maintenance & Freshness",
            score=m_score,
            max_score=20,
            percentage=round((m_score / 20) * 100, 1),
            status=_score_status(m_score, 20),
            feedback="; ".join(m_feedback) if m_feedback else "Recent activity demonstrates ongoing learning and code hygiene.",
        )
    )

    # Compute total score
    overall_score = sum(cat.score for cat in categories)
    overall_score = max(0, min(100, overall_score))

    if overall_score >= 85:
        tier = "Exceptional"
        summary = "Outstanding GitHub presence with high-quality repositories, strong documentation, and regular activity."
    elif overall_score >= 70:
        tier = "Strong"
        summary = "Competitive developer portfolio with clear strengths in tech stack and repository structure."
    elif overall_score >= 50:
        tier = "Competitive"
        summary = "Solid baseline with good projects, but would benefit from improved READMEs, descriptions, and consistent commits."
    elif overall_score >= 30:
        tier = "Developing"
        summary = "Early-stage portfolio. Key presentation gaps in bio, descriptions, and licenses are holding your profile back."
    else:
        tier = "Needs Work"
        summary = "Critical portfolio elements missing. Focus on setting up descriptions, READMEs, and original repositories."

    return PortfolioScore(
        overall_score=overall_score,
        tier=tier,
        summary=summary,
        breakdown=categories,
    )


def _score_status(score: int, max_score: int) -> str:
    pct = (score / max_score) * 100
    if pct >= 80:
        return "excellent"
    if pct >= 60:
        return "good"
    if pct >= 40:
        return "average"
    return "poor"
