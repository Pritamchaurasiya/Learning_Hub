## 2026-01-23 - [Icon-Only Button Accessibility]
**Learning:** Icon-only buttons (like social logins or password toggles) are invisible to screen readers without explicit labels. `Tooltip` provides hover context, but `Semantics` is required for screen reader announcements.
**Action:** Always wrap icon-only interactive elements in `Tooltip` AND `Semantics(button: true, label: "...")` (or use widgets with built-in support like `IconButton` with `tooltip` prop).
