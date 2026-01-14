# Palette's Journal - UX & Accessibility Learnings

This journal records CRITICAL UX and accessibility learnings.
Format: `## YYYY-MM-DD - [Title]` followed by `**Learning:**` and `**Action:**`.

## 2026-01-14 - [Password Visibility & Input Hints]
**Learning:** Hardcoded `obscureText: true` frustrates users who make typos, while missing `AutofillHints` and `TextInputType` forces users to manual type everything.
**Action:** Always include a visibility toggle for password fields and specify `TextInputType`, `TextInputAction`, and `AutofillHints` for all inputs to support password managers and keyboard navigation.
