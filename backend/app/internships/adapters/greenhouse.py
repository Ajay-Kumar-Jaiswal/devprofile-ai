import html
import logging
from datetime import datetime
from typing import List, Optional
import httpx
from app.internships.adapters.base import BaseJobSourceAdapter, RawListing
from app.internships.sanitizer import parse_datetime_flexible

logger = logging.getLogger("devprofile_ai.internships.greenhouse")


class GreenhouseJobBoardAdapter(BaseJobSourceAdapter):
    """
    Adapter for the official public Greenhouse Job Board API.
    Fetches published vacancies for configured employer board tokens.
    Endpoint: https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
    """

    BASE_URL = "https://boards-api.greenhouse.io/v1/boards"

    @property
    def provider_name(self) -> str:
        return "greenhouse"

    async def fetch_listings(
        self,
        board_token: str,
        client: httpx.AsyncClient,
    ) -> List[RawListing]:
        clean_token = board_token.strip().lower()
        if not clean_token:
            return []

        url = f"{self.BASE_URL}/{clean_token}/jobs?content=true"
        try:
            resp = await client.get(
                url,
                headers={"Accept": "application/json", "User-Agent": "DevProfile-AI-Internships/2.0"},
            )
            if resp.status_code == 404:
                logger.warning(f"Greenhouse board '{clean_token}' not found (HTTP 404).")
                return []
            if resp.status_code == 429:
                logger.warning(f"Rate limited by Greenhouse API for board '{clean_token}' (HTTP 429).")
                return []
            if resp.status_code != 200:
                logger.warning(
                    f"Greenhouse API returned HTTP {resp.status_code} for board '{clean_token}': {resp.text[:200]}"
                )
                return []

            data = resp.json()
            jobs_raw = data.get("jobs", [])
            listings: List[RawListing] = []

            company_display = clean_token.replace("-", " ").replace("_", " ").title()

            for job in jobs_raw:
                job_id = str(job.get("id") or "").strip()
                title = str(job.get("title") or "").strip()
                if not job_id or not title:
                    continue

                # Parse location
                loc_obj = job.get("location") or {}
                location_name = loc_obj.get("name") if isinstance(loc_obj, dict) else str(loc_obj)

                # Determine work mode explicitly if stated
                work_mode = "unspecified"
                loc_lower = (location_name or "").lower()
                title_lower = title.lower()
                if "remote" in loc_lower or "remote" in title_lower:
                    work_mode = "remote"
                elif "hybrid" in loc_lower or "hybrid" in title_lower:
                    work_mode = "hybrid"
                elif location_name and location_name.strip():
                    work_mode = "onsite"

                # Description HTML (unescape HTML entities if encoded)
                raw_content = job.get("content") or ""
                description_html = html.unescape(raw_content)

                # Timestamps
                updated_at_source = parse_datetime_flexible(job.get("updated_at"))

                absolute_url = str(job.get("absolute_url") or f"https://boards.greenhouse.io/{clean_token}/jobs/{job_id}")
                # Direct application anchor on Greenhouse boards
                application_url = f"{absolute_url}#app" if "#" not in absolute_url else absolute_url

                listings.append(
                    RawListing(
                        source_type="greenhouse",
                        source_board_or_site=clean_token,
                        source_job_id=job_id,
                        company_name=company_display,
                        title=title,
                        description_html=description_html,
                        location=location_name or None,
                        work_mode=work_mode,
                        original_url=absolute_url,
                        application_url=application_url,
                        updated_at_source=updated_at_source,
                        published_at=updated_at_source,
                        raw_metadata={"departments": job.get("departments"), "offices": job.get("offices")},
                    )
                )

            logger.info(f"Greenhouse board '{clean_token}' returned {len(listings)} active postings.")
            return listings

        except httpx.TimeoutException:
            logger.warning(f"Timeout connecting to Greenhouse API for board '{clean_token}'.")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching Greenhouse board '{clean_token}': {e}", exc_info=True)
            return []
