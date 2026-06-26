---
trigger: always_on
---

# ANTIGRAVITY — WORKSPACE RULES
# Inherits: ~/.gemini/GEMINI.md (global)
# Stack: Tauri v2 + Rust | React/TS | REST/GraphQL

---

## ROLE
PM gives vibe → you execute: code + docs + tests + push. No hand-holding needed.
Ambiguity → pick conservative approach + log reason in ADR.
USE RTK
NEVER touch `.cursorrules` or `.clinerules`.

---

## CORE SESSION & CHAT HOOKS
At the start of every new session, conversation, or chat, you MUST automatically initialize (call `view_file` tool with `IsSkillFile: true`) and follow these skills/rules:
1. **brainstorming**: [brainstorming/SKILL.md](file:///C:/Users/user/.gemini/config/plugins/superpowers/skills/brainstorming/SKILL.md)
2. **cavecrew**: [cavecrew/SKILL.md](file:///c:/Projek/Cpulse_package/.agents/skills/cavecrew/SKILL.md)
3. **caveman**: [caveman/SKILL.md](file:///c:/Projek/Cpulse_package/.agents/skills/caveman/SKILL.md)
4. **ponytail**: [ponytail/SKILL.md](file:///c:/Projek/Cpulse_package/.agents/skills/ponytail/SKILL.md)
5. **Rust Token Killer (RTK)**: [antigravity-rtk-rules.md](file:///c:/Projek/Cpulse_package/.agents/rules/antigravity-rtk-rules.md)

Always keep these active throughout the conversation.

---

## GIT AUTOPILOT
Every task → run full cycle, no manual prompt needed:

```
1. Work on branch: dev (NEVER push direct to main)
2. Pre-push (all must pass):
   cargo clippy -- -D warnings
   cargo test
   pnpm lint
   pnpm vitest run
   pnpm build (dry-run)
3. Bump version (3 files sync):
   package.json
   src-tauri/tauri.conf.json
   src-tauri/Cargo.toml [package]
4. CHANGELOG.md → ## [vX.Y.Z] - YYYY-MM-DD
5. git add . && commit (conventional commits)
6. Squash merge dev→main, tag vX.Y.Z, push --tags
7. gh release create vX.Y.Z --generate-notes
```
Task = DONE only after push success.

---

## CI/CD (auto-create if missing)

`ci.yml` (trigger: push dev, PR main):
- rust: clippy, test, audit
- frontend: lint, vitest, build
- security: pnpm audit --audit-level=high, trufflehog

`release.yml` (trigger: tag v*):
- Tauri build → Windows (mandatory), mac/linux if asked
- Upload .msi/.exe to GitHub Release
- Apply cache (actions/cache) — always, speeds up build

`dependency-review.yml` (trigger: PR main):
- actions/dependency-review-action → block critical CVE

---

## SECURITY
- Pre-commit: no API keys/tokens/passwords in files
- Rust: `cargo audit` every CI
- Node: `pnpm audit --audit-level=high` every CI
- No dep upgrades unless CVE or user approves
- Tauri allowlist: minimal. No shell/fs exposed unless required.
- CSP: strict in tauri.conf.json
- API: auth on all endpoints, rate limit, explicit CORS (no wildcard)

---

## CODE QUALITY

Rust:
- No `.unwrap()` / `.expect()` in production → use `?` + map to String
- Paths → `std::path::PathBuf`, non-ASCII → `.to_string_lossy()`
- Check symlink before delete: `fs::symlink_metadata()`
- New features → `src-tauri/src/modules/<feature>/`
- Rust enums → must match 1:1 with Zustand store types

React/TS:
- 1 component = 1 responsibility, max ~200 lines
- dynamic import for heavy components
- Images → next/image only
- CWV target: LCP<2.5s, FID<100ms, CLS<0.1

General:
- No TODO/placeholder in any production file
- All errors: handled + logged + user feedback if relevant
- New feature → write `implementation_plan.md` first

---

## DOCS (auto-maintain)
- `README.md` → badges + install + dev + build
- `CHANGELOG.md` → Keep a Changelog format + why for each entry
- `docs/ADR/ADR-NNN-name.md` → Context/Decision/Consequence
- `docs/PERFORMANCE.md` → log benchmarks on perf changes
- `guidelines/Guidelines.md` → naming, folder structure

---

## TESTING
Rust: `#[cfg(test)]` per public fn, tempfile for fs tests
React: Vitest for utils, Testing Library for complex components
E2E (stable projects): Playwright for critical flows, run in CI pre-merge

---

## 9ROUTER — MODEL ROUTING
- Complex reasoning / architecture → Claude / GPT-4o
- Long boilerplate / large context → Gemini
- Quick review / small iteration → Haiku / Flash

---

## PERFORMANCE
Rust: `cargo bench` for critical fns, avoid unnecessary clone, Tokio for async I/O
Tauri: minimize Rust↔frontend payload, use event system not polling
Next.js: bundle-analyzer on build, React.lazy + Suspense for heavy components

## TOKEN DISCIPLINE
- Autopilot mode: execute silently, report dan penjelasan singkat untuk awam only: status + error + next
- No pre-action explanation unless asked
- No post-action summary unless task fails
- Skip confirmation for: lint, test, fmt, audit (routine tasks)
- Confirm only: destructive ops, version bump, release push

## IGNORE (never read)
node_modules/ | dist/ | build/ | target/ | .git/
*.log | *.lock (baca hanya jika diperlukan)
assets/img | assets/video