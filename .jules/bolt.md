## 2026-01-14 - Optimized Category Retrieval
**Learning:** `Prefetch` with `to_attr` combined with annotated QuerySets is essential for optimizing recursive or nested serialization. Simple `select_related` or `prefetch_related` isn't enough when nested serializers need to filter or annotate data.
**Action:** Use `Prefetch(..., queryset=annotated_qs, to_attr='custom_attr')` in views, and check `hasattr(obj, 'custom_attr')` in serializers to consume the optimized data without hitting the DB.
