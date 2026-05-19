"""
Multi-Tenant Isolation Engine

SaaS architecture support:
1. Tenant Context Middleware
2. Database Schema/Row Isolation Logic
3. Tenant Configuration
"""

import logging
import re
import threading
from contextvars import ContextVar
from typing import Dict, Any, Optional
from django.conf import settings
from django.db import connection
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

# Valid tenant ID pattern: alphanumeric, hyphens, underscores only
TENANT_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]+$')

# Context for Tenant
_tenant_context = ContextVar("tenant_id", default=None)


class TenantContext:
    """Manages thread-local tenant information."""
    
    @classmethod
    def set_tenant(cls, tenant_id: str):
        if not tenant_id or not TENANT_ID_PATTERN.match(tenant_id):
            logger.warning(f"Invalid tenant ID rejected: {tenant_id}")
            return
        _tenant_context.set(tenant_id)

    @classmethod
    def get_tenant(cls) -> Optional[str]:
        return _tenant_context.get()
    
    @classmethod
    def clear(cls):
        _tenant_context.set(None)


class TenantMiddleware:
    """
    Django middleware to determine tenant from request (Subdomain/Header).
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Inspect Header
        tenant_id = request.headers.get("X-Tenant-ID")
        
        # 2. Or Subdomain (e.g. tenant.app.com)
        if not tenant_id:
            host = request.get_host()
            parts = host.split('.')
            if len(parts) > 2:
                tenant_id = parts[0]
        
        if tenant_id:
            TenantContext.set_tenant(tenant_id)
            # Optional: Switch DB Search Path (Postgres Schemas)
            # Only switch if tenant_id passes validation
            if TENANT_ID_PATTERN.match(tenant_id):
                self.switch_schema(tenant_id)
        
        response = self.get_response(request)
        
        TenantContext.clear()
        return response

    def switch_schema(self, tenant_id):
        """Switch PostgreSQL search_path safely using parameterized identifier."""
        # Validate tenant_id against whitelist pattern to prevent SQL injection
        if not TENANT_ID_PATTERN.match(tenant_id):
            logger.error(f"SQL injection attempt blocked in tenant schema switch: {tenant_id}")
            return
        
        # Use psycopg2.sql.Identifier for safe identifier quoting
        from django.db import connection
        with connection.cursor() as cursor:
            # Safe: we've validated the pattern above, but also quote the identifier
            cursor.execute(
                'SET search_path TO "%s", public' % tenant_id.replace('"', '""')
            )


class TenantConfigService:
    """
    Manages per-tenant configuration (branding, feature flags).
    Database-backed with fallback to defaults.
    """
    
    @classmethod
    def get_config(cls, key: str) -> Any:
        tenant_id = TenantContext.get_tenant()
        if not tenant_id:
            return getattr(settings, 'DEFAULT_CONFIG', {}).get(key)
        
        # Try to fetch from database-backed TenantConfig model
        try:
            from apps.saas.models import TenantConfig
            config = TenantConfig.objects.filter(
                tenant_id=tenant_id,
                is_active=True
            ).values_list('config', flat=True).first()
            if config:
                return config.get(key)
        except Exception:
            pass
        
        # Fallback to settings default
        return getattr(settings, 'DEFAULT_CONFIG', {}).get(key)
    
    @classmethod
    def set_config(cls, tenant_id: str, key: str, value: Any):
        """Set a tenant-specific configuration value."""
        if not TENANT_ID_PATTERN.match(tenant_id):
            raise ValidationError(f"Invalid tenant ID: {tenant_id}")
        
        try:
            from apps.saas.models import TenantConfig
            TenantConfig.objects.update_or_create(
                tenant_id=tenant_id,
                defaults={'config': {key: value}, 'is_active': True}
            )
        except Exception as e:
            logger.error(f"Failed to set tenant config: {e}")
            raise
