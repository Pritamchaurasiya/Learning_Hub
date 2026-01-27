## 2024-05-22 - [Flutter Button Accessibility]
**Learning:** Custom buttons using `Container` + `InkWell` often lack accessibility labels and proper ripple rendering.
**Action:** Always wrap custom interactive widgets in `Semantics` (with `button: true` and `label`) and `Tooltip`. Use `Material` widget instead of `Container` to ensure `InkWell` ripples are visible.
