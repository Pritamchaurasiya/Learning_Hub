## 2026-01-26 - Flutter InkWell Visibility
**Learning:** Placing an `InkWell` inside an opaque `Container` hides the ripple effect because the splash is drawn on the nearest parent `Material`.
**Action:** Use a `Material` widget with `color` and `shape` to wrap the `InkWell` instead of `Container`.

## 2026-01-26 - Icon-Only Button Accessibility
**Learning:** Icon-only buttons often lack semantic labels. `Tooltip` helps mouse users but screen readers need explicit labels.
**Action:** Wrap the `InkWell` (or its child) in `Semantics(label: "Action Name", button: true)` and also provide a `Tooltip`.
