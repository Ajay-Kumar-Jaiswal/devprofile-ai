import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Optional
import httpx

from app.internships.adapters.base import BaseJobSourceAdapter, RawListing
from app.internships.sanitizer import parse_datetime_flexible

logger = logging.getLogger("devprofile_ai.internships.rss")


class RssJobFeedAdapter(BaseJobSourceAdapter):
    """
    Adapter for official public RSS 2.0 and Atom job feeds.
    Parses feed XML defensively without external entity resolution.
    """

    @property
    def provider_name(self) -> str:
        return "rss"

    async def fetch_listings(
        self,
        feed_config: str,
        client: httpx.AsyncClient,
    ) -> List[RawListing]:
        """
        feed_config can be either a URL or "CompanyName:URL".
        """
        clean_config = feed_config.strip()
        if not clean_config:
            return []

        if ":" in clean_config and not clean_config.startswith("http"):
            company_name, url = clean_config.split(":", 1)
            company_name = company_name.strip()
            url = url.strip()
        else:
            url = clean_config
            company_name = "Official Feed"

        try:
            resp = await client.get(
                url,
                headers={"Accept": "application/rss+xml, application/atom+xml, text/xml", "User-Agent": "DevProfile-AI-Internships/2.0"},
            )
            if resp.status_code != 200:
                logger.warning(f"RSS feed '{url}' returned HTTP {resp.status_code}")
                return []

            # Safe parsing
            parser = ET.XMLParser()
            root = ET.fromstring(resp.content, parser=parser)

            # Detect RSS vs Atom
            tag = root.tag.lower()
            if "rss" in tag or root.find("channel") is not None:
                return self._parse_rss2(root, company_name, url)
            elif "feed" in tag:
                return self._parse_atom(root, company_name, url)
            else:
                # Try finding channel anyway
                channel = root.find("channel")
                if channel is not None:
                    return self._parse_rss2(root, company_name, url)
                logger.warning(f"Unrecognized feed root element '{root.tag}' for '{url}'.")
                return []

        except httpx.TimeoutException:
            logger.warning(f"Timeout fetching RSS feed '{url}'.")
            return []
        except Exception as e:
            logger.error(f"Error parsing RSS/Atom feed '{url}': {e}", exc_info=True)
            return []

    def _parse_rss2(self, root: ET.Element, company_default: str, feed_url: str) -> List[RawListing]:
        channel = root.find("channel")
        if channel is None:
            return []

        feed_title = channel.findtext("title")
        company_name = company_default if company_default != "Official Feed" else (feed_title or "Job Feed")

        listings: List[RawListing] = []
        for item in channel.findall("item"):
            title = item.findtext("title") or ""
            link = item.findtext("link") or ""
            guid = item.findtext("guid") or link
            description = item.findtext("description") or ""
            pub_date_str = item.findtext("pubDate")

            if not title or not (link or guid):
                continue

            published_at = parse_datetime_flexible(pub_date_str)

            work_mode = "unspecified"
            tl = title.lower() + " " + description.lower()
            if "remote" in tl:
                work_mode = "remote"
            elif "hybrid" in tl:
                work_mode = "hybrid"

            listings.append(
                RawListing(
                    source_type="rss",
                    source_board_or_site=company_name.lower().replace(" ", "-"),
                    source_job_id=guid.strip(),
                    company_name=company_name,
                    title=title.strip(),
                    description_html=description,
                    location=None,
                    work_mode=work_mode,
                    original_url=link.strip(),
                    application_url=link.strip(),
                    published_at=published_at,
                    updated_at_source=published_at,
                )
            )
        return listings

    def _parse_atom(self, root: ET.Element, company_default: str, feed_url: str) -> List[RawListing]:
        # Atom namespaces usually {http://www.w3.org/2005/Atom}
        ns = {"atom": "http://www.w3.org/2005/Atom"}

        feed_title = root.findtext("atom:title", namespaces=ns) or root.findtext("title")
        company_name = company_default if company_default != "Official Feed" else (feed_title or "Atom Feed")

        listings: List[RawListing] = []
        entries = root.findall("atom:entry", namespaces=ns) or root.findall("entry")

        for entry in entries:
            title = entry.findtext("atom:title", namespaces=ns) or entry.findtext("title") or ""
            entry_id = entry.findtext("atom:id", namespaces=ns) or entry.findtext("id") or ""

            # Link
            link = ""
            for l_elem in (entry.findall("atom:link", namespaces=ns) or entry.findall("link")):
                href = l_elem.get("href")
                rel = l_elem.get("rel", "alternate")
                if href and rel in ("alternate", ""):
                    link = href
                    break
            if not link:
                link = entry_id

            if not title or not link:
                continue

            content = (
                entry.findtext("atom:content", namespaces=ns)
                or entry.findtext("atom:summary", namespaces=ns)
                or entry.findtext("content")
                or entry.findtext("summary")
                or ""
            )

            updated_str = (
                entry.findtext("atom:updated", namespaces=ns)
                or entry.findtext("atom:published", namespaces=ns)
                or entry.findtext("updated")
                or entry.findtext("published")
            )
            published_at = parse_datetime_flexible(updated_str)

            work_mode = "unspecified"
            tl = title.lower() + " " + content.lower()
            if "remote" in tl:
                work_mode = "remote"
            elif "hybrid" in tl:
                work_mode = "hybrid"

            listings.append(
                RawListing(
                    source_type="rss",
                    source_board_or_site=company_name.lower().replace(" ", "-"),
                    source_job_id=entry_id.strip() or link.strip(),
                    company_name=company_name,
                    title=title.strip(),
                    description_html=content,
                    location=None,
                    work_mode=work_mode,
                    original_url=link.strip(),
                    application_url=link.strip(),
                    published_at=published_at,
                    updated_at_source=published_at,
                )
            )
        return listings
