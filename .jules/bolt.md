## 2026-01-31 - [Recursive Serializer N+1]
**Learning:** `CategorySerializer` used recursive calls (`get_subcategories`) combined with `filter()` and `count()` inside methods, causing exponential N+1 queries (Roots -> Children -> Grandchildren).
**Action:** Use `prefetch_related` with nested `Prefetch` objects and `to_attr` to fetch the entire hierarchy in constant queries. Update serializer to check for prefetched attributes (e.g., `hasattr(obj, 'active_subcategories')`) before falling back to DB queries.
