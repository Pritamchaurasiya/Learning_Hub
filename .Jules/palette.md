
## 2026-02-01 - Accessible Custom Buttons in Flutter

**Learning:** When building custom buttons using `InkWell` inside a `Container`, the button is interactive but lacks a semantic label for screen readers. Wrapping the content in `Semantics(button: true, label: 'Name')` inside the `InkWell` allows the `InkWell` to merge this label into its interactive node, providing a robust accessible experience.

**Action:** Always wrap the child of an `InkWell` (used for custom buttons) in a `Semantics` widget with an explicit `label`, and wrap the whole component in a `Tooltip` for mouse/desktop users.
