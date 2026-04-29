from django.contrib import admin
from django.urls import path
from django.template.response import TemplateResponse
from apps.core.health import DeepHealthCheckView
from django.utils.html import format_html

class GodModeAdminSite(admin.AdminSite):
    site_header = "Learning Hub God Mode"
    site_title = "God Mode Portal"
    index_title = "System Command Center"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_view(self.god_mode_dashboard), name='god-mode-dashboard'),
        ]
        return custom_urls + urls

    def god_mode_dashboard(self, request):
        # reuse the logic from health check but format for UI
        health_view = DeepHealthCheckView()
        # Mocking a GET request to reuse the logic (or extraction, but this is quicker)
        # Actually, let's just instantiate the check logic if possible or call the view methods
        # For now, let's just pass context that frontend can fetch via API or render directly.
        
        context = dict(
           self.each_context(request),
           title="God Mode System Status",
           api_url="/health/deep/",  # The frontend can fetch this
        )
        return TemplateResponse(request, "admin/god_mode_dashboard.html", context)

god_admin = GodModeAdminSite(name='god_admin')
