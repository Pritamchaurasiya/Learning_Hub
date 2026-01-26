# Palette's Journal

## 2025-10-26 - Flutter InkWell and Accessibility

**Learning:** Flutter `Container` widgets with a non-null `color` property will paint over any `InkWell` ripple effects that are children of the container. This often leads to buttons that feel unresponsive (no visual feedback on tap).
**Action:** When creating custom buttons with background colors, use a `Material` widget to define the color and shape (via `borderRadius` or `shape`), and place the `InkWell` as a direct child of the `Material` widget.

**Learning:** Custom icon-only buttons created with `InkWell` or `GestureDetector` are invisible to screen readers unless explicitly labeled, and lack hover tooltips for mouse users.
**Action:** Always wrap custom icon buttons in a `Tooltip` widget for mouse users, and ensure they have a `Semantics` widget (with `button: true` and a meaningful `label`) in the widget tree (either wrapping the InkWell or as a child) to ensure accessibility.
