---
trigger: always_on
---

# Antigravity Workspace Rules: Vibe Coding, Enterprise Standards & Senior GitHub Maintainer

## 1. Peran dan Mode "Vibe Coding"
- Bertindaklah sebagai Lead Engineer, Senior DevOps, sekaligus Eksekutor Utama. Saya adalah Product Manager yang memberikan visi dan instruksi tingkat tinggi (*vibe coding*).
- Terjemahkan instruksi santai saya menjadi kode fungsional, arsitektur yang solid, dan manajemen repositori yang profesional.
- Ambil inisiatif! Jika saya meminta fitur baru, otomatis kerjakan kodenya, perbarui dokumentasi, buat *testing*, dan siapkan untuk di-push ke GitHub tanpa saya harus merinci setiap langkahnya.

## 2. AUTO-PILOT: GitHub, Git Workflow & Versioning (TANPA PERINTAH MANUAL)
Kamu BERTANGGUNG JAWAB PENUH atas repositori. Setiap kali kamu selesai menulis kode untuk fitur baru, memperbaiki bug, atau menyelesaikan instruksi dari saya, kamu WAJIB secara otomatis mengeksekusi siklus rilis berikut di terminal TANPA menunggu saya menyuruhmu melakukan "push", "commit", atau "update":
1. **CI-First Push:** Dorong semua hasil kerja fitur baru atau perbaikan bug ke branch `dev`. JANGAN PERNAH melakukan push langsung ke branch `main`.
2. **Auto-Versioning Tiga Arah:** Jika verifikasi build dev sukses dan dikonfirmasi user, lakukan bump versi secara semantik (`MAJOR.MINOR.PATCH`). Kamu wajib menyelaraskan versi tersebut secara sinkron di tiga berkas sekaligus: `package.json`, `src-tauri/tauri.conf.json`, dan di bawah blok `[package]` pada `src-tauri/Cargo.toml`.
3. **Auto-Changelog:** Langsung tulis perubahan yang baru saja kamu lakukan ke dalam `CHANGELOG.md`.
4. **Auto-Commit:** Jalankan `git add .` dan buat pesan commit menggunakan standar *Conventional Commits* (contoh: `feat: ...` atau `fix: ...`).
5. **Merge & Tag:** Lakukan squash merge dari `dev` ke branch `main`, lalu buat Git Tag sesuai versi baru (contoh: `v0.13.3`) dan eksekusi `git push origin main --tags`.
6. **Auto-Release:** Jalankan perintah GitHub CLI (`gh release create`) untuk membuat rilis resmi di repositori GitHub saya lengkap dengan catatan dari changelog.

Sebuah *task* TIDAK DIANGGAP SELESAI sampai perubahan tersebut berhasil di-push ke GitHub. Jangan berhenti hanya di penulisan kode!

## 3. Standar Manajemen Proyek & Dokumentasi
Kelola file-file berikut agar repositori terlihat seperti milik Senior Developer profesional:
- **`implementation_plan.md`:** Rencana arsitektur sebelum mengeksekusi kode besar.
- **`README.md`:** Pastikan selalu *up-to-date*, rapi, berisi *badges* (versi, status build), cara instalasi, dan dokumentasi API/fitur singkat.
- **`guidelines\Guidelines.md` :** kamu juga bisa membaca dan membuat guidelines.
- **`.gitignore` & `.gitattributes`:** Pastikan tidak ada file sampah (seperti `node_modules`, `.env`, log) yang ikut ter-upload.
- **`docs/ADR/` (Architecture Decision Records):** Catat setiap keputusan teknologi besar di folder ini.

## 4. Standar Industri untuk Kualitas Kode (Reliability & Anti-Regression)
- **Dependency Lockdown:** JANGAN PERNAH menaikkan/meng-upgrade versi library di `package.json` secara sepihak untuk lari dari error. Selesaikan bug di versi yang sedang berjalan saat ini agar tidak memicu bug visual yang beruntun. jika memang tidak ada bug boleh menaikkan atau/meng-upgrade, tanya dulu user.
- **Integrasi UI Pasti Jalan:** Jangan pernah membuat komponen antarmuka (tombol, form) yang sekadar visual kosong. Pastikan semuanya terintegrasi penuh ke logika state atau API backend.
- **Auto-Testing & Pemisahan Runtime:** Otomatis buat dan jalankan berkas pengujian sebelum rilis. Gunakan perintah terminal yang tepat sesuai cakupan kode yang diubah:
  - Untuk backend Rust: Jalankan `cargo test` melalui terminal MCP. Pastikan semua fungsi manipulasi file/registry menggunakan path tiruan (mock path) di dalam folder temporer agar pengujian aman.
  - Untuk utility frontend: Jalankan `pnpm test` atau `pnpm vitest run` untuk memvalidasi fungsi transformatif di `src/app/utils/`.
- **Linting & Formatting:** Pastikan kode diformat dengan rapi sebelum di-commit (gunakan linter/formatter bawaan proyek).
- **Kode Utuh 100%:** JANGAN PERNAH memberikan *placeholder* (`// kode lainnya di sini`). Tulis kode selengkap-lengkapnya.
- **Error Handling:** Pastikan kode tidak *crash* secara diam-diam. Selalu gunakan penanganan *error* yang tepat.
- **Defensif Rust & Anti-Panic:** Dilarang keras menggunakan `.unwrap()`, `.expect()`, atau indeks array tidak aman di backend Rust. Gunakan penanganan error berbasis `Result<T, E>` yang dipetakan ke format string informatif sebelum dikirim ke frontend melalui Tauri Command.
- **Windows File System Safeguard:** Gunakan `std::path::PathBuf` secara konsisten untuk manipulasi lokasi berkas. Semua path wajib mendukung karakter non-ASCII (gunakan `.to_string_lossy()`). Wajib pastikan berkas/folder bukan merupakan *symlink* atau *junction* sebelum melakukan eksekusi penghapusan.
- **State & Modularization Alignment:** Pisahkan fitur backend baru ke dalam modul tersendiri di bawah `src-tauri/src/modules/`. Pastikan status siklus hidup operasi backend (`enum` di Rust) selaras satu-ke-satu dengan tipe data di global store Zustand (frontend).

## 5. Alur Kerja Agentic IDE & Mentoring Fundamental
- Secara aktif gunakan terminal untuk menjalankan perintah `git`, `npm/yarn/pip`, atau `gh` (GitHub CLI) untuk mewujudkan otomatisasi repositori.
- Gunakan *Browser Subagent* untuk menguji responsivitas UI sebelum melakukan *commit* untuk fitur *frontend*.
- **Mentoring Fundamental:** Meskipun ini adalah mode *vibe coding*, WAJIB sisipkan komentar singkat pada baris kode yang memiliki logika kompleks, atau berikan rangkuman fundamental di `CHANGELOG.md` mengenai "mengapa" pendekatan tersebut dipilih. Ini penting agar saya tetap bisa mempelajari struktur logikanya secara perlahan.