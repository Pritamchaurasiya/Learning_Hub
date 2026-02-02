## 2026-02-02 - [Auth Accessibility Patterns]
**Learning:** Custom interactive widgets (like `InkWell`-wrapped Icons) are invisible to screen readers without explicit `Semantics` wrappers. `Tooltip` alone provides visual feedback but `Semantics` ensures accessibility.
**Action:** Always wrap custom icon-only buttons in `Semantics(button: true, label: 'Action Name', child: Tooltip(...))`.

## 2026-02-02 - [Autofill UX]
**Learning:** Users rely on password managers. `TextFormField` without `autofillHints` breaks this workflow, forcing manual entry.
**Action:** Mandatory `autofillHints` for all auth-related inputs (email, password, newPassword, name).
