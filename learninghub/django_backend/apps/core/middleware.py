"""
Core Middlewares for LearningHub Django Backend.
"""

class CSRFHeaderNormalizerMiddleware:
    """
    Ensures both frontend conventions:
    - X-CSRF-Token (HTTP_X_CSRF_TOKEN)
    - X-CSRFToken (HTTP_X_CSRFTOKEN)
    are recognized by Django's CsrfViewMiddleware.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if 'HTTP_X_CSRF_TOKEN' in request.META and 'HTTP_X_CSRFTOKEN' not in request.META:
            request.META['HTTP_X_CSRFTOKEN'] = request.META['HTTP_X_CSRF_TOKEN']
        return self.get_response(request)
