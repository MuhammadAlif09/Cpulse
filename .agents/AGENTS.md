# CPulse Workspace Dev Rules

## 1. GitHub Actions & CI/CD
- **Node Version**: Pin Node version to `22` (stable).
- **Rust Caching**: Use `Swatinem/rust-cache@v2` for Rust compiler caching.
- **Build vs Release**: Limit release creations/assets uploads to push tags `v*` and manual triggers. Push to branch `dev`/`main` should compile but never generate draft releases.

## 2. Git & Release Workflow
- **Standard Changes**: Push directly to branch `dev` for regular features, bug fixes, and non-version updates.
- **Semantic Version Release**: When bumping versions in `package.json`/`Cargo.toml` (and adding CHANGELOG.md entries), create and push a git tag `v*` (e.g., `v0.16.13`) to trigger the release build.

