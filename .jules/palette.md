## 2024-05-23 - [Accessible Custom Icon Buttons]
**Learning:** Custom interactive widgets (like `_SocialButton`) wrapping `InkWell` often miss accessibility traits. A `Semantics` widget wrapping the child of `InkWell` with `button: true` and a `label` is essential. `Tooltip` should wrap the outer container for mouse users.
**Action:** Always verify custom buttons with `Semantics` and `Tooltip` wrappers. Use `find.byType(Tooltip)` and `tester.getSemantics()` in tests to verify.
