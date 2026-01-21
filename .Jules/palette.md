## 2024-05-23 - [Accessible Custom Buttons]
**Learning:** Custom icon buttons (like social logins) built with low-level widgets (e.g., `InkWell` + `Icon`) are invisible to screen readers and lack hover feedback by default.
**Action:** Always wrap the interactive area in `Tooltip` for hover states and the icon/content in `Semantics(label: "...", button: true)` for screen readers.
