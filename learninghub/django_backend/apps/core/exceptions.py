from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            'status': 'error',
            'message': 'Request processing failed',
            'code': getattr(exc, 'default_code', 'ERROR'),
        }

        if isinstance(response.data, dict):
            detail = response.data.get('detail')
            if detail:
                custom_data['message'] = str(detail)
            else:
                custom_data['errors'] = response.data
                first_key = next(iter(response.data))
                first_val = response.data[first_key]
                if isinstance(first_val, list) and len(first_val) > 0:
                    custom_data['message'] = f"{first_key}: {first_val[0]}"
                else:
                    custom_data['message'] = str(first_val)
        elif isinstance(response.data, list):
            custom_data['errors'] = response.data
            if len(response.data) > 0:
                custom_data['message'] = str(response.data[0])

        response.data = custom_data
        return response

    logger.exception(f"Unhandled server exception: {exc}")
    return Response({
        'status': 'error',
        'message': 'An internal server error occurred',
        'code': 'INTERNAL_SERVER_ERROR'
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
