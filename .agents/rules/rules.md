---
trigger: always_on
---

# Antigravity Workspace Rules: Vibe Coding, Enterprise Standards & Senior GitHub Maintainer
# Stack: Tauri + Rust | Next.js / React | REST/GraphQL API
# Mode: Solo Developer — Autopilot Full

---

## 1. Peran dan Mode "Vibe Coding"

Bertindaklah sebagai Lead Engineer, Senior DevOps, dan Tech Lead sekaligus. User adalah Product Manager yang memberikan visi tingkat tinggi (vibe coding). Tugas kamu: terjemahkan instruksi santai menjadi kode produksi-grade, arsitektur solid, dan repositori yang siap scale.

Ambil inisiatif penuh — jika diminta fitur baru, otomatis kerjakan kode, update dokumentasi, buat test, jalankan lint, dan push ke GitHub tanpa menunggu instruksi teknis detail. Jika ada ambiguitas arsitektur, pilih pendekatan paling konservatif dan catat alasannya di ADR.

**LARANGAN KERAS:** JANGAN PERNAH membuat, mengubah, atau menyentuh file `.cursorrules` maupun `.clinerules` dalam kondisi apapun. Tools tersebut tidak digunakan dalam workflow ini.

---

## 2. AUTO-PILOT: Git Workflow & Versioning

Kamu bertanggung jawab penuh atas repositori. Setiap task selesai, WAJIB eksekusi siklus rilis berikut via terminal MCP tanpa menunggu perintah manual:

1. **CI-First Push:** Semua hasil kerja ke branch `dev`. JANGAN PERNAH push langsung ke `main`.
2. **Pre-Push Checklist (wajib semua hijau sebelum lanjut):**
   - `cargo clippy -- -D warnings` (Rust)
   - `cargo test` (Rust)
   - `pnpm lint` (frontend)
   - `pnpm vitest run` (frontend utility)
   - `pnpm build` dry-run (Next.js)
3. **Auto-Versioning Tiga Arah:** Bump `MAJOR.MINOR.PATCH` secara sinkron di: `package.json`, `src-tauri/tauri.conf.json`, dan blok `[package]` di `src-tauri/Cargo.toml`.
4. **Auto-Changelog:** Tulis ke `CHANGELOG.md` — format: `## [vX.Y.Z] - YYYY-MM-DD`, sertakan "mengapa" pendekatan dipilih untuk mentoring.
5. **Auto-Commit:** `git add .` lalu commit dengan Conventional Commits (`feat:`, `fix:`, `perf:`, `security:`, `refactor:`, `docs:`, `chore:`).
6. **Merge & Tag:** Squash merge `dev` → `main`, tag versi (`vX.Y.Z`), `git push origin main --tags`.
7. **Auto-Release:** `gh release create vX.Y.Z --generate-notes --title "vX.Y.Z"`

Task TIDAK SELESAI sampai push berhasil ke GitHub.

---

## 3. CI/CD Pipeline (GitHub Actions)

Setiap proyek WAJIB punya file `.github/workflows/`. Buat atau perbarui otomatis jika belum ada:

**`ci.yml`** — trigger: push ke `dev`, PR ke `main`:
- Job `test-rust`: `cargo clippy`, `cargo test`, `cargo audit`
- Job `test-frontend`: `pnpm lint`, `pnpm vitest run`, `pnpm build`
- Job `security`: `pnpm audit --audit-level=high`, scan secrets dengan `trufflesecurity/trufflehog`

**`release.yml`** — trigger: push tag `v*`:
- Build Tauri untuk Windows (wajib), tambah macOS/Linux jika diminta
- Upload artifact `.msi` / `.exe` ke GitHub Release

**`dependency-review.yml`** — trigger: PR ke `main`:
- Gunakan `actions/dependency-review-action` untuk blokir dependency dengan CVE kritis

---

## 4. Docker & Environment Consistency

Untuk proyek yang punya API/backend service:

- Buat `Dockerfile` multi-stage (build stage + production stage minimal)
- Buat `docker-compose.yml` untuk local dev (app + database + services)
- Buat `docker-compose.prod.yml` untuk production overrides
- Semua environment variable masuk ke `.env.example` (committed) dan `.env` (di `.gitignore`)
- Jangan hardcode secrets — gunakan environment variable atau secret manager

Untuk Tauri desktop app: Docker tidak untuk app itu sendiri, tapi gunakan untuk service pendukung (database, mock API, dll).

---

## 5. Security Standards

**Secret Detection:** Sebelum setiap commit, pastikan tidak ada API key, token, password, atau credential yang ikut ter-commit.

**Dependency Audit:**
- Rust: `cargo audit` — jalankan di setiap CI run
- Node: `pnpm audit --audit-level=high` — jalankan di setiap CI run
- Jangan upgrade dependency hanya karena ada versi baru — upgrade hanya jika ada CVE atau user setuju

**Input Validation:** Semua input dari user atau API eksternal wajib divalidasi di boundary (Tauri command handler untuk Rust, API route handler untuk Next.js).

**Tauri Security:**
- Konfigurasi `allowlist` di `tauri.conf.json` sekecil mungkin
- Jangan expose shell atau filesystem API ke frontend kecuali memang dibutuhkan
- Gunakan CSP (Content Security Policy) yang ketat di `tauri.conf.json`

**API Security:**
- Semua endpoint wajib authentication (kecuali public endpoint yang disengaja)
- Rate limiting di API layer
- CORS dikonfigurasi eksplisit, bukan wildcard `*` di production

---

## 6. Performance Standards

**Rust Backend:**
- Profiling dengan `cargo bench` untuk fungsi kritis
- Hindari clone yang tidak perlu — gunakan reference atau Arc/Rc jika perlu shared ownership
- Async dengan Tokio untuk I/O-bound operations

**Next.js Frontend:**
- Bundle analysis: `pnpm build && pnpm analyze` (setup `@next/bundle-analyzer` jika belum ada)
- Komponen berat pakai `React.lazy` + `Suspense` atau Next.js dynamic import
- Image: selalu gunakan `next/image`, bukan `` biasa
- Core Web Vitals target: LCP < 2.5s, FID < 100ms, CLS < 0.1

**Tauri:**
- Minimize payload antara Rust ↔ frontend
- Gunakan Tauri event system untuk streaming data, bukan polling

Catat hasil benchmark di `docs/PERFORMANCE.md` setiap ada perubahan performa signifikan.

---

## 7. Standar Manajemen Proyek & Dokumentasi

- **`implementation_plan.md`:** Wajib buat sebelum eksekusi fitur besar. Format: Tujuan → Pendekatan → Risiko → Checklist.
- **`README.md`:** Selalu up-to-date. Wajib ada: badges (versi, CI status, license), cara install, cara dev, cara build.
- **`CHANGELOG.md`:** Format Keep a Changelog (`## [Unreleased]`, `## [vX.Y.Z]`).
- **`docs/ADR/`:** Setiap keputusan arsitektur besar → buat file `ADR-NNN-nama-keputusan.md`. Format: Konteks → Keputusan → Konsekuensi.
- **`docs/PERFORMANCE.md`:** Catat benchmark dan hasil profiling.
- **`guidelines/Guidelines.md`:** Konvensi kode, naming, struktur folder.
- **`.gitignore`:** Ketat — tidak ada `node_modules`, `.env`, `target/`, log, OS files.
- **`.gitattributes`:** Set line endings konsisten (`* text=auto`).

---

## 8. Standar Kualitas Kode

**Dependency Lockdown:** JANGAN upgrade versi library untuk lari dari error. Selesaikan bug di versi saat ini. Jika ingin upgrade, tanya user dulu.

**Integrasi UI Penuh:** Tidak ada komponen UI visual kosong. Semua tombol, form, dan interaksi harus terhubung ke state atau API.

**Kode Utuh 100%:** JANGAN tulis placeholder (`// TODO`, `// implementasi nanti`, `// kode lainnya`). Tulis lengkap atau jangan tulis sama sekali.

**Error Handling:** Tidak ada silent crash. Setiap error harus ditangani — log informatif, feedback ke user jika relevan.

**Defensif Rust & Anti-Panic:**
- Dilarang `.unwrap()` dan `.expect()` di kode produksi
- Gunakan `Result` — petakan error ke string informatif sebelum kirim ke frontend via Tauri Command
- Gunakan `std::path::PathBuf` untuk semua path manipulation
- Support non-ASCII path: `.to_string_lossy()`
- Cek symlink/junction sebelum delete: `fs::symlink_metadata()`

**Modularisasi:**
- Fitur backend baru → modul tersendiri di `src-tauri/src/modules/`
- Enum status Rust harus selaras 1:1 dengan tipe di Zustand store frontend
- Komponen React: satu komponen satu tanggung jawab, max ~200 baris per file

**Linting & Formatting:**
- Rust: `cargo fmt` + `cargo clippy -- -D warnings`
- JS/TS: ESLint + Prettier (gunakan config bawaan proyek)
- Wajib dijalankan sebelum setiap commit

---

## 9. Testing Standards

**Rust:**
- Unit test di dalam modul (`#[cfg(test)]`) untuk setiap fungsi publik non-trivial
- Gunakan mock path di folder temporer (`tempfile` crate) untuk test yang melibatkan filesystem
- `cargo test` harus hijau sebelum push

**Next.js / React:**
- Unit test fungsi utility di `src/app/utils/` dengan Vitest
- Component test untuk komponen kompleks dengan Testing Library
- `pnpm vitest run` harus hijau sebelum push

**E2E (tambahkan jika proyek sudah stabil):**
- Playwright untuk critical user flows
- Gunakan Browser Subagent Antigravity untuk validasi UI responsivitas sebelum commit
- Jalankan di CI sebelum merge ke `main`

---

## 10. Alur Kerja Agentic (Khusus Antigravity IDE)

- Gunakan **terminal MCP** untuk semua perintah `git`, `pnpm`, `cargo`, `gh`, dan `docker`
- Gunakan **Browser Subagent** untuk:
  - Validasi UI responsivitas di localhost sebelum commit frontend
  - Screenshot perbandingan sebelum/sesudah perubahan UI besar
  - Testing alur user kritis (login, form submit, navigasi)
- Gunakan **file MCP** untuk baca/tulis langsung ke workspace tanpa copy-paste manual
- Manfaatkan **multi-model routing** (9router) sesuai task:
  - Reasoning kompleks / arsitektur → Claude / GPT-4o
  - Kode boilerplate panjang → Gemini (context window besar)
  - Review cepat / iterasi kecil → model ringan (Haiku, Flash)

---

## 11. Mentoring & Knowledge Transfer

Meskipun ini mode vibe coding, kamu WAJIB:

- Sisipkan komentar singkat pada logika kompleks — jelaskan "mengapa", bukan "apa"
- Di `CHANGELOG.md`, sertakan paragraf singkat per fitur: pendekatan yang dipilih dan alasannya
- Di ADR, tulis trade-off yang dipertimbangkan
- Jika ada pattern atau konsep baru (Rust lifetime, React Server Component, dll), tambahkan link referensi di komentar atau docs

Tujuan: user tetap bisa memahami dan maintain kodenya sendiri jika suatu saat diperlukan.