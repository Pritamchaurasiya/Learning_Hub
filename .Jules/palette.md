## 2025-01-20 - [Custom Icon Buttons Accessibility]
**Learning:** Custom icon-only buttons (like social login buttons) relying on `InkWell` and `Icon` were invisible to screen readers, lacking semantic labels.
**Action:** Wrap such custom widgets in `Tooltip` (for hover) and `Semantics` (with `label` and `button: true`) to ensure full accessibility coverage.
