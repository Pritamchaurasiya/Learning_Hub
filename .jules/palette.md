## 2025-02-05 - Accessible Custom Interactive Widgets
**Learning:** Custom interactive widgets (like social login buttons) composed of `InkWell` and `Container` lack semantic information by default, making them invisible or confusing to screen readers.
**Action:** Always wrap custom button content in `Tooltip` for hover feedback and `Semantics(button: true, label: '...')` to provide accessible names.

## 2025-02-05 - Dynamic Password Visibility Tooltips
**Learning:** Static tooltips on state-toggling buttons (like password visibility) can be misleading.
**Action:** Use dynamic tooltips that reflect the *action* that will happen (e.g., 'Show password' when hidden, 'Hide password' when visible).
