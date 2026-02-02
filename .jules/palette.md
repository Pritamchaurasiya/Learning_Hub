## 2024-05-22 - [Phantom Accessibility Props]
**Learning:** Custom widgets (like `_SocialButton`) often accept accessibility properties (like `label`) in their constructor but fail to wire them up to `Semantics` or `Tooltip`, creating a false sense of accessibility.
**Action:** Always verify that passed `label` props are actually used in the `build` method, especially for custom icon-only buttons, by inspecting the widget implementation.
