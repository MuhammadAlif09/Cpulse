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


