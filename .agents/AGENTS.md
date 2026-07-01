# CPulse Workspace Dev Rules

## 1. GitHub Actions & CI/CD
- **Node Version**: Pin Node version to `22` (stable).
- **Rust Caching**: Use `Swatinem/rust-cache@v2` for Rust compiler caching.
- **Build vs Release**: Limit release creations/assets uploads to push tags `v*` and manual triggers. Push to branch `dev`/`main` should compile but never generate draft releases.
