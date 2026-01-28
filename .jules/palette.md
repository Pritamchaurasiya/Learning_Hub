# Palette's Journal

This journal records CRITICAL UX and accessibility learnings.

## Format
`## YYYY-MM-DD - [Title]`
`**Learning:** [UX/a11y insight]`
`**Action:** [How to apply next time]`

## 2025-10-24 - [Accessible Custom Interactive Buttons]
**Learning:** Custom interactive widgets (like `_SocialButton` wrapping an `InkWell`) often lack semantic labels, making them invisible or confusing to screen reader users. Standard `IconButton`s also need explicit dynamic tooltips (e.g., "Show/Hide password") rather than just static icons.
**Action:** Always wrap custom interactive widgets in `Semantics(button: true, label: 'Action Name')` and `Tooltip`. For password toggles, use dynamic tooltips that reflect the current state.
