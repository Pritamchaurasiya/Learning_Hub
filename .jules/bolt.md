# Bolt's Journal

## 2024-05-23 - Recursive Serializer N+1 Queries
**Learning:** Recursive serializers (like Category trees) hide massive N+1 query chains. Using `obj.related_set.filter(...)` inside a `SerializerMethodField` defeats Django's default lazy loading mechanisms unless explicitly handled.
**Action:** When serializing trees, use `prefetch_related` with `to_attr` to pre-filter and pre-load children, and annotations for counts. Modify the serializer to check `hasattr(obj, 'prefetched_attr')` before falling back to DB queries.
