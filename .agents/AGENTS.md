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

## 3. Rust/Tauri Workspace Hygiene & Anti-Bloat
### Cargo.toml profiles
```toml
[profile.dev]
incremental = false
debug = "line-tables-only"
strip = "debuginfo"

[profile.release]
strip = true
lto = true
codegen-units = 1
```

### Build discipline
- Check `du -sh target/` before/after large builds, report delta.
- Never re-run `cargo build` for non-Rust changes (config, assets, frontend).
- Before adding new `Cargo.toml` deps, verify no duplicate functionality exists (e.g., avoid `reqwest` + `ureq` together).
- After `cargo test`/`cargo check`, run `cargo clean -p <crate>` on stale crates to remove orphaned build artifacts.

### Target directory
- MUST set shared `CARGO_TARGET_DIR` — never let each project own a separate `target/`:
```toml
# .cargo/config.toml
[build]
target-dir = "D:/cargo-target/cpulse"
```
- Never place target dir on `C:` if free space < 10 GiB.

### Autopilot cleanup
- After successful `cargo build --release` and binary deployment → `cargo clean --release` (unless immediate rebuild expected).
- After branch merge or task completion → full `cargo clean`.
- Never build the same code diff twice in a row.

### Prohibitions
- Do NOT auto-proceed or alter functionality without user approval.
- Do NOT generate/commit files >50 MB (installers, binary releases) — ensure `.gitignore` covers them.
- `.gitignore` MUST include: `/target`, `/src-tauri/target`, `node_modules/`, `*.log`, `dist/`.
- Prefer pnpm over npm to avoid duplicated `node_modules` across projects.

### Session monitoring
- At session start, check: `Get-PSDrive C | Select-Object Free`
- If free space < 5 GiB → STOP, warn user before any build.

### sccache (optional)
```toml
# .cargo/config.toml
[build]
rustc-wrapper = "sccache"
```
- Auto-use if installed; suggest one-time install otherwise.

### Context Efficiency
- Always check STATUS.md first before reading other files.
- If STATUS.md exists, treat it as source of truth for project state.
- Do not scan project files to answer status/progress questions if STATUS.md is current.
