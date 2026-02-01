## 2024-05-24 - [Accessible Custom Buttons]
**Learning:** Flutter's `InkWell` provides interactivity but lacks accessibility semantics for screen readers when used in custom buttons without text. Wrapping a `Container` with `InkWell` also obscures ripple effects if the container has a color.
**Action:** Use `Material` widget for background color and shape, wrap it in `Tooltip` for desktop/mouse users, and use `Semantics` (with `button: true` and `label`) inside or around the `InkWell` to ensure screen readers announce it correctly.
