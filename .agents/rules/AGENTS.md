---
trigger: always_on
---

# CPulse Workspace Rules

## 0) Scope & Priority
- Scope: `MuhammadAlif09/Cpulse`. Authoritative for ALL agents.
- Conflict: This file wins over `CLAUDE.md`, `GEMINI.md`, `.cursorrules`. Flag conflicts.
- Priority: 1. This file, 2. `STATUS.md` (progress state), 3. Session prompt. If unresolved -> STOP & ask.

## 1) Safety & Package Manager
- Approval: NO behavior changes, tags, releases without user approval.
- Files: NO binaries/installers/files > 50MB committed.
- Gitignore: Keep `/target`, `/src-tauri/target`, `node_modules/`, `dist/`, `*.log`, `.env*`.
- PNPM ONLY: Use `pnpm` only. `tauri.conf.json` build command must be `"pnpm dev"` / `"pnpm build"`. Fix `npm` drift if found.
- Secrets: NEVER paste `.env` / keys to external tool/chat.

## 2) Startup Checklist & Disk
- Disk check: Check free space on Cargo target drive (usually `D:`, fallback `C:`):
  ```powershell
  $free = (Get-PSDrive D -ErrorAction SilentlyContinue).Free / 1GB
  if (-not $free) { $free = (Get-PSDrive C).Free / 1GB }
  if ($free -lt 5) { Write-Warning "Low disk space: $free GiB" }
  ```
  Free space < 5 GiB -> STOP & warn. Drive missing / < 10 GiB -> fallback `C:` explicitly & tell user.
- Reading: Read `STATUS.md` first, then target task files only.

## 3) Branch & Release
- Branch: Verify target branch (usually `dev`) before push.
- Minor (docs, config, `.agents/`) -> dev directly, no version bump.
- Significant (Rust `src-tauri/src/`, UI `src/`, deps) -> Release candidates.
- Commits: Clear scope only. CI checks must pass. No broken builds.
- Releases: Tag `v*` / manual trigger only. Push to dev compiles/tests but no release.

## 4) Versioning & CHANGELOG
- Drift: `package.json`/`Cargo.toml` at `0.16.13`, `tauri.conf.json` at `0.16.12`. Resync next prep.
- Bump steps (if approved):
  1. Bump `package.json` version, run `npm run version` (syncs `tauri.conf.json` + `App.tsx`).
  2. Bump `src-tauri/Cargo.toml` manually (must match).
  3. Diff & verify all 4 files match before commit.
  4. Log in `CHANGELOG.md` (date, changes, fixes).
- Push: Commit to `dev`. Push tag `vX.Y.Z` only with explicit approval.

## 5) CI & Rust Quality Gate
- CI: Node.js 22, `Swatinem/rust-cache@v2`. Push compile/test/lint. Tag runs release.
- Rust Gate (run before committing any changes to `src-tauri/src/`):
  - `cargo fmt --all -- --check`
  - `cargo clippy --all-targets --all-features -- -D warnings`
  - `cargo test` (scoped OK)

## 6) Rust/Tauri Build
- Profiles: Dev (no incremental, debug line-tables-only, strip debuginfo). Release (strip true, lto true, codegen 1).
- Target: `D:/cargo-target/cpulse` (verify config.toml).
- Size check: Check `target/` size before/after large build. Report delta.
- Skip build: No cargo build for frontend/doc changes. No duplicate dependencies.
- Clean: Run `cargo clean --release` after release build. Clean full only if disk low or requested.

## 7) Subprocesses
- Windows flags: `std::process::Command` must set `.creation_flags(0x08000000)` (no window).
- No Injection: Use `Vec<&str>`/`.arg()`. Never interpolate user strings.
- Errors: Check non-zero exit and stderr explicitly.
- Admin: Check elevation need (`is_elevated::is_elevated()`) vs `cleaner.rs`.

## 8) Decision Gates (Ask User)
- Ask before: outside-scope behavior change, version bump, git tags, triggering release, large cleanups, new subprocess/deletion paths.

## 9) Output & Reporting
- Report template: Files changed & intent, checks run & results, version/changelog status, tag/release info, D: drive delta.

## 10) Status
- Use `STATUS.md` first for progress queries. No full scans.

## 11) Ponytail (Lazy Senior Dev)
- YAGNI: Only build what is requested. Deletion over addition.
- Reuse: Check existing utils/patterns. No new abstractions/dependencies unless asked.
- Ask user: "Do you need X or does Y cover it?"
- Shortcuts: Mark with `ponytail:` comment (noting limit + upgrade path).
- Verification: Trivial needs no tests. Non-trivial needs minimum runnable self-check/assert.