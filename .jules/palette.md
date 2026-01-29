## 2025-02-04 - Phantom Props in Custom Widgets
**Learning:** Custom widgets (like `_SocialButton`) often accept accessibility properties like `label` but fail to wire them to `Semantics` or `Tooltip`, creating a false sense of accessibility compliance.
**Action:** Always verify that passed string labels in custom interactive widgets are actually used in `Semantics(label: ...)` or `Tooltip(message: ...)`.
