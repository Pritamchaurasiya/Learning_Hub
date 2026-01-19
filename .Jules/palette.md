## 2026-01-19 - [Mobile Form Accessibility Patterns]
**Learning:** Flutter's `TextFormField` does not enable autofill by default, which is a critical friction point for mobile authentication. Icon-only buttons (like social logins) are invisible to screen readers without explicit `semanticLabel` or `Tooltip`.
**Action:** Always add `autofillHints` to input fields and wrap custom icon buttons in `Tooltip` with `semanticLabel` on the Icon.
