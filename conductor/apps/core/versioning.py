"""
DRF Versioning Class for Learning Hub.

Complies with ADR-006: Header-Based Version Negotiation with URL-Path fallback.
"""

import re
from rest_framework.versioning import BaseVersioning, exceptions


class HeaderAndPathVersioning(BaseVersioning):
    """
    Enterprise DRF Versioning supporting ADR-006:
    1. Custom Header: 'X-API-Version: v1' / '1.0' / 'v2'
    2. Accept Header: 'Accept: application/json; version=1.0'
    3. URL Path: '/api/v1/...'
    4. Query Param: '?version=v1' / '?api_version=1.0'
    5. Fallback: settings.DEFAULT_VERSION ('v1')
    """
    invalid_version_message = "Invalid API version."

    def determine_version(self, request, *args, **kwargs):
        # 1. Custom Header
        x_version = request.META.get("HTTP_X_API_VERSION")
        if x_version:
            return self._normalize_and_validate(x_version)

        # 2. Accept Header
        accept_header = request.META.get("HTTP_ACCEPT", "")
        match = re.search(r"version=(\d+(?:\.\d+)?)", accept_header, re.IGNORECASE)
        if match:
            return self._normalize_and_validate(match.group(1))

        # 3. URL Path regex
        path_match = re.search(r"/api/v(\d+(?:\.\d+)?)", request.path)
        if path_match:
            return self._normalize_and_validate(path_match.group(1))

        # 4. Query param (supports both DRF Request.query_params and WSGIRequest.GET)
        params = getattr(request, "query_params", getattr(request, "GET", {}))
        query_val = params.get(self.version_param or "version")
        if not query_val:
            query_val = params.get("api_version")
        if query_val:
            return self._normalize_and_validate(query_val)

        # 5. Default
        return self.default_version or "v1"

    def _normalize_and_validate(self, version_str: str) -> str:
        cleaned = version_str.strip().lower()
        norm = cleaned if cleaned.startswith("v") else f"v{cleaned}"
        base_major = norm.split(".")[0]  # e.g. "v1" from "v1.0"

        if self.allowed_versions:
            if norm in self.allowed_versions or base_major in self.allowed_versions:
                return base_major
            raise exceptions.NotFound(f"{self.invalid_version_message}: {version_str}")

        return base_major
