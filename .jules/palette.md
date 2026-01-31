## 2025-05-18 - [Icon-Only Button Accessibility Pattern]
**Learning:** Custom icon-only buttons (such as `_SocialButton` or plain `InkWell` wrappers) are completely invisible to screen readers without explicit semantic labels. Tooltips alone are insufficient for accessibility as they only serve pointer users.
**Action:** Always wrap custom interactive widgets with `Tooltip` (for hover) AND `Semantics(label: '...', button: true)` (for screen readers).

## 2025-05-18 - [Dynamic Password Toggles]
**Learning:** Static "Show Password" tooltips on toggle buttons are confusing when the password is already visible.
**Action:** Use dynamic tooltips based on state: "Show password" when obscured, "Hide password" when visible.
