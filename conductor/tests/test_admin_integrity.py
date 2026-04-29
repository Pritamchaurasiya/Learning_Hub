import pytest
from django.contrib.admin.sites import site
from django.urls import reverse

@pytest.mark.django_db
class TestAdminIntegrity:
    """
    Dynamically tests all registered Django Admin endpoints to ensure 
    that the admin pages render successfully (HTTP 200).
    This catches N+1 related crashes, missing fields in list_display, 
    and misconfigured readonly_fields.
    """
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_client):
        self.client = admin_client

    def test_all_admin_endpoints(self):
        """Iterate over all registered models and hit their changelist view."""
        # Some models might not have a changelist view or might require specific setup,
        # but the vast majority should return 200 OK.
        failed_endpoints = []
        
        for model, model_admin in site._registry.items():
            app_label = model._meta.app_label
            model_name = model._meta.model_name
            url_name = f'admin:{app_label}_{model_name}_changelist'
            
            try:
                url = reverse(url_name)
                response = self.client.get(url)
                
                if response.status_code != 200:
                    failed_endpoints.append(
                        f"{app_label}.{model_name} returned {response.status_code}"
                    )
            except Exception as e:
                # Catch NoReverseMatch or other rendering exceptions
                failed_endpoints.append(f"{app_label}.{model_name} raised exception: {str(e)}")
                
        assert not failed_endpoints, f"Admin endpoints failed: {failed_endpoints}"

