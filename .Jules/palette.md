# Palette's Journal

## 2025-01-28 - Phantom Accessibility Props
**Learning:** Custom widgets might accept accessibility-related props (like `label`) but fail to wire them up to `Semantics` or `Tooltip`, creating a false sense of accessibility compliance in the usage code. I found a `_SocialButton` that required a `label` but never displayed it or exposed it to screen readers.
**Action:** Always verify that passed `label` or `title` props in custom widgets are actually used in `Semantics`, `Tooltip`, or accessible text widgets, not just defined in the constructor.
