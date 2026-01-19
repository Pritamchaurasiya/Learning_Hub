## 2024-05-22 - [Missing Accessibility Labels on Icon-only Buttons]
**Learning:** Several icon-only buttons (Social Login, Password Toggle) were found missing semantic labels and tooltips, making them inaccessible to screen readers.
**Action:** Always verify `IconButton` and custom icon widgets have `tooltip` and `semanticLabel` (or `Semantics` wrapper) defined.
