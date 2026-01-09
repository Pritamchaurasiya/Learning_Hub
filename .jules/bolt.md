## 2024-05-22 - Recursive Serialization Optimization
**Learning:** Django's `prefetch_related` combined with `Prefetch` object and `to_attr` allows for optimizing recursive relationships, but it requires careful construction of nested Prefetch objects for each level of recursion.
**Action:** When dealing with recursive data structures in serializers (like categories), use chained `Prefetch` objects with `to_attr` to flatten the query structure and avoid N+1 problems.
