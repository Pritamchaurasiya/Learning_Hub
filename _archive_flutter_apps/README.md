# LearningHub Archived Flutter Applications

This folder contains the archived Flutter / Dart codebases:
1. `windows_app/`: Legacy Flutter Desktop (Windows/Multiplatform) implementation.
2. `my_flutter_app/`: Legacy Flutter Mobile/Multiplatform implementation.

## Project Standardization Decision (November 2026)
To eliminate architectural complexity, eliminate code duplication, and accelerate feature velocity, the client-facing architecture has been **standardized on React 18 + TypeScript + Vite**:
- **Web App:** Single-page application built with Vite (`learninghub/src`).
- **Windows Desktop App:** Native Windows desktop application wrapped with **Electron** (`learninghub/electron`).
- **PWA:** Installable offline-capable progressive web application generated automatically via `vite-plugin-pwa`.

All legacy Flutter code is preserved here for historical reference.

