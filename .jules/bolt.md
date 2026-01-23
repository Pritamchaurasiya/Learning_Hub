## 2026-01-23 - Recursive N+1 Optimization in DRF

**Learning:** When using recursive serializers (e.g., categories with subcategories), `prefetch_related` on the top level only handles the immediate children. To avoid N+1 queries for deeper levels, use nested `Prefetch` objects with `to_attr` to populate the same attribute name recursively.

**Action:** Use `queryset.prefetch_related(Prefetch('subs', queryset=Category.objects.prefetch_related(...), to_attr='active_subs'))` and check for the attribute in the serializer.
