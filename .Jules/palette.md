## 2024-05-23 - [Accessible Custom Buttons]
**Learning:** Custom buttons built with `Container` + `InkWell` often lack semantic labels for screen readers and tooltips for mouse users, making them inaccessible.
**Action:** Always wrap custom icon-only buttons in `Tooltip` for hover states and ensure `Semantics` (or `IconButton`) is used to provide a descriptive label for assistive technology.
