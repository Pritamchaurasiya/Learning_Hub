## 2026-02-05 - [Optimization] Recursive Prefetching for Tree Structures
**Learning:** Standard Django `prefetch_related` is insufficient for deep hierarchical structures (like Category trees) leading to N+1 queries per level. Recursive serialization triggers a query for each node's children.
**Action:** Use `prefetch_related` with nested `Prefetch` objects and `to_attr` to cache results at each level. Modify serializers to check `hasattr(obj, 'prefetched_attr')` before accessing relationships.
