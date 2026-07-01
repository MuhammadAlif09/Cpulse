# CPulse Workspace Design & Dev Rules

## 1. Typography Policy
- **UI / Headings / Body Text**: Must use the `'Satoshi', sans-serif` font family.
- **Numbers / Metrics / Capacity Strings**: Must use `'Satoshi', sans-serif` with `fontVariantNumeric: 'tabular-nums'` (CSS: `font-variant-numeric: tabular-nums`) to ensure monospaced numeric layout alignment and prevent layout shifting when values update.
- **Font Assets**: External font URLs must be whitelisted in the Tauri CSP.

## 2. Color Palette & UI Semantics
- **Brand / Accent (Teal)**: Use Teal (`#0d9488` / `rgba(13,148,136,...)`) for active nav states, checkmarks, positive highlights, and default CTA buttons.
- **Danger / Destructive (Red)**: Use Red/Pink (`#ef4444` / `#f43f5e`) strictly for dangerous actions (e.g., "Sweep Items"), warning states, or blocked/locked options.
- **No Rainbow Patterns**: Avoid using diverse colors for similar types of buttons or results. Keep it unified to the Teal brand color unless it has a semantic error/danger context.

## 3. Frontend Bundle & Code Splitting
- **Tab Lazy-Loading**: All Tab features (`DashboardTab`, `CleanerTab`, `BoosterTab`, `StartupTab`, `PrivacyTab`, `HistoryTab`, `DiagnosticsTab`, `SettingsTab`) must be loaded dynamically using `React.lazy` and wrapped in a `<Suspense>` fallback container to keep the entrypoint bundle lightweight.

## 4. GitHub Actions & CI/CD
- **Node Version**: Pin Node version to `22` (stable).
- **Rust Caching**: Use `Swatinem/rust-cache@v2` for Rust compiler caching.
- **Build vs Release**: Limit release creations/assets uploads to push tags `v*` and manual triggers. Push to branch `dev`/`main` should compile but never generate draft releases.
