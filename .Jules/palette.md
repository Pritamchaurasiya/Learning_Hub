# Palette's Journal

## 2026-02-05 - [Custom Icon Buttons Accessibility]
**Learning:** Custom buttons built with `Container` + `InkWell` + `Icon` (like the social login buttons) are invisible to screen readers without explicit semantics. `InkWell` provides "button" trait but no label.
**Action:** Always wrap custom interactive widgets in `Tooltip` for desktop/mouse users and `Semantics` (with `label` and `button: true`) for screen readers. The robust pattern is `Tooltip > Material > InkWell > Semantics`.
