## 2026-02-03 - Recursive Category Prefetching
**Learning:** `CategoryViewSet` exhibited N+1 queries due to recursive `CategorySerializer` fields (`subcategories`, `course_count`). Optimizing this requires nested `Prefetch` objects to a fixed depth (e.g., 3 levels) and passing annotations down via `queryset` in `Prefetch`.
**Action:** When working with recursive structures in DRF, avoid `SerializerMethodField` that performs queries. Use `prefetch_related` with recursive `Prefetch` definitions and check for prefetched attributes (e.g., `hasattr(obj, 'active_subcategories')`) in the serializer.
