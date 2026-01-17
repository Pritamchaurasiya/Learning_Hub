## 2026-01-17 - Django N+1 Optimization Pattern
**Learning:** For self-referential models (like `Category` with `parent`), `prefetch_related` is not recursive by default. Using `to_attr` allows identifying prefetched data in serializers.
**Action:** When serializing hierarchical data, use `prefetch_related` with `to_attr` to explicitly target one or two levels of depth, and use `hasattr` in the serializer to check for this data before falling back to database queries. This balances flexibility with performance.
