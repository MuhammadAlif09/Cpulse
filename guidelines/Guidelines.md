# ⚡ CPulse — Project Guidelines & SOP (Caveman Compressed)

Acuan mutlak pengembang & AI (Antigravity). Wajib baca awal sesi.

---

## 1. Peran & Filosofi Pengembangan (Vibe Coding)
- AI = Lead Engineer + DevOps + Eksekutor. User = PM.
- Proaktif: Tulis kode, arsitektur, unit test, release.
- Dokumentasi: Catat keputusan di `CHANGELOG.md`.

---

## 2. Keamanan & Penanganan Error (Rust - Backend)
- **Anti-Panic**: No `.unwrap()`, `.expect()`. Gunakan `Result<T, E>`.
- **Tauri Commands Validation**:
  - Sanitasi parameter frontend. Cegah Path Traversal (no absolute path injection, no `..`).
  - UAC/Admin check di Rust.
- **Hapus File**:
  - Standard: Kirim ke Recycle Bin via `trash` crate.
  - Aggressive: Dialog konfirmasi di frontend sebelum hapus permanen.
- **Safeguards**: Max scan 100,000 files. Max path 4096 chars.
- **Audit Log**: Catat path, size, status, timestamp.
- **Backend Modular**: Fitur baru di `src-tauri/src/modules/[nama_fitur].rs`. No code dump in `main.rs`/`lib.rs`.
- **Async**: Gunakan `tokio::task::spawn` / `rayon` untuk scan intensif. No blocking main thread.
- **Windows Path**: Gunakan `std::path::PathBuf`. Path non-ASCII via `.to_string_lossy()`. Check symlink/junction before delete.

---

## 3. Arsitektur Komunikasi Tauri (Backend ↔ Frontend)
- **Tauri Events**: Realtime telemetry. CPU/RAM = 1s, GPU/Network = 3s.
- **Tauri Commands**: Sekali jalan (e.g. `scan_garbage()`). Sediakan `cancel_scan()` & 60s timeout.
- **Listener Cleanup**: Panggil `unlisten` di `useEffect` cleanup. Avoid memory leak.
- **Error**: Return `Result<T, String>`. Frontend handle `catch`.
- **State Alignment**: Enum status (e.g. `Idle`, `Scanning`) Rust 1:1 TS. Zustand store sync dari event/command backend.

---

## 4. Struktur State & UI (React & Zustand)
- **UI Components**: Gunakan `src/app/components/ui/` (Radix UI). No dupes.
- **Komponen TS/JS**: 1 komponen = 1 tanggung jawab, max ~200 baris. Dynamic import + Suspense untuk komponen berat.
- **Zustand**: Single store global. Store name: `use[Feature]Store.ts`. No global React Context.
- **Crash Prevention**: Tab utama bungkus `ErrorBoundary`.
- **CWV Target**: LCP < 2.5s, FID < 100ms, CLS < 0.1.
- **a11y & UX**: `aria-label` di element interaktif. Jangan hanya andalkan warna untuk status.

---

## 5. Styling System (Tailwind CSS v4 & CSS Variables)
- **Tailwind v4**: `@tailwindcss/vite` v4 configuration.
- **Variables**: Gunakan CSS variables dari `src/styles/theme.css` & `src/styles/globals.css`. No hardcoded colors.
- **Aesthetic**: Premium, glassmorphism, soft shadow, micro-animations. No solid raw colors.

---

## 6. Strategi Testing & Anti-Regresi
- **Rust Test**: Unit test `#[cfg(test)]` (mock I/O, temp folders).
- **Frontend Test**: Vitest untuk utilities di `src/app/utils/`.
- **Pre-push Verification (Wajib Lolos)**:
  - `cargo clippy -- -D warnings`
  - `cargo test`
  - `pnpm lint`
  - `pnpm vitest run`
  - `pnpm build` (dry-run)

---

## 7. Standar Dokumentasi & ADR
- **Auto-Maintain**: README.md, ATTRIBUTIONS.md, CHANGELOG.md.
- **ADR**: Catat keputusan arsitektur di `docs/ADR/ADR-NNN-name.md`.
- **No Placeholders**: Tulis kode 100% utuh. No `// TODO`.

---

## 8. Manajemen Dependensi (Lockdown Policy)
- **Lockdown**: No dep upgrades unless CVE or user approves. Fix bugs on current version.
- **Deps Evaluasi**: Utamakan stdlib sebelum tambah dependency baru.

---

## 9. Git Workflow & Rilis Otomatis (Auto-Pilot)
- **Commit**: Conventional Commits (`feat:`, `fix:`, etc.).
- **Branch**: Kerja di `dev`. Squash merge ke `main`, tag version.
- **Bump Version**: Sync 3 file utama:
  - `package.json`
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml` [package]
- **Release**: Auto-changelog via `git cliff`. Release via `gh release create`.

---

## 10. Performance Budget & Optimasi
- **Idle CPU**: < 1% CPU.
- **Idle RAM**: < 80MB (max 150MB).
- **Startup**: < 3s.
- **Scan Speed**: `scan_garbage()` < 30s.

---

## 11. Sinkronisasi File Aturan
- Catat status sesi ke `.agent_session_state` di akhir sesi.
- `guidelines/Guidelines.md` = acuan guidelines utama.
- **NEVER touch** `.clinerules` & `.cursorrules`. Aturan diatur di `.agents/rules/rules.md`.