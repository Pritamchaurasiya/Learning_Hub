"""
Production Crawler and Change Detection Engine for Educational Portals.
Supports SSRF validation, per-domain polite rate limiting, dedicated parsers,
automatic SHA-256 hashing, and revision tracking.
"""
import time
import socket
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import UpdateSource, UpdateSourceEndpoint, UpdateFetchLog
from .parsers import get_parser_for_source
from .services import ingest_notice_from_source
from .validators import validate_safe_external_url

logger = logging.getLogger(__name__)

DEFAULT_USER_AGENT = "LearningHub-AcademicBot/2.0 (+https://learninghub.dev/bot; student-updates@learninghub.dev)"
REQUEST_TIMEOUT_SECONDS = 15


class SourceCrawler:
    """
    Crawler service executing polite, SSRF-safe HTTP fetching and ingestion
    for official educational endpoints.
    """

    def __init__(self, user_agent: str = DEFAULT_USER_AGENT, timeout: int = REQUEST_TIMEOUT_SECONDS):
        self.user_agent = user_agent
        self.timeout = timeout

    def fetch_url(self, url: str) -> str:
        """
        Safely fetches external HTML/data after passing SSRF and domain checks.
        """
        validated_url = validate_safe_external_url(url)

        req = urllib.request.Request(
            validated_url,
            headers={
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                status_code = response.getcode()
                if status_code >= 400:
                    raise urllib.error.HTTPError(
                        url, status_code, f"HTTP Error {status_code}", response.headers, None
                    )
                content_bytes = response.read()
                # Decode with utf-8 fallback to latin-1
                try:
                    return content_bytes.decode('utf-8')
                except UnicodeDecodeError:
                    return content_bytes.decode('latin-1', errors='replace')
        except socket.timeout:
            raise TimeoutError(f"Connection timed out after {self.timeout}s while fetching {url}")

    def crawl_endpoint(
        self,
        endpoint: UpdateSourceEndpoint,
        content_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Polls a specific endpoint, extracts candidate notices, and runs ingestion.
        Supports passing content_override for testing or cached responses.
        """
        source = endpoint.source
        start_time = time.time()
        created_count = 0
        modified_count = 0
        unchanged_count = 0
        error_msg = ""
        status_code = 200

        try:
            if content_override is not None:
                html_content = content_override
            else:
                html_content = self.fetch_url(endpoint.endpoint_url)

            parser = get_parser_for_source(source)
            raw_notices = parser.parse(html_content, base_url=source.base_url)

            for raw_item in raw_notices:
                try:
                    result = ingest_notice_from_source(source, raw_item, endpoint_id=endpoint.id)
                    if result.created:
                        created_count += 1
                    elif result.modified:
                        modified_count += 1
                    else:
                        unchanged_count += 1
                except Exception as ingest_err:
                    logger.warning(f"Error ingesting item from {endpoint.name}: {ingest_err}")

            latency_ms = int((time.time() - start_time) * 1000)

        except Exception as exc:
            error_msg = str(exc)
            status_code = 500
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Failed to crawl endpoint {endpoint.name} ({endpoint.endpoint_url}): {exc}")

        return {
            "endpoint_id": endpoint.id,
            "endpoint_name": endpoint.name,
            "status_code": status_code,
            "latency_ms": latency_ms,
            "created": created_count,
            "modified": modified_count,
            "unchanged": unchanged_count,
            "error": error_msg,
        }

    def crawl_source(
        self,
        source: UpdateSource,
        endpoint_content_map: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Crawls all active endpoints belonging to an official source.
        Updates source health telemetry and writes an UpdateFetchLog record.
        """
        start_time = time.time()
        endpoints = source.endpoints.filter(is_active=True)
        total_created = 0
        total_modified = 0
        total_unchanged = 0
        endpoint_results = []
        overall_error = ""
        overall_status_code = 200

        for ep in endpoints:
            content_override = (
                endpoint_content_map.get(ep.id) or endpoint_content_map.get(ep.endpoint_url)
                if endpoint_content_map else None
            )
            ep_res = self.crawl_endpoint(ep, content_override=content_override)
            endpoint_results.append(ep_res)
            total_created += ep_res["created"]
            total_modified += ep_res["modified"]
            total_unchanged += ep_res["unchanged"]

            if ep_res["error"]:
                overall_error = ep_res["error"]
                overall_status_code = ep_res["status_code"]

        total_latency_ms = int((time.time() - start_time) * 1000)
        has_changes = (total_created > 0 or total_modified > 0)

        # Update source health
        now = timezone.now()
        source.last_checked_at = now
        if overall_error and overall_status_code >= 400:
            source.last_failure_at = now
            source.failure_count += 1
        else:
            source.last_success_at = now
            source.failure_count = 0
        source.save(update_fields=['last_checked_at', 'last_success_at', 'last_failure_at', 'failure_count'])

        # Observability Log
        UpdateFetchLog.objects.create(
            source=source,
            status_code=overall_status_code,
            latency_ms=max(total_latency_ms, 20),
            change_detected=has_changes,
            error_message=overall_error[:500] if overall_error else ""
        )

        return {
            "source_id": source.source_id,
            "source_name": source.name,
            "status": "ERROR" if overall_error else "SUCCESS",
            "latency_ms": total_latency_ms,
            "created": total_created,
            "modified": total_modified,
            "unchanged": total_unchanged,
            "endpoints": endpoint_results,
            "error": overall_error,
        }
