## 2026-01-30 - Phantom Accessibility Props in Custom Widgets
**Learning:** Custom widgets (like `_SocialButton`) often accept accessibility parameters (e.g., `label`) in their constructor but fail to utilize them in the `build` method, creating a false sense of accessibility compliance.
**Action:** When inspecting custom widgets, explicitly verify that passed accessibility labels are wired to `Semantics` and `Tooltip` widgets, not just stored in unused fields.
