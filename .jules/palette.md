## 2025-02-06 - [Flutter Accessibility Patterns]
**Learning:** Custom buttons (like `InkWell` wrapped containers) are invisible to screen readers without explicit `Semantics` wrappers, and lack hover feedback without `Tooltip`.
**Action:** Always wrap custom interactive widgets in `Tooltip` -> `InkWell` -> `Semantics` -> `Child`.
