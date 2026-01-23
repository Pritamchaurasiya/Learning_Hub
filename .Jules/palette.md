## 2026-01-23 - [Accessible Icon Buttons]
**Learning:** Custom icon-only buttons (like social logins) are often implemented with `InkWell` or `GestureDetector` for custom styling, missing standard accessibility features. They require explicit `Tooltip` (for mouse users) AND `Semantics` (for screen readers) wrappers.
**Action:** When creating or reviewing custom button widgets, always wrap the interactive element in `Tooltip` -> `Semantics` (with `button: true` and `label`).
