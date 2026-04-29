from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.urls import path, include
from .views import LiveSessionViewSet

router = DefaultRouter()
router.register(r'sessions', LiveSessionViewSet, basename='live-session')


# ==========================================================================
# ENHANCED LIVE SESSION ENDPOINTS
# ==========================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_session(request):
    """Create a new live session."""
    from .enhanced_service import LiveSessionService
    from django.utils import timezone
    from datetime import timedelta
    
    title = request.data.get('title')
    description = request.data.get('description', '')
    scheduled_time = request.data.get('scheduled_time')
    duration = int(request.data.get('duration_minutes', 60))
    course_id = request.data.get('course_id')
    
    if not title:
        return Response({"status": "error", "message": "Title required"}, status=400)
    
    if scheduled_time:
        scheduled = timezone.datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
    else:
        scheduled = timezone.now() + timedelta(minutes=5)
    
    result = LiveSessionService.create_session(
        host=request.user,
        title=title,
        description=description,
        scheduled_time=scheduled,
        duration_minutes=duration,
        course_id=course_id
    )
    
    return Response({"status": "success", "data": result})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_session(request, session_id):
    """Start a live session."""
    from .enhanced_service import LiveSessionService
    
    result = LiveSessionService.start_session(str(session_id), request.user)
    
    return Response({"status": "success", "data": result})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_session(request, session_id):
    """End a live session."""
    from .enhanced_service import LiveSessionService
    
    result = LiveSessionService.end_session(str(session_id), request.user)
    
    return Response({"status": "success", "data": result})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_session(request, session_id):
    """Join a live session."""
    from .enhanced_service import LiveSessionService
    
    result = LiveSessionService.join_session(str(session_id), request.user)
    
    return Response({"status": "success", "data": result})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_participants(request, session_id):
    """Get session participants."""
    from .enhanced_service import LiveSessionService
    
    participants = LiveSessionService.get_participants(str(session_id))
    
    return Response({"status": "success", "data": participants})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_poll(request, session_id):
    """Create a poll in the session."""
    from .enhanced_service import LiveSessionService
    
    question = request.data.get('question')
    options = request.data.get('options', [])
    duration = int(request.data.get('duration_seconds', 60))
    
    result = LiveSessionService.create_poll(
        str(session_id), request.user, question, options, duration
    )
    
    return Response({"status": "success", "data": result})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vote_poll(request, poll_id):
    """Vote on a poll."""
    from .enhanced_service import LiveSessionService
    
    option_index = int(request.data.get('option_index', 0))
    
    result = LiveSessionService.vote_poll(str(poll_id), request.user, option_index)
    
    return Response({"status": "success", "data": result})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_poll_results(request, poll_id):
    """Get poll results."""
    from .enhanced_service import LiveSessionService
    
    results = LiveSessionService.get_poll_results(str(poll_id))
    
    return Response({"status": "success", "data": results})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_upcoming_sessions(request):
    """Get upcoming live sessions."""
    from .enhanced_service import LiveSessionService
    
    limit = int(request.query_params.get('limit', 10))
    
    sessions = LiveSessionService.get_upcoming_sessions(request.user, limit)
    
    return Response({"status": "success", "data": sessions})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_live_now(request):
    """Get currently live sessions."""
    from .enhanced_service import LiveSessionService
    
    sessions = LiveSessionService.get_live_now()
    
    return Response({"status": "success", "data": sessions})


urlpatterns = [
    path('', include(router.urls)),
    
    # Phase 8: Enhanced Live Sessions
    path('create/', create_session, name='create_session'),
    path('<uuid:session_id>/start/', start_session, name='start_session'),
    path('<uuid:session_id>/end/', end_session, name='end_session'),
    path('<uuid:session_id>/join/', join_session, name='join_session'),
    path('<uuid:session_id>/participants/', get_participants, name='get_participants'),
    path('<uuid:session_id>/poll/', create_poll, name='create_poll'),
    path('poll/<uuid:poll_id>/vote/', vote_poll, name='vote_poll'),
    path('poll/<uuid:poll_id>/results/', get_poll_results, name='poll_results'),
    path('upcoming/', get_upcoming_sessions, name='upcoming_sessions'),
    path('live/', get_live_now, name='live_now'),
]
