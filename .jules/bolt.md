## 2026-01-16 - [Recursive Serialization N+1]
**Learning:** Recursive serializers (like CategorySerializer) cause massive N+1 issues. Django's prefetch_related is not recursive by default.
**Action:** Use chained prefetch_related with to_attr for fixed-depth trees, and update serializers to check for these attributes.
