# LearningHub V15 — UI/UX Design System & Experience Audit (Phase 3)

**Generated:** 2026-09-28  
**Scope:** Design tokens, visual consistency, component hierarchy, microinteractions, and dark mode dynamics.

---

## 1. Visual Hierarchy & Design System

- **Color Palette**:
  - Primary: Indigo (`#6366f1` / `primary-600`), accent Emerald (`#10b981`), caution Amber (`#f59e0b`), destructive Rose (`#f43f5e`).
  - Dark Theme: Neutral slate/gray (`bg-gray-950`, `bg-gray-900`, `border-gray-800`).
  - Glassmorphism: `backdrop-blur-xl`, `bg-white/80` and `bg-gray-900/80` with semi-transparent borders.
- **Typography Scale**:
  - Headings: Inter / Sans-serif (`text-3xl font-extrabold tracking-tight`).
  - Monospace: Fira Code / JetBrains Mono for CodeMirror, mathematical formulas, and keyboard badges (`<kbd>`).
- **Spacing & Rhythm**:
  - Standardized on 4px grid (`gap-4`, `p-6`, `space-y-6`).
  - Mobile bottom padding uses `safe-area-pb` with `h-[68px]` navigation offset.

---

## 2. Microinteractions & Animation Quality

- **Framer Motion Integration**:
  - Modal transitions: scale `0.95 -> 1.0`, y offset `-10px -> 0px` with spring stiffness 500, damping 35.
  - Active navigation pill: animated `layoutId="mobile-nav-bg"` across route transitions.
  - Button touch feedback: `whileTap={{ scale: 0.98 }}` for tactile responsiveness.
- **Audio Microfeedback**:
  - Web Audio API synthesizer (`utils/soundEffects.ts`) for achievement unlock, correct quiz answer, and test completion chimes.

---

## 3. Dark Mode & System Theme Adaptation

- **OS Synchronization**:
  - `window.matchMedia('(prefers-color-scheme: dark)')` listener added to dynamic theme effect.
  - Zero-lag transition when OS switches between daylight and sunset modes.
- **Contrast Ratios**:
  - Body text on dark background: `#f3f4f6` on `#030712` exceeds 14:1 (surpassing WCAG AAA 7:1 standard).
  - Muted secondary text: `#9ca3af` on `#111827` meets 4.5:1 AA contrast ratio.
