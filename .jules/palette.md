## 2024-10-25 - [Accessibility for Custom & Standard Buttons]
**Learning:** Standard `IconButton` has a built-in `tooltip` property that should be used for icon-only buttons (like password toggles). Custom interactive widgets (like `InkWell` wrappers) need explicit `Tooltip` (for hover) AND `Semantics` (for screen readers) wrappers to be fully accessible.
**Action:** Always check `IconButton` for missing `tooltip` prop. For custom buttons, wrap in `Tooltip` and use `Semantics(button: true, label: ...)` inside the interactive area.
