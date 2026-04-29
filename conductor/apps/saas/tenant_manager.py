"""
Multi-Tenant Isolation Engine

SaaS architecture support:
1. Tenant Context Middleware
2. Database Schema/Row Isolation Logic
3. Tenant Configuration
"""

import logging
import threading
from contextvars import ContextVar
from typing import Dict, Any, Optional
from django.conf import settings
from django.db import connection

logger = logging.getLogger(__name__)

# Context for Tenant
_tenant_context = ContextVar("tenant_id", default=None)


class TenantContext:
    """Manages thread-local tenant information."""
    
    @classmethod
    def set_tenant(cls, tenant_id: str):
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
            # self.switch_schema(tenant_id)
        
        response = self.get_response(request)
        
        TenantContext.clear()
        return response

    def switch_schema(self, tenant_id):
        # Implementation for Postgres Schema switching
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {tenant_id}, public")


class TenantConfigService:
    """
    Manages per-tenant configuration (branding, feature flags).
    """
    
    _mock_configs = {
        "tenant_a": {"theme": "dark", "features": ["beta_ai"]},
        "tenant_b": {"theme": "light", "features": []}
    }
    
    @classmethod
    def get_config(cls, key: str) -> Any:
        tenant_id = TenantContext.get_tenant()
        if not tenant_id:
            return settings.DEFAULT_CONFIG.get(key)
            
        config = cls._mock_configs.get(tenant_id, {})
        return config.get(key)
