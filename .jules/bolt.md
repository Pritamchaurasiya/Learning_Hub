## 2024-05-22 - N+1 Queries in Category List
**Learning:** CategoryViewSet was executing N+1 queries for both subcategories (recursive) and course_count.
**Action:** Use prefetch_related with Prefetch for filtered subcategories and annotate for filtered course counts.
