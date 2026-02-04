## 2026-02-04 - [Django Recursive Prefetching]
**Learning:** Recursive structures like Categories in this codebase require explicit chaining of `Prefetch` objects with `to_attr` (e.g., Root -> Child -> Grandchild) to avoid N+1 queries. Crucially, the serializer must be modified to check for these attributes (e.g., `active_subcategories`) instead of accessing the manager directly.
**Action:** Use the `prefetch_related(Prefetch(..., to_attr='...'))` pattern combined with serializer checks (`hasattr`) for all hierarchical data retrieval to ensure constant query counts.
