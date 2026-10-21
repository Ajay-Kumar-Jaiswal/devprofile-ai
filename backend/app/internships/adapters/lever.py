import logging
from datetime import datetime, timezone
from typing import List, Optional
import httpx

from app.internships.adapters.base import BaseJobSourceAdapter, RawListing

logger = logging.getLogger("devprofile_ai.internships.lever")


class LeverPostingsAdapter(BaseJobSourceAdapter):
    """
    Adapter for the official public Lever Postings API.
    Endpoint: https://api.lever.co/v0/postings/{site}?mode=json
    """

    BASE_URL = "https://api.lever.co/v0/postings"

    @property
    def provider_name(self) -> str:
        return "lever"

    async def fetch_listings(
        self,
        site_identifier: str,
        client: httpx.AsyncClient,
    ) -> List[RawListing]:
        clean_site = site_identifier.strip().lower()
        if not clean_site:
            return []

        url = f"{self.BASE_URL}/{clean_site}?mode=json"
        try:
            resp = await client.get(
                url,
                headers={"Accept": "application/json", "User-Agent": "DevProfile-AI-Internships/2.0"},
            )
            if resp.status_code == 404:
                logger.warning(f"Lever employer site '{clean_site}' not found (HTTP 404).")
                return []
            if resp.status_code == 429:
                logger.warning(f"Rate limited by Lever API for site '{clean_site}' (HTTP 429).")
                return []
            if resp.status_code != 200:
                logger.warning(
                    f"Lever API returned HTTP {resp.status_code} for site '{clean_site}': {resp.text[:200]}"
                )
                return []

            data = resp.json()
            if not isinstance(data, list):
                logger.warning(f"Lever API returned non-list JSON for site '{clean_site}'.")
                return []

            company_display = clean_site.replace("-", " ").replace("_", " ").title()
            listings: List[RawListing] = []

            for job in data:
                job_id = str(job.get("id") or "").strip()
                title = str(job.get("text") or "").strip()
                if not job_id or not title:
                    continue

                categories = job.get("categories") or {}
                location_name = categories.get("location") if isinstance(categories, dict) else None

                # Workplace / Work Mode
                work_mode = "unspecified"
                raw_workplace = str(job.get("workplaceType") or "").lower()
                if raw_workplace in ("remote", "hybrid", "on-site", "onsite"):
                    work_mode = "onsite" if raw_workplace in ("on-site", "onsite") else raw_workplace
                else:
                    loc_lower = (location_name or "").lower()
                    title_lower = title.lower()
                    if "remote" in loc_lower or "remote" in title_lower:
                        work_mode = "remote"
                    elif "hybrid" in loc_lower or "hybrid" in title_lower:
                        work_mode = "hybrid"
                    elif location_name and location_name.strip():
                        work_mode = "onsite"

                # URLs
                hosted_url = str(job.get("hostedUrl") or f"https://jobs.lever.co/{clean_site}/{job_id}")
                apply_url = str(job.get("applyUrl") or f"{hosted_url}/apply")

                # Description HTML
                description_html = job.get("description") or job.get("descriptionPlain") or ""

                # Timestamps (milliseconds epoch)
                published_at: Optional[datetime] = None
                created_epoch = job.get("createdAt")
                if isinstance(created_epoch, (int, float)) and created_epoch > 0:
                    try:
                        published_at = datetime.fromtimestamp(created_epoch / 1000.0, tz=timezone.utc)
                    except Exception:
                        pass

                updated_at_source: Optional[datetime] = None
                updated_epoch = job.get("updatedAt")
                if isinstance(updated_epoch, (int, float)) and updated_epoch > 0:
                    try:
                        updated_at_source = datetime.fromtimestamp(updated_epoch / 1000.0, tz=timezone.utc)
                    except Exception:
                        pass

                # Salary range (ONLY when explicitly provided by upstream Lever payload)
                salary_currency = None
                salary_min = None
                salary_max = None
                salary_interval = None
                sal_range = job.get("salaryRange")
                if isinstance(sal_range, dict):
                    salary_currency = sal_range.get("currency")
                    salary_min = float(sal_range.get("min")) if sal_range.get("min") is not None else None
                    salary_max = float(sal_range.get("max")) if sal_range.get("max") is not None else None
                    salary_interval = str(sal_range.get("interval") or "").replace("per-", "").replace("-exact", "") or None

                listings.append(
                    RawListing(
                        source_type="lever",
                        source_board_or_site=clean_site,
                        source_job_id=job_id,
                        company_name=company_display,
                        title=title,
                        description_html=description_html,
                        location=location_name or None,
                        work_mode=work_mode,
                        original_url=hosted_url,
                        application_url=apply_url,
                        published_at=published_at,
                        updated_at_source=updated_at_source or published_at,
                        salary_currency=salary_currency,
                        salary_min=salary_min,
                        salary_max=salary_max,
                        salary_interval=salary_interval,
                        raw_metadata={
                            "categories": categories,
                            "commitment": categories.get("commitment") if isinstance(categories, dict) else None,
                        },
                    )
                )

            logger.info(f"Lever site '{clean_site}' returned {len(listings)} active postings.")
            return listings

        except httpx.TimeoutException:
            logger.warning(f"Timeout connecting to Lever API for site '{clean_site}'.")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching Lever site '{clean_site}': {e}", exc_info=True)
            return []
