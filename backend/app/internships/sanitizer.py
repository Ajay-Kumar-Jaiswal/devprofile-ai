import html
import re
import email.utils
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

# Strict regex-based HTML tag sanitizer without heavy external C-extensions
_DANGEROUS_TAGS_RE = re.compile(
    r"<\s*(script|style|iframe|object|embed|applet|form|button|input|meta|link)[^>]*>.*?<\s*/\s*\1\s*>",
    re.IGNORECASE | re.DOTALL,
)
_DANGEROUS_SELF_CLOSING_RE = re.compile(
    r"<\s*(script|style|iframe|object|embed|applet|form|button|input|meta|link)[^>]*/>",
    re.IGNORECASE,
)
_EVENT_HANDLERS_RE = re.compile(r"\s+on[a-zA-Z]+\s*=\s*['\"][^'\"]*['\"]", re.IGNORECASE)
_JAVASCRIPT_URI_RE = re.compile(r"href\s*=\s*['\"]javascript:[^'\"]*['\"]", re.IGNORECASE)

# Plain text stripper
_TAG_STRIP_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


def sanitize_html(raw_html: Optional[str]) -> str:
    """
    Sanitizes HTML description by stripping scripts, event handlers, iframes, and javascript: links.
    Ensures safe rendering in web clients.
    """
    if not raw_html or not raw_html.strip():
        return ""

    content = raw_html

    # Strip dangerous tag blocks
    content = _DANGEROUS_TAGS_RE.sub("", content)
    content = _DANGEROUS_SELF_CLOSING_RE.sub("", content)

    # Strip inline event handlers (onload, onerror, onclick, etc.)
    content = _EVENT_HANDLERS_RE.sub("", content)

    # Strip javascript: URLs
    content = _JAVASCRIPT_URI_RE.sub('href="#"', content)

    # Ensure links have rel="noopener noreferrer" and target="_blank"
    def _fix_links(match):
        tag_str = match.group(0)
        if 'rel="' not in tag_str:
            tag_str = tag_str[:-1] + ' rel="noopener noreferrer">'
        if 'target="' not in tag_str:
            tag_str = tag_str[:-1] + ' target="_blank">'
        return tag_str

    content = re.sub(r"<a\s+[^>]*href=[^>]*>", _fix_links, content, flags=re.IGNORECASE)

    return content.strip()


def strip_html_to_plain_text(raw_html: Optional[str]) -> str:
    """Extracts clean plain text from HTML for searching and skill keyword analysis."""
    if not raw_html:
        return ""

    # Replace breaks and paragraphs with spaces
    text = re.sub(r"<(br|p|div|li)[^>]*>", " ", raw_html, flags=re.IGNORECASE)
    # Strip remaining tags
    text = _TAG_STRIP_RE.sub(" ", text)
    # Unescape HTML entities
    text = html.unescape(text)
    # Normalize whitespace
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text


def validate_web_url(url: Optional[str]) -> Optional[str]:
    """Validates that a URL is a well-formed http or https web address."""
    if not url or not isinstance(url, str):
        return None
    cleaned = url.strip()
    try:
        parsed = urlparse(cleaned)
        if parsed.scheme.lower() in ("http", "https") and parsed.netloc:
            return cleaned
        return None
    except Exception:
        return None


def parse_datetime_flexible(dt_str: Optional[str]) -> Optional[datetime]:
    """
    Parses datetime strings defensively using standard Python library.
    Supports ISO 8601 (Greenhouse/Lever) and RFC 2822 (RSS/Atom pubDate).
    """
    if not dt_str or not isinstance(dt_str, str):
        return None
    s = dt_str.strip()
    if not s:
        return None

    # 1. ISO 8601
    try:
        clean_iso = s.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        pass

    # 2. RFC 2822 / RSS pubDate
    try:
        return email.utils.parsedate_to_datetime(s)
    except Exception:
        pass

    # 3. Fallbacks
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d %b %Y %H:%M:%S %z", "%d %b %Y %H:%M:%S"):
        try:
            dt = datetime.strptime(s, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            continue

    return None
