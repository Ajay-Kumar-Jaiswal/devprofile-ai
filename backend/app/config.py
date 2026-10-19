import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Explicitly load .env from backend directory or parent directories
_current_dir = Path(__file__).resolve().parent
_backend_dir = _current_dir.parent
_env_candidates = [
    _backend_dir / ".env",
    _current_dir / ".env",
    Path.cwd() / "backend" / ".env",
    Path.cwd() / ".env",
]

for _env_file in _env_candidates:
    if _env_file.exists():
        load_dotenv(dotenv_path=_env_file, override=False)
        break


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # GitHub API Configuration
    GITHUB_TOKEN: Optional[str] = None
    GITHUB_API_BASE_URL: str = "https://api.github.com"
    REQUEST_TIMEOUT_SECONDS: float = 12.0
    MAX_REPOS_TO_ANALYZE: int = 100
    GITHUB_CACHE_TTL_SECONDS: int = 300  # 5-minute in-memory cache to avoid redundant calls

    # Groq AI Configuration
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    AI_REQUEST_TIMEOUT_SECONDS: float = 25.0

    # Database Configuration
    DATABASE_URL: str = "sqlite:///./devprofile.db"

    # Authentication & Security Configuration
    SECRET_KEY: str = "devprofile-insecure-development-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    COOKIE_SECURE: bool = False  # Set True in production over HTTPS
    COOKIE_SAMESITE: str = "lax"

    # GitHub OAuth Configuration
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    GITHUB_CALLBACK_URL: Optional[str] = None
    GITHUB_REDIRECT_URI: Optional[str] = "http://localhost:5173/auth/callback"

    @property
    def github_callback_url(self) -> str:
        """Retrieves configured callback URL with fallback."""
        return self.GITHUB_CALLBACK_URL or self.GITHUB_REDIRECT_URI or "http://localhost:5173/auth/callback"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
