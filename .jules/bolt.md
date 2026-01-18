## 2026-01-18 - Recursive N+1 in DRF
**Learning:** Django REST Framework's `SerializerMethodField` combined with recursive serializer instantiation allows N+1 queries to hide in plain sight. Even if `prefetch_related` is used, accessing related managers with `.filter()` inside a serializer negates the prefetch and hits the database again.
**Action:** Use `Prefetch` objects with `to_attr` to pre-load filtered relationships into a custom attribute. Update serializers to check for this attribute (e.g., `hasattr(obj, 'prefetched_rel')`) before falling back to database queries.
