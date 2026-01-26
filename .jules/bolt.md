## 2026-01-26 - [Recursive Prefetch Optimization]
**Learning:** `CategorySerializer` recursive serialization caused N+1 queries (41 queries for 15 items). Optimized using `prefetch_related` with `to_attr='active_subcategories'` recursively (up to 2 levels) in `CategoryViewSet`, reducing queries to 4.
**Action:** Always verify recursive serializers with `django_assert_num_queries` and use explicit prefetch depths with `to_attr`.
