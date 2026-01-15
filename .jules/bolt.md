## 2024-05-23 - [Recursive N+1 Optimization]
**Learning:** Optimizing recursive structures (like categories) requires a mix of `prefetch_related` with `to_attr` for the first level and conditional logic in the serializer to use the prefetched data or fall back to lazy loading.
**Action:** When serializing tree structures, always verify query counts for N items. Use `Prefetch` objects to annotate and filter nested relations efficiently.
