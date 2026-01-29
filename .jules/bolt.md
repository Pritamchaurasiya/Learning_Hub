## 2026-01-29 - Recursive Serializer N+1 Optimization
**Learning:** Recursive serializers (like for Category trees) trigger N+1 queries for each level if not prefetched correctly. Standard `prefetch_related` works for one level, but deep structures need nested `Prefetch` objects with `to_attr` to avoid re-querying in the serializer.
**Action:** When optimizing recursive structures, use `Prefetch` with `to_attr` to store results on the model instance, and update the serializer to check for this attribute before filtering the related manager.
