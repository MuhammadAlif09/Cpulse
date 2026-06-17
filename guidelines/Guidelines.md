# Cpulse — Project Guidelines

File ini dibaca wajib di awal setiap task oleh semua AI agent (Cline, Codex, Antigravity, dll) tanpa perlu diperintah.

---

## 1. Keamanan & Penanganan Error

- **Dilarang panic:** Dilarang pakai `.unwrap()` atau `.expect()` pada operasi file, network, dan registry. Semua error wajib ditangani dengan `Result<T, E>` dan diteruskan ke layer di atasnya dengan pesan yang jelas.
- **Validasi di backend:** Fitur yang butuh privilege admin wajib divalidasi di sisi Rust sebelum eksekusi. Proteksi visual (tombol disabled) di frontend tidak cukup.
- **Sanitasi input Tauri command:** Semua parameter yang diterima dari frontend via `#[tauri::command]` wajib divalidasi di sisi Rust sebelum diproses — termasuk path traversal check (`..`, absolute path injection), panjang string, dan karakter ilegal. Jangan percaya data dari frontend secara buta.
- **Recycle Bin:** Hapus file user wajib lewat Recycle Bin menggunakan crate `trash`, kecuali folder Temp yang boleh dihapus permanen.
  - Standard Mode = mode default scan biasa → wajib Recycle Bin.
  - Jika ke depan ada Deep/Aggressive Mode → wajib ada dialog konfirmasi eksplisit dari user, tidak boleh jadi default.
- **Batas ukuran scan:** Tambahkan batas maksimum jumlah file yang di-scan per operasi (misal 100.000 file) dan batas ukuran path string (misal 4096 karakter). Ini mencegah OOM dan stack overflow pada direktori yang abnormal.
- **Audit log:** Setiap operasi hapus/pindah file wajib dicatat (path, ukuran, timestamp, hasil sukses/gagal).

---

## 2. Arsitektur Komunikasi Tauri (Backend ↔ Frontend)

- **Data realtime → Tauri Events (`emit`):** CPU dan RAM dikirim via event interval 1 detik. GPU dan Network cukup interval 3 detik (lebih jarang karena perubahan tidak se-volatile CPU).
- **Aksi sekali jalan → Tauri Commands (`#[tauri::command]`):** `scan_garbage()`, `clean_garbage()`, `trigger_admin_restart()`, dll.
- **Timeout untuk long-running commands:** Command seperti `scan_garbage()` dan `clean_garbage()` wajib punya timeout (misal 60 detik) dan dapat dibatalkan via command `cancel_scan()` terpisah. Jangan biarkan UI frozen tanpa batas.
- **Cleanup listener:** Setiap komponen React yang `listen()` ke Tauri event wajib memanggil `unlisten` di `useEffect` return function untuk mencegah memory leak atau listener ganda.
- **Error propagation:** Semua Tauri command wajib return `Result<T, String>` — bukan panic, bukan silent fail. Frontend wajib handle kedua case (`ok` dan `error`) dari setiap `invoke()`.

---

## 3. Struktur Kode & UI

- **Gunakan CSS variable:** Jangan hardcode warna atau font di komponen baru. Pakai variabel dari `src/styles/theme.css` dan `globals.css`.
- **Cek komponen yang ada:** Sebelum buat komponen baru, cek dulu `src/app/components/ui/`. Gunakan shadcn/ui yang sudah tersedia.
- **State management — Zustand:** Gunakan **Zustand** sebagai satu-satunya solusi state management global. Jangan pakai React Context untuk state yang dipakai lintas komponen, dan jangan campur pendekatan ad-hoc. Context hanya boleh untuk dependency injection statis (misal theme provider).
- **Naming convention:**
  - Komponen React: `PascalCase` (misal `CleanerTab.tsx`)
  - Custom hooks: prefix `use` + `camelCase` (misal `useSystemStats.ts`)
  - Tauri commands di Rust: `snake_case` (misal `scan_garbage`)
  - Store Zustand: suffix `Store` (misal `useCleanerStore.ts`)
- **Error boundaries:** Setiap tab utama (BoosterTab, CleanerTab, dll) wajib dibungkus `ErrorBoundary` untuk mencegah crash seluruh UI jika satu fitur gagal.
- **Edukasi user:** Setiap opsi pembersihan wajib punya properti `description` dan `warning` untuk tooltip/penjelasan di UI.
- **Accessibility (a11y):** Semua elemen interaktif (tombol, toggle, input) wajib punya `aria-label` atau teks yang deskriptif. Jangan andalkan warna saja sebagai satu-satunya indikator status.

---

## 4. Testing

- **Unit test fungsi kritis (Rust):** Fungsi yang berisiko menyebabkan kerusakan data (logika scan, path matching, path validation) wajib punya unit test di sisi Rust menggunakan `#[cfg(test)]`.
- **Unit test frontend (Vitest):** Fungsi utility di `src/app/utils/` yang melakukan transformasi data (misal format byte size, parse path, filter list) wajib ditest dengan Vitest. Bukan komponen UI, cukup pure functions.
- **Test tidak boleh menyentuh filesystem nyata:** Mock semua operasi file/registry dalam test. Gunakan path dummy atau temporary directory.

---

## 5. Dependensi & Dokumentasi

- **Cek build setelah tambah dependency:** Setelah tambah crate Rust atau package npm baru, jalankan `cargo check` atau `pnpm tauri dev` dulu sebelum lanjut nulis kode.
- **Catat library besar:** Jika menggunakan library pihak ketiga yang signifikan, catat di `ATTRIBUTIONS.md`.
- **Jangan tambah dependency untuk hal trivial:** Sebelum install package baru, tanya dulu apakah bisa diselesaikan dengan stdlib Rust atau utility yang sudah ada. Dependency baru = surface attack lebih luas dan binary lebih besar.

---

## 6. Versioning (Semantic Versioning `MAJOR.MINOR.PATCH`)

- **PATCH** (misal 0.1.0 → 0.1.1): bug fix kecil, typo, penyesuaian minor yang tidak mengubah fitur.
- **MINOR** (misal 0.1.0 → 0.2.0): fitur baru yang stabil, perubahan UI/UX yang menambah fungsionalitas, selama tidak merusak yang sudah ada.
- **MAJOR** (misal 0.x.x → 1.0.0): milestone rilis publik stabil. Syarat naik ke `1.0.0`: semua tab utama berfungsi penuh, tidak ada known critical bug, alur instalasi berjalan di clean machine.
- Bump versi **hanya** setelah user konfirmasi build valid — tidak setiap commit.
- `package.json` dan `src-tauri/tauri.conf.json` harus **selalu identik** angka versinya.

---

## 7. CHANGELOG.md — Sumber Kebenaran Versi

- Setiap task/prompt yang menghasilkan perubahan kode wajib menambahkan entri di `CHANGELOG.md` di bawah `## [Unreleased]`, dikategorikan:
  - `Added` → kandidat MINOR
  - `Fixed` / `Changed` minor → kandidat PATCH
  - `Breaking` / `Removed` besar → kandidat MAJOR
- Saat versi di-bump, ubah `[Unreleased]` jadi `## [x.y.z] - YYYY-MM-DD`, lalu buat `[Unreleased]` baru yang kosong di atasnya.
- Jenis bump ditentukan kategori tertinggi sejak rilis terakhir: Breaking > Added > Fixed.
- Saat bump terjadi, sinkronkan ke:
  1. `package.json`
  2. `src-tauri/tauri.conf.json`
  3. Tag Git `vX.Y.Z`
  4. GitHub Release (deskripsi dari entri CHANGELOG, asset dari GitHub Actions)

---

## 8. Git & Commit

- **Format wajib Conventional Commits:** Semua commit pakai prefix `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `style:`, `build:`, `ci:`.
- **Selalu pakai flag `-m`:** Jangan biarkan editor commit terbuka.
- **Branch protection:** `main` hanya boleh diupdate via merge dari `dev`. Dilarang direct push ke `main`.
- **Merge strategy:** Gunakan **squash merge** saat merge `dev` → `main` agar history `main` tetap bersih satu commit per fitur/rilis. Di branch `dev` sendiri boleh commit bebas.
- **Jangan push ke `main` tanpa konfirmasi user.**

---

## 9. Alur Rilis (Wajib Diikuti Urut)

> User tidak bisa build lokal. Build dilakukan otomatis via GitHub Actions setelah push.

1. Setelah kode selesai, push ke branch `dev` (bukan `main`). Versi belum di-bump.
2. GitHub Actions otomatis build artifact dari branch `dev`.
3. Beritahu user: apa yang berubah + daftar langkah testing setelah download artifact dari Actions.
4. Tunggu konfirmasi user: **valid** atau **error**.
5. Jika **valid** → bump version, update CHANGELOG, squash merge ke `main`, buat tag `vX.Y.Z`, buat GitHub Release.
6. Jika **error** → perbaiki di branch `dev` yang sama (versi belum berubah), ulangi dari langkah 1.

**Rollback procedure:** Jika GitHub Release yang sudah publish ternyata bermasalah setelah distribusi, langkah wajib:
1. Mark release sebagai `pre-release` di GitHub untuk menandainya tidak stabil.
2. Buat hotfix branch dari tag yang bermasalah: `git checkout -b hotfix/vX.Y.Z vX.Y.Z`.
3. Perbaiki, push hotfix ke `dev`, ikuti alur rilis normal dari langkah 2.
4. Bump PATCH version untuk hotfix release.

`main` hanya berisi versi yang sudah terbukti bisa dijalankan oleh user.

---

## 10. Performance Budget

- **Idle CPU usage:** Aplikasi saat idle (tidak ada operasi aktif) tidak boleh mengonsumsi lebih dari **1% CPU** secara sustained.
- **Idle RAM usage:** Target di bawah **80 MB** RAM saat idle. Di atas 150 MB perlu investigasi.
- **Startup time:** Waktu dari launch hingga UI siap interaktif tidak boleh lebih dari **3 detik** pada hardware mid-range.
- **Scan duration:** Operasi `scan_garbage()` pada direktori standar Windows wajib selesai dalam **30 detik**. Jika lebih, tampilkan progress indicator.
- Jika ada regresi performa signifikan pada suatu PR, wajib dicatat di CHANGELOG sebagai `Changed`.

---

## 11. Aturan Tambahan

- Setiap kali menggunakan `git-cliff` untuk generate CHANGELOG, jalankan `git cliff --unreleased --prepend CHANGELOG.md` terlebih dahulu agar entri dari commit history otomatis masuk.
- `cliff.toml` ada di root repo — gunakan konfigurasi yang sudah ada, jangan overwrite tanpa alasan.
- File ini (`guidelines/Guidelines.md`) adalah pengganti `.clinerules`. Jangan hapus atau pindahkan.