## 2026-01-15 - [Login Accessibility Patterns]
**Learning:** Login forms without `autofillHints` force users to manually type credentials, increasing friction and error rates. Also, custom icon buttons (like social logins) often miss accessibility labels.
**Action:** Always add `AutofillHints` to email/password fields and wrap custom icon buttons in `Tooltip` and `Semantics` widgets.
