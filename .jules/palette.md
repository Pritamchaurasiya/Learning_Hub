## 2026-02-03 - Accessible Custom Buttons & InkWell Visibility
**Learning:** In Flutter, `Container` widgets with a non-null `color` obscure `InkWell` ripple effects because the ink is painted on the nearest `Material` ancestor. Also, custom interactive widgets using `InkWell` often lack semantic labels for screen readers.
**Action:** When building custom buttons:
1. Use a `Material` widget to define the background color and shape (instead of `Container`).
2. Wrap the `InkWell` in a `Tooltip` for mouse users.
3. Include a `Semantics` widget (with `button: true`) inside the `InkWell` or wrapping the child to ensure accessibility.
