# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add opencode.json configuration for project automation commands

### Documentation

- Update CHANGELOG with eslint compatibility fix

### Fixed

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

### Miscellaneous

- Resolve merge conflict from main into dev

### Other

- 	modified:   .github/workflows/tauri-build.yml
	new file:   cliff.toml
- 	new file:   CHANGELOG.md.backup
	new file:   cliff.toml.backup
- 	modified:   .github/workflows/tauri-build.yml
	new file:   src-tauri/src/lib.rs.backup
	new file:   src-tauri/src/lib.rs.tmp

### Styling

- Apply glassmorphism to dashboard ui

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Refined Dashboard UI:
  - Applied iOS Liquid Glass (Glassmorphism) styling to the "System Health Score" banner.
  - Adjusted opacity, added heavy backdrop blur, and glossy border reflections.
  - Standardized the Quick Actions buttons ("Scan Junk", "Clean Junk", "RAM Cleaner") to use consistent semi-transparent backgrounds matching the wrapper card.
  - Improved color contrast for texts on transparent backgrounds.

### Fixed

- Downgrade ESLint to 9.16.0 for compatibility with eslint-plugin-react 7.37.5

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
  ... (1 duplicate lines)
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
