## 2026-01-30 - Accessibility of Custom Icon Buttons
**Learning:** Flutter's `IconButton` has a `tooltip` property, but custom buttons made with `InkWell` + `Icon` (like the social login buttons) lack both hover text and semantic labels by default, making them inaccessible.
**Action:** Wrap custom interactive widgets in `Tooltip` for mouse/long-press feedback, and ensure they have a `Semantics` wrapper (with `button: true` and `label`) to be discoverable by screen readers.
