from django.utils.deprecation import MiddlewareMixin
from .models import AuditLog

class AuditMiddleware(MiddlewareMixin):
    """
    Logs all mutating requests (POST, PUT, DELETE) to the database.
    """
    def process_response(self, request, response):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return response
            
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response
            
        # Log it
        try:
            # Avoid logging login/sensitive endpoints body if needed
            path = request.path
            
            AuditLog.objects.create(
                actor=request.user,
                action=request.method,
                resource=path,
                ip_address=self.get_client_ip(request),
                details=f"Status: {response.status_code}"
            )
        except Exception:
            pass # Never let audit log failure crash the app
            
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
