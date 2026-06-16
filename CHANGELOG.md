# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
