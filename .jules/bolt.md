## 2024-02-02 - [Recursive Prefetching in DRF]
**Learning:** Optimizing recursive relationships (like Category hierarchies) in DRF requires manually nesting `Prefetch` objects with `to_attr` to fixed depth. Standard `prefetch_related` is not recursive and `SerializerMethodField` triggers N+1 queries if not backed by pre-fetched attributes.
**Action:** Use nested `Prefetch` chains with `to_attr` and conditional logic in serializers (`if hasattr(obj, 'prefetched_attr')`) to solve N+1 in tree structures.
