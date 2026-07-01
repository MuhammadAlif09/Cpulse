# CPulse Workspace Dev Rules

## 1. GitHub Actions & CI/CD
- **Node Version**: Pin Node version to `22` (stable).
- **Rust Caching**: Use `Swatinem/rust-cache@v2` for Rust compiler caching.
- **Build vs Release**: Limit release creations/assets uploads to push tags `v*` and manual triggers. Push to branch `dev`/`main` should compile but never generate draft releases.

## 2. Git & Release Autopilot Workflow
- **Standard Commits**: Push directly to branch `dev` for regular tasks.
- **Autopilot Release Decision**:
  - For **Minor Changes** (documentation updates `*.md`, `.agents/`, `.gitignore`, `LICENSE`), push directly to `dev` without changelog updates or version bumps.
  - For **Significant Code Changes** (updates in Rust logic `src-tauri/src/`, UI logic `src/`, or dependency bumps), the agent MUST automatically:
    1. Bump the patch version in `package.json` and `src-tauri/Cargo.toml`.
    2. Document changes under a new version entry in `CHANGELOG.md`.
    3. Commit, push to `dev`, and create/push the matching tag `v*` (e.g., `v0.16.14`) to trigger the release build automatically without requiring explicit user commands.
