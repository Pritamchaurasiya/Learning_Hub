from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .views import ProblemViewSet, SubmissionViewSet, TagViewSet

router = DefaultRouter()
router.register(r'problems', ProblemViewSet, basename='problem')
router.register(r'submissions', SubmissionViewSet, basename='submission')
router.register(r'tags', TagViewSet, basename='tag')


# ==========================================================================
# DSA PRACTICE ENGINE ENDPOINTS
# ==========================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommended_problems(request):
    """Get AI-powered problem recommendations."""
    from .practice_engine import DSAPracticeEngine, ProblemCategory
    
    limit = int(request.query_params.get('limit', 5))
    category = request.query_params.get('category')
    
    cat_enum = None
    if category:
        try:
            cat_enum = ProblemCategory(category)
        except ValueError:
            pass
    
    recommendations = DSAPracticeEngine.get_recommended_problems(
        request.user, limit=limit, category=cat_enum
    )
    
    return Response({"status": "success", "data": recommendations})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_solution(request):
    """Validate a DSA solution."""
    from .practice_engine import DSAPracticeEngine
    
    problem_id = request.data.get('problem_id')
    code = request.data.get('code')
    language = request.data.get('language', 'python')
    
    if not problem_id or not code:
        return Response({"status": "error", "message": "Missing problem_id or code"}, status=400)
    
    result = DSAPracticeEngine.validate_solution(
        request.user, problem_id, code, language
    )
    
    return Response({
        "status": "success",
        "data": {
            "submission_id": result.submission_id,
            "status": result.status,
            "passed_tests": result.passed_tests,
            "total_tests": result.total_tests,
            "execution_time_ms": result.execution_time_ms,
            "memory_kb": result.memory_kb,
            "feedback": result.feedback
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_complexity(request):
    """Analyze code complexity."""
    from .practice_engine import DSAPracticeEngine
    
    code = request.data.get('code')
    language = request.data.get('language', 'python')
    
    if not code:
        return Response({"status": "error", "message": "Missing code"}, status=400)
    
    analysis = DSAPracticeEngine.analyze_solution_complexity(code, language)
    
    return Response({"status": "success", "data": analysis})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dsa_stats(request):
    """Get user's DSA practice statistics."""
    from .practice_engine import DSAPracticeEngine
    
    stats = DSAPracticeEngine.get_user_dsa_stats(request.user)
    
    return Response({"status": "success", "data": stats})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_active_contests(request):
    """Get active and upcoming contests."""
    from .practice_engine import DSAPracticeEngine
    
    contests = DSAPracticeEngine.get_active_contests()
    
    return Response({"status": "success", "data": contests})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_contest_leaderboard(request, contest_id):
    """Get leaderboard for a contest."""
    from .practice_engine import DSAPracticeEngine
    
    leaderboard = DSAPracticeEngine.get_contest_leaderboard(contest_id)
    
    return Response({"status": "success", "data": leaderboard})


urlpatterns = [
    path('', include(router.urls)),
    
    # Phase 8: DSA Practice Engine
    path('recommendations/', get_recommended_problems, name='dsa_recommendations'),
    path('validate/', validate_solution, name='validate_solution'),
    path('analyze/', analyze_complexity, name='analyze_complexity'),
    path('stats/', get_dsa_stats, name='dsa_stats'),
    path('contests/', get_active_contests, name='active_contests'),
    path('contests/<uuid:contest_id>/leaderboard/', get_contest_leaderboard, name='contest_leaderboard'),
]
