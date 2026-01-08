## 2026-01-08 - [Django Recursive Prefetching]
**Learning:** Standard `prefetch_related` does not automatically recurse efficiently when serializers call themselves. Chaining with `to_attr` requires explicit nested prefetch querysets (e.g., prefetching level 2 inside level 1's queryset) to correctly populate the attributes expected by the recursive serializer.
**Action:** When optimizing recursive serializers, define querysets for each depth level (bottom-up) and nest them in `Prefetch` objects.
