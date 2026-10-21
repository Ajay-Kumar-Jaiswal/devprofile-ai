from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List
import httpx


@dataclass
class RawListing:
    """Represents a job listing parsed directly from an official provider API."""
    source_type: str                     # "greenhouse" | "lever" | "rss"
    source_board_or_site: str            # e.g. "cloudflare" or "spotify"
    source_job_id: str                   # Upstream ID (e.g. "1234567")
    company_name: str
    title: str
    description_html: str
    location: Optional[str] = None
    work_mode: str = "unspecified"        # "remote" | "hybrid" | "onsite" | "unspecified"
    original_url: str = ""
    application_url: Optional[str] = None
    published_at: Optional[datetime] = None
    updated_at_source: Optional[datetime] = None
    salary_currency: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_interval: Optional[str] = None
    duration: Optional[str] = None
    deadline: Optional[datetime] = None
    raw_metadata: Dict[str, Any] = field(default_factory=dict)


class BaseJobSourceAdapter(ABC):
    """Abstract interface for permitted job source adapters."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g. 'greenhouse', 'lever', 'rss')."""
        pass

    @abstractmethod
    async def fetch_listings(
        self,
        identifier: str,
        client: httpx.AsyncClient,
    ) -> List[RawListing]:
        """
        Fetches job postings for a specific employer board token or site identifier.
        Must handle errors gracefully and never raise unhandled exceptions.
        """
        pass
