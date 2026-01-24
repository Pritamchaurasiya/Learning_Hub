## 2024-10-24 - Phantom Props
**Learning:** Custom widgets (like `_SocialButton`) often accept accessibility properties (e.g., `label`) in their constructor but fail to wire them to `Semantics` or `Tooltip` components, creating a "phantom API" that implies accessibility support where none exists.
**Action:** When auditing custom UI components, explicitly trace accessibility parameters to ensure they terminate in a `Semantics`, `Tooltip`, or platform-aware widget.
