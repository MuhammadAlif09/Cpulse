# CPulse — Project Status

CPulse is a Tauri v2 + React-based Windows system cleaning and optimization utility. It features real-time hardware telemetry (CPU, RAM, Disk, Network) and various diagnostic and maintenance tools.

## 1. Project Health & Tests
- **Vitest Suite**: **Pass (28/28 tests passing)**
- **Cargo Test Suite**: **Pass (17/17 tests passing)**
- **Rust Toolchain**: `stable-x86_64-pc-windows-gnu`

---

## 2. Completed Features & Enhancements

- **[x] Dashboard / Telemetry**: Real-time CPU usage, RAM utilization, Disk space, and Network I/O gauges and histories. Calculates and displays PC Health Score.
- **[x] Branded Windows Setup Installer**: 
  - Uses custom brand icon `icons/icon.ico`.
  - Integrates the `LICENSE` agreement screen.
  - Supports English and Indonesian with a startup language selector dialog.
  - Supports both per-user and machine-wide installation scopes.
- **[x] Stabilized Rust Unit Tests**: Migrated unit tests from `lib.rs` and `cleaner.rs` into the binary target's module structure (`src/tests/` declared in `main.rs`) to resolve Windows Loader crashes (`0xc0000139`) under GNU compiler.
- **[x] Cleaner Tab & Freeze Fix**: Bypasses the Windows Recycle Bin (`to_trash: false`) for transient system and browser cache files to prevent COM thread blocking, resolving UI freeze bugs.
- **[x] Multi-Language (i18n) Synchronization**: Bootstraps the i18next configuration in [main.tsx](file:///c:/Projek/Cpulse_package/src/main.tsx) and calls `i18n.changeLanguage` in [App.tsx](file:///c:/Projek/Cpulse_package/src/app/App.tsx) to ensure dynamic language switching works across all tabs.

---

## 3. Current Directory Structure & Core Modules
- **Frontend ([src/app/](file:///c:/Projek/Cpulse_package/src/app/))**:
  - `features/`: `DashboardTab`, `CleanerTab`, `BoosterTab`, `StartupTab`, `PrivacyTab`, `DiagnosticsTab`, `HistoryTab`, `SettingsTab`.
  - `components/`: Core UI components (`Sidebar`, `Header`, `RadialGauge`, `ui/DiskRow`, `ui/StatCard`).
  - `store/`: state store `useCleanerStore.ts`.
  - `i18n/`: `i18n.ts` and translations under `locales/`.
- **Backend ([src-tauri/](file:///c:/Projek/Cpulse_package/src-tauri/))**:
  - `src/lib.rs`: Commands registry and app setup.
  - `src/cleaner.rs`: Disk cleanup utilities (recycle bin, browser caches, temp files).
  - `src/tests/`: Binary-linked unit tests.

---

## 4. Next Steps & Planned Tasks
- [x] Store Unit Tests: Written robust unit tests for Zustand stores (useCleanerStore and useAppStore) using Vitest, achieving 100% logic coverage.
- [ ] Telemetry Enhancements: Add details for other hardware metrics in the Diagnostics tab.
