# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Backend Cleaner Module**: Created [cleaner.rs](file:///c:/Projek/Cpulse_package/src-tauri/src/cleaner.rs) containing all scanning, cleaning, cancel, and CLI silent optimization logic, separating cleaner domain concerns from `lib.rs`.
- **Thirteen Scan Categories**: Expanded junk scans to include Recycle Bin, Windows Prefetch, Thumbnail Cache, Windows Log Files, Font Cache, DirectX Shader Cache, Windows Error Reports, Delivery Optimization Cache, App Caches (Discord, Teams, Steam, Riot Games), and Brave browser cache.
- **Safety Traversal Limits**: Implemented recursion depth, path length, and file count safeguards to prevent OOM/stack overflow on junction loops or anomalous directory structures.
- **Cancel Scan Command**: Wired up a thread-safe `ScanCancelFlag` (`Arc<AtomicBool>`) and corresponding `cancel_scan` command checked on each directory traversal iteration.
- **Zustand Cleaner Store**: Built [useCleanerStore.ts](file:///c:/Projek/Cpulse_package/src/app/store/useCleanerStore.ts) store for reactive, global state management across dashboard quick actions, sidebar badges, and the cleaner menu.
- **Premium Cleaner UI**: Added compositional donut chart, summary stats cards, warning labels, administrator badges, instant cancel scan buttons, and a smart Radix UI `AlertDialog` security prompt before cleaning system/sensitive cache.
- **Translations (EN/ID)**: Added bilingual descriptions and warnings for all 13 junk categories.

### Refactored

- **lib.rs Slim Down**: Moved ~500 lines of junk-related Rust logic out of `lib.rs`, wire up new Tauri command registrations, and clean up duplicate unit tests.

### Fixed

- **White Screen Crash**: Resolved a React ReferenceError caused by passing an undeclared `setJunkItems` prop to `DashboardTab` inside `App.tsx`.
- **Silent Process Execution**: Applied the `CREATE_NO_WINDOW` (0x08000000) creation flag to all background PowerShell processes in the backend (`get_disk_details` and `get_startup_items`) to prevent console windows from popping up and flashing on user startup.


## [0.13.2] - 2026-06-18

### Refactored

- Cleaned root directory by removing orphaned files:
  - Deleted `CHANGELOG.md.backup`, `cliff.toml.backup` (manual backups superseded by Git history).
  - Deleted `src-tauri/2` (accidental npm output dump).
  - Deleted `app-icon.png` and `app-icon-square.png` from root (hash-verified exact duplicates of `src/assets/app-icon.png` and `src/assets/logo.png`).
- Relocated utility scripts to `scripts/` directory:
  - Moved `bump-version.js` → `scripts/bump-version.js` with updated relative path resolution (`__dirname` → `rootDir` via `path.join(__dirname, "..")`).
  - Moved `extract.cjs` → `scripts/extract.cjs`.
  - Updated `package.json` `version` script to reference new path.
- Moved `default_shadcn_theme.css` from root to `src/styles/` for proper organization.
- Removed empty `src/styles/globals.css` (0 bytes, zero import references in codebase).
- Updated `.gitignore` with patterns for `*.backup` files and `opencode.json` (AI editor config).

### Documentation

- Created `docs/ADR/` (Architecture Decision Records) directory structure with template and index.
- Added ADR-001: Tauri v2 + Rust Backend decision documenting context, rationale, and trade-offs for the core technology stack.
- Added `docs/shadcn-ui-audit.md` — comprehensive usage audit of all 48 shadcn/ui components finding 0 active imports across the entire codebase (~133KB of orphaned source code). No deletions performed; documented for future cleanup decision.

## [0.13.1] - 2026-06-17

### Fixed

- Resolved startup blank screen (white screen) error in standard web browser environments:
  - Added centralized environment checking (`isTauri`) that detects both Tauri IPC availability (`window.__TAURI_IPC__`) and Vitest test context (`process.env.NODE_ENV === "test"`).
  - Guarded all startup and mount-time Tauri API calls (e.g. `invoke`, `listen`, `getVersion`, `getName`, `load`) in `App.tsx`, `useSystemMetrics.ts`, `StartupTab.tsx`, `SettingsTab.tsx`, `BoosterTab.tsx`, `HistoryTab.tsx`, and `PrivacyTab.tsx`.
  - Allowed safe fallback states and mock data for UI design previewing in standard browsers while fully executing Tauri features in test and runtime environments.

## [0.13.0] - 2026-06-17

### Added

- Implemented System Diagnostics & Telemetry Dashboard:
  - Spawned background `typeperf` child process monitoring `Disk Read Bytes/sec` and `Disk Write Bytes/sec` with locale-independent CSV parser and automatic process cleanup on application exit to prevent orphaned processes.
  - Extended backend telemetry loop inside `lib.rs` to stream per-core CPU usage, process count, uptime, and disk read/write throughput rates.
  - Implemented async Tauri command `generate_diagnostics_report` that aggregates system specifications, hardware details, storage status, and top CPU/Memory processes, exporting a markdown health report and opening it in Notepad.
  - Added new "Diagnostics" tab in React frontend featuring logical CPU core load grids (visual hue load representation), real-time Disk and Network I/O graphs using Recharts (`isAnimationActive={false}` for efficiency), process count, and uptime tracker.
  - Refactored `useSystemMetrics` hook to consume Tauri `"system-metrics"` events directly to avoid console polling errors.

### Documentation

- Updated `guidelines/Guidelines.md` with rules on input sanitization, scan limits, Rust/Vitest testing boundaries, Zustand state management, naming conventions, error propagation, and performance budgets.

## [0.12.0] - 2026-06-16

### Added

- Implemented detailed file-level audit logging for Disk Cleaner:
  - Created a recursive folder traversal and deletion logger (`clear_dir_internal`) in the backend Rust code.
  - Recorded pipe-separated logs (`[Timestamp] | [Status] | [Category] | [Size] | [Path] | [Error]`) to `%AppData%\com.cpulse.app\cleaner_audit.log`.
  - Identified file locks, access warnings, UAC constraints, and mapped them to `FAILED_LOCKED` or `FAILED_ERROR` statuses with exact OS descriptions.
  - Preserved backward compatibility of the wrapper `clear_dir` with a dummy writer for privacy sweeps.
  - Implemented the `open_cleaner_audit_log` Tauri command to launch Notepad for immediate audit viewing.
  - Added a responsive "View Audit Log" button to the Cleaner tab frontend UI, with interactive toast notices.

## [0.11.9] - 2026-06-16

### Added

- Integrated background CLI daemon for silent automatic system optimization:
  - Intercepted the `--silent-clean` command-line argument during Tauri application setup callback.
  - Executed a programmatic scan and clean cycle completely in the background without UI window generation.
  - Logged optimization results (freed bytes, fixed count, execution duration, and type "Auto Clean") to the plugin store's `history.json` database.
  - Terminated the daemon process immediately with exit code `0` on completion.
  - Resolved PE/COFF dynamic library symbol export limit under MinGW toolchain by compiling the app library statically as a Rust library target (`rlib`).

## [0.11.8] - 2026-06-16

### Added

- Implemented real Windows startup impact & boot delay detection:
  - Added backend command to parse executable paths from registry startup commands.
  - Implemented single-batch PowerShell query to retrieve real file metadata (size, company/publisher name).
  - Designed deterministic startup impact classification (High/Medium/Low) and boot delay duration calculations.
  - Updated React frontend `StartupTab` to use real startup metadata.
  - Added custom emoji app icons for recognized programs (Discord, Spotify, Steam, OneDrive, Teams, etc.).

## [0.11.7] - 2026-06-16

### Added

- Implemented real Windows registry-based startup applications management:
  - Added backend utility to query the `StartupApproved\Run` registry binary values to determine actual startup enable/disable status.
  - Implemented binary registry writing (`REG_BINARY`) to toggle startup items between enabled (`0x02`) and disabled (`0x03`) states.
  - Added automatic administrator privilege validation for modifying HKLM entries.

## [0.11.6] - 2026-06-16

### Added

- Added history logger utility module under `src/app/utils/history.ts` using Tauri's Plugin Store (`@tauri-apps/plugin-store`).
- Integrated history logging for Quick Clean and RAM Boost actions in the Dashboard tab.
- Integrated history logging for Deep Clean in the Cleaner tab.
- Integrated history logging for Privacy Sweep in the Privacy tab.
- Added comprehensive unit tests for the history utility under `src/app/utils/__tests__/history.test.ts`.

## [0.11.5] - 2026-06-16


### Documentation

- Upgraded the project README.md with detailed feature descriptions, tech stack details, system prerequisites, and developer guidelines.

## [0.11.4] - 2026-06-16

### Added

- Restored real-time CPU History area chart with a clean watermarked background percentage display.
- Restored real-time RAM History area chart with a clean watermarked background percentage display.
- Added a scrollable Disk Space list showing drive letters, partition sizes, storage models/brands, and media types (SSD/HDD) retrieved via PowerShell.
- Added the Quick Actions panel at the bottom of the dashboard containing interactive, in-place RAM Boost and Junk Clean sequences with state feedback, alongside Fix Startup and Privacy Sweep links.
- Integrated UAC status and system warnings banner at the bottom of the Health Score card.

## [0.11.2] - 2026-06-16

### Fixed

- Restored accidentally removed `NAV` and `TAB_DESC` constants during duplicate component cleanup which caused a `ReferenceError` resulting in a blank white screen upon application launch.

## [0.11.1] - 2026-06-16

### Fixed

- Removed duplicated, hoisted components from App.tsx that were shadowing the fixed module imports.
- Fixed a crash on the Privacy tab caused by stale code execution.
- Fixed Booster functionality failing due to old component code.
- Fixed text encoding issues (garbled characters) across UI menus.
- Corrected application logo import to properly render on the Sidebar and Settings menus.
- Fixed "About WinCleaner" text to "About CPulse".

## [0.11.0] - 2026-06-16

### Added

- Implement administrator privilege checks (UAC validation) for CPU Priority, Network, and Disk tweaks, disabling them with lock indicators on the frontend for standard users.
- Implement registry rollback/restore command handlers (`restore_boost`) in backend Rust to revert booster modifications to Windows defaults.
- Enhance UI to display warning/lock badges, toggle Apply/Restore actions for individual items, and trigger Sonner toast notifications on boost success or error events.

## [0.10.0] - 2026-06-16

### Added

- Implement real Privacy Scanner & Sweep on Windows backend (Recent Files list, RunMRU history, Windows Search recent queries, Wi-Fi profile count, browser history & cookies database sizes, and Clipboard status).
- Implement real privacy sweep logic to clear recent files, Run registry keys, search history, clipboard, Wi-Fi profiles, and Chrome/Edge history/cookies.
- Connect React `PrivacyTab` component dynamically to Tauri's `scan_privacy` and `sweep_privacy` command handlers.
- Update application version configuration to v0.10.0 across `package.json`, `tauri.conf.json`, and default state in `App.tsx`.

## [0.9.1] - 2026-06-16

### Added

- Re-enable Tauri Auto-Updater plugin in backend Rust code and update the configuration with newly generated public key.
- Re-enable Sentry in frontend safely, wrapping initialization with a check on the `VITE_SENTRY_DSN` environment variable to prevent blank screen crashes.
- Exclude environment variables file from git by updating `.gitignore` and document the local updater key in `.env`.

## [0.9.0] - 2026-06-16

### Added

- Implement real booster functionality in Rust backend (RAM, CPU, Network, Visual, Power, Disk, Game, Temp)
- Pass specific booster `id` from React frontend to Tauri backend

## [0.8.2] - 2026-06-16

### Fixed

- Fix TypeScript compile error `Parameter 'acc' implicitly has an 'any' type` by explicitly typing the Tauri `listen` callback event payload using the `SystemMetrics` interface in `App.tsx`.

## [0.8.1] - 2026-06-16

### Added

- Add opencode.json configuration for project automation commands

### Changed

- Refined Dashboard UI:
  - Applied iOS Liquid Glass (Glassmorphism) styling to the "System Health Score" banner.
  - Adjusted opacity, added heavy backdrop blur, and glossy border reflections.
  - Standardized the Quick Actions buttons ("Scan Junk", "Clean Junk", "RAM Cleaner") to use consistent semi-transparent backgrounds matching the wrapper card.
  - Improved color contrast for texts on transparent backgrounds.

### Documentation

- Update CHANGELOG with eslint compatibility fix

### Fixed

- Resolve `isJunkCleaned` ReferenceError and disk metrics in DashboardTab
- Resolve Rust compiler warnings and Option unwrap error
- Downgrade eslint to 9.16.0 for compatibility with eslint-plugin-react
- Escape special characters in changelog extraction for workflow
- Remove BOM from package.json and CHANGELOG.md to fix JSON parsing
- Remove out-of-scope variables in clear_dir and add Windows API imports
- Use windows_sys instead of windows crate for API imports
- Move EmptyWorkingSet import to ProcessStatus module
- Disable Sentry init to prevent blank screen on app launch
- Load store dynamically to prevent race condition blank screen
- Remove template literal syntax errors in loadSettings and loadGlobalSettings
- Grant required plugin permissions in desktop capability to prevent app blank screen
- Remove BOM from desktop.json capability file
- Downgrade ESLint to 9.16.0 for compatibility with eslint-plugin-react 7.37.5

### Miscellaneous

- Resolve merge conflict from main into dev

### Styling

- Apply glassmorphism to dashboard ui

## [0.8.0] - 2026-06-13

### Added

- Phase 1: Added system metrics and Rust Tauri connection
- Phase 2: Cleaner logic standard/admin and React integration
- Phase 3: Startup Registry, Booster mock, Power Plan switcher integrated
- Phase 4: Store persistence and Autostart implementations
- Initial commit - Cpulse
- Integrate system health score, fix z-index, and enable inline cleaning
- Connect sidebar badges to dynamic backend state
- Custom logo implementation
- Sync version 4.2.1 and product name across configs and ui
- Change app name to Cpulse and set version to 0.2.0 based on latest UI changes

### Documentation

- Upgrade README and add .clinerules to .gitignore
- Match README features with UI labels
- Add placeholders for UI screenshots in README
- Add Live UI Demo badge to README

### Fixed

- Disable plugin updater and sentry temporarily to avoid panics on missing config
- Clean up Figma leftovers, implement responsive layout
- Pass appName and appVersion to SettingsTab and remove 'Pro' suffix from navbar
- Sync version to 4.2.2 based on github releases to match project rules
- Sync version to 0.8.0 based on github releases to match project rules

## [0.1.1] - 2026-06-13

### Fixed

- Fix Tauri script in package.json

## [0.1.0] - 2026-06-13

### Added

- Initial commit
- Add GitHub Actions workflow for Tauri build
