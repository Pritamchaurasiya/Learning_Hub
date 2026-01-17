## 2025-05-22 - [Accessible Icon-Only Buttons]
**Learning:** Icon-only buttons (like social logins) are invisible to screen readers without explicit labels. Using `Tooltip` helps mouse users, but `Semantics` or `aria-label` (in web) is crucial for screen readers.
**Action:** Always wrap custom icon buttons in `Tooltip` and ensure they have a semantic label, either via `Semantics` widget or `tooltip` property on standard buttons.
