# Palette's Journal

## 2024-05-24 - Accessibility in Flutter Icon Buttons
**Learning:** Icon-only buttons in Flutter (like `IconButton`) do not automatically describe their action to screen readers. This creates a barrier for visually impaired users.
**Action:** Always provide a `tooltip` property to `IconButton` which serves as both a visual hint on hover and an accessibility label.
