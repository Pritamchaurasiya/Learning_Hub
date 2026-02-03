## 2025-05-15 - [Accessible Custom Button Layout Stability]
**Learning:** The standard `Material > InkWell` pattern can cause infinite expansion overflows in `Row` widgets within strict test environments or constrained layouts.
**Action:** Use `Semantics > Tooltip > Container > InkWell` as a robust fallback for custom icon buttons to ensure accessibility without layout regressions.
