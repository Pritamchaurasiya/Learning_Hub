from .models import Problem


class ProblemRepository:
    """
    Repository for Problem model queries.
    Decouples data access from business logic (Views/Services).
    """

    @staticmethod
    def get_list_queryset(difficulty=None, tag_slug=None, search=None):
        """
        Get queryset for problem list with optimizations.
        Predicates: Active problems only.
        Optimizations: Prefetch tags.
        """
        from django.db.models import Q
        queryset = Problem.objects.filter(is_active=True).prefetch_related('tags')

        if difficulty:
            queryset = queryset.filter(difficulty=difficulty.upper())
        if tag_slug:
            queryset = queryset.filter(tags__slug=tag_slug)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search)
            )

        return queryset.distinct()

    @staticmethod
    def get_problem_by_slug(slug):
        """
        Get a single problem by slug.
        """
        try:
            return Problem.objects.get(slug=slug, is_active=True)
        except Problem.DoesNotExist:
            return None
