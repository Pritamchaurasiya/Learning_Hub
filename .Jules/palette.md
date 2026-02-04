## 2026-02-04 - [Accessible Custom Buttons & Form Hints]
**Learning:** Custom widgets (like `_SocialButton`) that accept a `label` but don't use it in `Semantics` or `Tooltip` create "phantom props" - API promises accessibility but UI doesn't deliver.
**Action:** Always wrap interactive custom widgets in `Tooltip` and `Semantics(button: true, label: ...)` to ensure screen readers and keyboard users (via tooltips) are supported. Also, `TextFormField`s need explicit `autofillHints` for better UX.
