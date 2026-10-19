import re
from urllib.parse import urlparse
from typing import Optional
from fastapi import HTTPException, status

# GitHub username rules:
# - Max 39 characters
# - Can contain alphanumeric characters or single hyphens
# - Cannot begin or end with a hyphen
# - Cannot contain consecutive hyphens
GITHUB_USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$")

# Reserved GitHub paths / system keywords that are not user profiles
RESERVED_GITHUB_PATHS = {
    "settings",
    "explore",
    "features",
    "topics",
    "trending",
    "collections",
    "events",
    "pricing",
    "security",
    "login",
    "logout",
    "join",
    "search",
    "organizations",
    "orgs",
    "pulls",
    "issues",
    "marketplace",
    "sponsors",
    "notifications",
    "dashboard",
    "about",
    "contact",
}


def normalize_github_input(raw_input: str) -> str:
    """
    Normalizes and validates user input for a GitHub profile handle or URL.

    Accepts:
      - 'octocat'
      - 'https://github.com/octocat'
      - 'https://github.com/octocat/'
      - 'github.com/octocat'
      - 'http://www.github.com/octocat'

    Rejects (raises HTTPException 400):
      - Arbitrary hosts (SSRF prevention, e.g. 'evil.com/octocat')
      - Repository URLs (e.g. 'https://github.com/octocat/my-repo')
      - Reserved system paths (e.g. 'https://github.com/settings')
      - Malformed or invalid usernames
    """
    if not raw_input or not isinstance(raw_input, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub profile username or URL cannot be empty.",
        )

    clean = raw_input.strip()

    # Prepend scheme if string starts with github.com or www.github.com
    lower_clean = clean.lower()
    if lower_clean.startswith("github.com/") or lower_clean.startswith("www.github.com/"):
        clean = "https://" + clean
    elif not lower_clean.startswith("http://") and not lower_clean.startswith("https://"):
        # Could be a direct username, e.g., 'octocat' or with leading @ e.g. '@octocat'
        if clean.startswith("@"):
            clean = clean[1:]

        # If it doesn't contain slashes or dots, treat as direct username
        if "/" not in clean and "." not in clean:
            if not GITHUB_USERNAME_REGEX.match(clean):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"'{clean}' is not a valid GitHub username. Usernames must be 1-39 alphanumeric characters or hyphens.",
                )
            if clean.lower() in RESERVED_GITHUB_PATHS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"'{clean}' is a reserved GitHub system path, not a user profile.",
                )
            return clean

    # Parse as URL
    try:
        parsed = urlparse(clean)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed URL format provided.",
        )

    # Validate scheme and host
    hostname = (parsed.hostname or "").lower()
    if hostname not in ("github.com", "www.github.com"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only official GitHub profile URLs (github.com) are accepted. Received host: '{hostname}'.",
        )

    # Validate path segments
    path_segments = [seg for seg in parsed.path.strip("/").split("/") if seg]

    if len(path_segments) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The provided GitHub URL does not contain a profile username.",
        )

    if len(path_segments) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repository URLs and deep paths are not accepted. Please provide a profile URL (e.g., https://github.com/username).",
        )

    username = path_segments[0]

    # Validate username against rules and reserved keywords
    if not GITHUB_USERNAME_REGEX.match(username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extracted username '{username}' is invalid.",
        )

    if username.lower() in RESERVED_GITHUB_PATHS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{username}' is a reserved GitHub system keyword, not a user profile.",
        )

    return username
