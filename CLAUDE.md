# CPulse Project Guidelines

## Stack
- **Frontend**: React (TypeScript), Vite, Tailwind CSS, Radix UI, Zustand, Recharts, Vitest
- **Backend**: Tauri (v2), Rust, `sysinfo`, `windows-sys`, `trash`

## Commands
- **Dev**: `pnpm dev`
- **Build**: `pnpm build`
- **Lint**: `pnpm lint` / `pnpm lint:fix`
- **Format**: `pnpm format`
- **Rust Clippy**: `cargo clippy -- -D warnings`
- **Rust Test**: `cargo test`

## Important Rules

1. Always start by reading the `CLAUDE.md` file for the project guidelines.
2. auto commit after task is done.
3. if task is not done, undo commit.
4. before commit, run `cargo clippy -- -D warnings`
