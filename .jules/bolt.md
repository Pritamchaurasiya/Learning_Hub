## 2026-01-24 - [Recursive Prefetching for N+1 Optimization]
**Learning:** Standard Django `prefetch_related` is insufficient for recursive serialization (like category trees) as it only prefetches one level. To optimize, use nested `Prefetch` objects with `to_attr` to populate children recursively and avoid DB hits in the serializer.
**Action:** When working with hierarchical data and recursive serializers, define a `Prefetch` chain that matches the serialization depth (e.g., 2 levels) and use `to_attr` to pass the prefetched objects to the serializer.
