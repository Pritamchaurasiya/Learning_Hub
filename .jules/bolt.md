## 2026-01-13 - [Recursive Serialization N+1]
**Learning:** Recursive serializers in DRF (like for category trees) coupled with `SerializerMethodField` cause exponential N+1 queries. Standard `prefetch_related` is shallow.
**Action:** Use `prefetch_related` with nested `Prefetch` objects and `to_attr` to pre-populate recursive structures up to a fixed depth (e.g., 3 levels), and modify serializers to check for these attributes before querying.
