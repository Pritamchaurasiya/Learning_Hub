## 2024-05-24 - [Mobile Authentication Accessibility]
**Learning:** Auth forms on mobile require specific attributes (autofillHints, keyboardType) to play nicely with password managers and keyboards. Missing visibility toggles are a major usability friction.
**Action:** Always include `autofillHints`, `TextInputAction` (next/done), and a visibility toggle for password fields in Flutter apps.
