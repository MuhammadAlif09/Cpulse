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

## Rules
- **Anti-Panic**: Dilarang `.unwrap()` atau `.expect()` di Rust. Pakai `Result`.
- **Git**: Push ke `dev`. Check CI local dulu (`clippy`, `test`, `lint`, `build`). Bump versi sinkron di `package.json`, `tauri.conf.json`, `Cargo.toml`.
- **Config**: Jangan sentuh `.cursorrules` / `.clinerules`.

## Agent Behavior
- Do NOT repeatedly remind about TodoWrite. Update todo list once per major task transition only.
- Do NOT re-read large files multiple times in one session. Extract needed sections only.
- Selalu gunakan rtk untuk mengurangi penggunaan token (rtk save).