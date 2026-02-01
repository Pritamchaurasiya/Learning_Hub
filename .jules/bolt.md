## 2026-02-01 - [Recursive Prefetch Depth]
**Learning:** When using recursive serializers (like `CategorySerializer`) that access nested relations via `get_subcategories`, standard `prefetch_related` must extend one level deeper than the data depth to prevent N+1 queries on leaf nodes. If the leaf node serializer attempts to access `subcategories` (even if empty), it triggers a database query unless that empty relation is also prefetched.
**Action:** Always prefetch N+1 levels where N is the expected data depth for recursive structures to ensure leaf nodes don't hit the database.
