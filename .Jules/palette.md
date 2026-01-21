# Palette's Journal

## 2025-02-05 - [Custom Button Accessibility]
**Learning:** Custom icon-only buttons (like social logins) that use `InkWell` + `Icon` are often invisible to screen readers or lack context. They require explicit `Semantics` wrappers with meaningful labels, not just `Tooltip`.
**Action:** Always wrap custom interactive widgets with `Semantics(label: "Action Name", button: true, child: ...)` and add a `Tooltip` for mouse users.

## 2025-02-05 - [Dynamic State Tooltips]
**Learning:** Toggle buttons (like password visibility) often have static tooltips or none. Changing the tooltip text dynamically (e.g., "Show password" vs "Hide password") significantly reduces cognitive load for screen reader users and those relying on tooltips.
**Action:** Use ternary operators in `tooltip` properties for state-dependent actions: `tooltip: isObscured ? 'Show' : 'Hide'`.
