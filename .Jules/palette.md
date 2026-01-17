# Palette's Journal

## 2025-02-09 - [Custom Widget Accessibility]
**Learning:** Custom widgets (like `_SocialButton`) often bypass standard accessibility features. Wrapping interactive elements in `Semantics` and providing `tooltips` is critical for ensuring they are discoverable by screen readers and mouse users.
**Action:** Always verify custom widgets expose semantic labels and tooltips, even if they are just icons visually.
