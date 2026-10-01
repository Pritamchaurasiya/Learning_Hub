from rest_framework.response import Response
from rest_framework import status

def success_response(data=None, message=None, status_code=status.HTTP_200_OK, meta=None):
    payload = {
        'status': 'success',
    }
    if message is not None:
        payload['message'] = message
    if data is not None:
        payload['data'] = data
    if meta is not None:
        payload['meta'] = meta
    return Response(payload, status=status_code)

def error_response(message='An error occurred', status_code=status.HTTP_400_BAD_REQUEST, code=None, errors=None):
    payload = {
        'status': 'error',
        'message': message,
    }
    if code is not None:
        payload['code'] = code
    if errors is not None:
        payload['errors'] = errors
    return Response(payload, status=status_code)
