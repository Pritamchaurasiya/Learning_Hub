## 2026-01-30 - [Django Recursive Prefetching]
**Learning:** DRF serializers for hierarchical data (like categories) suffer from N+1 query explosion. Standard `prefetch_related` isn't enough when the serializer recursively calls itself.
**Action:** Use nested `Prefetch` objects with `to_attr` to build the full hierarchy (Root -> Child -> Grandchild) in a single query chain, and update the serializer to check for the prefetched attribute before filtering.
