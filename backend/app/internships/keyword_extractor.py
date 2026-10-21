import re
from typing import List, Set, Tuple

# Technical skills catalog with word boundary patterns
TECH_SKILLS_MAP = {
    # Programming Languages
    "Python": [r"\bpython\b", r"\bpy\b"],
    "TypeScript": [r"\btypescript\b", r"\bts\b"],
    "JavaScript": [r"\bjavascript\b", r"\bjs\b", r"\bes6\b"],
    "Go": [r"\bgolang\b", r"\bgo\s+language\b", r"\bgo\b"],
    "Java": [r"\bjava\b(?!script)"],
    "C++": [r"\bc\+\+\b", r"\bcpp\b"],
    "C#": [r"\bc#\b", r"\bcsharp\b", r"\b\.net\b"],
    "Rust": [r"\brust\b"],
    "Ruby": [r"\bruby\b", r"\brails\b"],
    "Swift": [r"\bswift\b"],
    "Kotlin": [r"\bkotlin\b"],
    "SQL": [r"\bsql\b", r"\bpostgres\b", r"\bpostgresql\b", r"\bmysql\b"],
    "HTML/CSS": [r"\bhtml5?\b", r"\bcss3?\b", r"\btailwind\b"],

    # Frontend Frameworks & Libraries
    "React": [r"\breact\b", r"\breactjs\b", r"\breact\.js\b"],
    "Next.js": [r"\bnext\.?js\b"],
    "Vue.js": [r"\bvue\b", r"\bvue\.?js\b"],
    "Angular": [r"\bangular\b"],
    "TailwindCSS": [r"\btailwind\b", r"\btailwindcss\b"],

    # Backend Frameworks
    "FastAPI": [r"\bfastapi\b"],
    "Django": [r"\bdjango\b"],
    "Flask": [r"\bflask\b"],
    "Node.js": [r"\bnode\b", r"\bnode\.?js\b", r"\bexpress\.?js\b"],
    "Spring Boot": [r"\bspring\s*boot\b", r"\bspring\s*framework\b"],

    # Databases & Storage
    "PostgreSQL": [r"\bpostgresql\b", r"\bpostgres\b"],
    "MySQL": [r"\bmysql\b"],
    "MongoDB": [r"\bmongodb\b", r"\bmongo\b"],
    "Redis": [r"\bredis\b"],
    "SQLite": [r"\bsqlite\b"],
    "GraphQL": [r"\bgraphql\b"],

    # DevOps, Cloud & Infrastructure
    "Docker": [r"\bdocker\b", r"\bcontainer(s|ization)?\b"],
    "Kubernetes": [r"\bkubernetes\b", r"\bk8s\b"],
    "AWS": [r"\baws\b", r"\bamazon\s+web\s+services\b"],
    "Google Cloud": [r"\bgcp\b", r"\bgoogle\s+cloud\b"],
    "Azure": [r"\bazure\b"],
    "Git": [r"\bgit\b", r"\bgithub\b", r"\bgitlab\b"],
    "CI/CD": [r"\bci[/-]cd\b", r"\bgithub\s*actions\b", r"\bjenkins\b"],
    "Linux": [r"\blinux\b", r"\bunix\b", r"\bbash\b"],

    # Data Science, AI & ML
    "Machine Learning": [r"\bmachine\s+learning\b", r"\bml\b", r"\bdeep\s+learning\b"],
    "PyTorch": [r"\bpytorch\b"],
    "TensorFlow": [r"\btensorflow\b"],
    "Pandas": [r"\bpandas\b"],
    "NumPy": [r"\bnumpy\b"],
    "Data Analysis": [r"\bdata\s+analysis\b", r"\bdata\s+science\b"],
}

# Precompile regexes
_COMPILED_PATTERNS = {
    skill: [re.compile(p, re.IGNORECASE) for p in patterns]
    for skill, patterns in TECH_SKILLS_MAP.items()
}

# Internship title detection indicators
_INTERN_KEYWORDS = [
    r"\bintern(ship)?s?\b",
    r"\bco-?op\b",
    r"\bapprentice(ship)?\b",
    r"\bfellowship\b",
    r"\bstudent\b",
    r"\bsummer\s+202[4-9]\b",
    r"\bfall\s+202[4-9]\b",
    r"\bspring\s+202[4-9]\b",
    r"\bwinter\s+202[4-9]\b",
    r"\buniversity\s+grad(uate)?\b",
    r"\bnew\s+grad(uate)?\b",
    r"\bentry\s+level\b",
]
_INTERN_RE = re.compile("|".join(_INTERN_KEYWORDS), re.IGNORECASE)


def is_internship_or_early_career(title: str, description_text: str = "", metadata: dict = None) -> bool:
    """
    Determines if a posting is specifically an internship, co-op, or early-career university role.
    """
    if metadata:
        commitment = str(metadata.get("commitment") or "").lower()
        if "intern" in commitment or "co-op" in commitment or "student" in commitment:
            return True

    if _INTERN_RE.search(title):
        return True

    # Check top portion of description
    first_paragraph = description_text[:400]
    if _INTERN_RE.search(first_paragraph):
        return True

    return False


def extract_skills_from_text(text: str) -> List[str]:
    """Scans text for known technical skills and returns a sorted deduplicated list."""
    if not text:
        return []

    found: Set[str] = set()
    for skill, regexes in _COMPILED_PATTERNS.items():
        # Avoid false positive for "Go" as generic verb: requires tech context
        if skill == "Go":
            if any(r.search(text) for r in regexes):
                # Verify tech context
                if re.search(r"\b(golang|backend|c\+\+|python|concurrency|goroutine|microservices)\b", text, re.IGNORECASE):
                    found.add("Go")
            continue

        if any(r.search(text) for r in regexes):
            found.add(skill)

    return sorted(list(found))


def extract_required_and_preferred_skills(description_text: str, title: str = "") -> Tuple[List[str], List[str]]:
    """
    Attempts to separate skills into required vs preferred based on section headings.
    Falls back to common required skills when sections cannot be parsed with certainty.
    """
    all_text = f"{title}\n{description_text}"
    all_skills = extract_skills_from_text(all_text)

    # Detect preferred / nice to have sections
    preferred_markers = [
        "preferred qualifications",
        "nice to have",
        "bonus points",
        "what gives you an edge",
        "plus if you have",
        "preferred skills",
    ]

    lower_text = description_text.lower()
    split_pos = -1
    for marker in preferred_markers:
        idx = lower_text.find(marker)
        if idx != -1:
            split_pos = idx
            break

    if split_pos != -1:
        req_text = description_text[:split_pos]
        pref_text = description_text[split_pos:]
        req_skills = extract_skills_from_text(f"{title}\n{req_text}")
        pref_skills = [s for s in extract_skills_from_text(pref_text) if s not in req_skills]
        return req_skills, pref_skills

    # Default: skills found in title or first section are required, remainder preferred
    title_skills = extract_skills_from_text(title)
    if title_skills:
        req = title_skills
        pref = [s for s in all_skills if s not in req]
        return req, pref

    return all_skills, []
