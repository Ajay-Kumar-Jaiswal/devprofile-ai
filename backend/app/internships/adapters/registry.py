import logging
from typing import Dict, List, Tuple, Any
import httpx

from app.config import settings
from app.internships.adapters.base import BaseJobSourceAdapter, RawListing
from app.internships.adapters.greenhouse import GreenhouseJobBoardAdapter
from app.internships.adapters.lever import LeverPostingsAdapter
from app.internships.adapters.rss import RssJobFeedAdapter

logger = logging.getLogger("devprofile_ai.internships.registry")


class SourceRegistry:
    """
    Modular registry of job board adapters and configured employer sources.
    Keeps all source configuration safely in backend environment variables.
    """

    def __init__(self):
        self._adapters: Dict[str, BaseJobSourceAdapter] = {
            "greenhouse": GreenhouseJobBoardAdapter(),
            "lever": LeverPostingsAdapter(),
            "rss": RssJobFeedAdapter(),
        }

    def register_adapter(self, adapter: BaseJobSourceAdapter) -> None:
        self._adapters[adapter.provider_name] = adapter

    def get_adapter(self, provider_name: str) -> BaseJobSourceAdapter:
        adapter = self._adapters.get(provider_name.lower())
        if not adapter:
            raise ValueError(f"Unknown job source provider: '{provider_name}'. Supported: {list(self._adapters.keys())}")
        return adapter

    def get_configured_sources(self) -> List[Dict[str, str]]:
        """Returns structured metadata on all currently active configured sources."""
        sources: List[Dict[str, str]] = []

        for board in settings.greenhouse_boards_list:
            sources.append({
                "provider": "greenhouse",
                "identifier": board,
                "label": f"{board.replace('-', ' ').title()} (Greenhouse)",
                "api_endpoint": f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs",
            })

        for site in settings.lever_sites_list:
            sources.append({
                "provider": "lever",
                "identifier": site,
                "label": f"{site.replace('-', ' ').title()} (Lever)",
                "api_endpoint": f"https://api.lever.co/v0/postings/{site}",
            })

        for name, url in settings.rss_feeds_list:
            sources.append({
                "provider": "rss",
                "identifier": f"{name}:{url}",
                "label": f"{name} (RSS/Atom)",
                "api_endpoint": url,
            })

        return sources

    def get_investigated_platforms(self) -> List[Dict[str, Any]]:
        """
        Documented metadata on evaluated Indian internship platforms where official public
        developer APIs are not currently available or require enterprise partnerships.
        """
        return [
            {
                "provider": "internshala",
                "identifier": "internshala",
                "label": "Internshala",
                "api_endpoint": "https://internshala.com/internships/",
                "official_portal_url": "https://internshala.com/internships/",
                "health_status": "disabled_no_authorized_api",
                "status_message": "No official public developer API or open XML/RSS feed available. Automated scraping is strictly prohibited by Terms of Service.",
                "authorized_api_available": False,
                "listings_count": 0,
            },
            {
                "provider": "naukri",
                "identifier": "naukri",
                "label": "Naukri (Info Edge)",
                "api_endpoint": "https://www.naukri.com/internship-jobs",
                "official_portal_url": "https://www.naukri.com/internship-jobs",
                "health_status": "disabled_no_authorized_api",
                "status_message": "Requires enterprise B2B recruiter ATS contract with Info Edge. No public developer search API is provided.",
                "authorized_api_available": False,
                "listings_count": 0,
            },
            {
                "provider": "unstop",
                "identifier": "unstop",
                "label": "Unstop (formerly Dare2Compete)",
                "api_endpoint": "https://unstop.com/internships",
                "official_portal_url": "https://unstop.com/internships",
                "health_status": "disabled_no_authorized_api",
                "status_message": "No official public developer API or syndicated job feed. Proprietary frontend endpoints only.",
                "authorized_api_available": False,
                "listings_count": 0,
            },
        ]

    async def fetch_all_configured(self, client: httpx.AsyncClient) -> List[RawListing]:
        """
        Polls all configured employer sources concurrently using official APIs.
        Fails safely per source so one unreachable employer does not block others.
        """
        all_listings: List[RawListing] = []
        sources = self.get_configured_sources()

        if not sources:
            logger.info("No internship employer boards or feeds are configured.")
            return []

        logger.info(f"Synchronizing internships across {len(sources)} configured employer source(s)...")

        for src in sources:
            provider = src["provider"]
            ident = src["identifier"]
            try:
                adapter = self.get_adapter(provider)
                listings = await adapter.fetch_listings(ident, client)
                all_listings.extend(listings)
            except Exception as e:
                logger.error(f"Failed fetching {provider} source '{ident}': {e}", exc_info=True)

        logger.info(f"Total raw listings fetched across all sources: {len(all_listings)}")
        return all_listings


source_registry = SourceRegistry()
