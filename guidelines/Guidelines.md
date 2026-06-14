# Cpulse — Project Guidelines

File ini dibaca wajib di awal setiap task oleh semua AI agent (Cline, Codex, dll) tanpa perlu diperintah.

---

## 1. Keamanan & Penanganan Error

- **Dilarang panic:** Dilarang pakai `.unwrap()` atau `.expect()` pada operasi file, network, dan registry. Semua error wajib ditangani dengan `Result<T, E>` dan diteruskan ke layer di atasnya dengan pesan yang jelas.
- **Validasi di backend:** Fitur yang butuh privilege admin wajib divalidasi di sisi Rust sebelum eksekusi. Proteksi visual (tombol disabled) di frontend tidak cukup.
- **Recycle Bin:** Hapus file user wajib lewat Recycle Bin menggunakan crate `trash`, kecuali folder Temp yang boleh dihapus permanen.
  - Standard Mode = mode default scan biasa → wajib Recycle Bin.
  - Jika ke depan ada Deep/Aggressive Mode → wajib ada dialog konfirmasi eksplisit dari user, tidak boleh jadi default.
- **Audit log:** Setiap operasi hapus/pindah file wajib dicatat (path, ukuran, timestamp, hasil sukses/gagal).

---

## 2. Arsitektur Komunikasi Tauri (Backend ↔ Frontend)

- **Data realtime → Tauri Events (`emit`):** CPU, RAM, GPU, Network dikirim via event berbasis interval (per 1 detik), bukan di-poll berulang dengan `invoke`.
- **Aksi sekali jalan → Tauri Commands (`#[tauri::command]`):** `scan_garbage()`, `clean_garbage()`, `trigger_admin_restart()`, dll.
- **Cleanup listener:** Setiap komponen React yang `listen()` ke Tauri event wajib memanggil `unlisten` di `useEffect` return function untuk mencegah memory leak atau listener ganda.

---

## 3. Struktur Kode & UI

- **Gunakan CSS variable:** Jangan hardcode warna atau font di komponen baru. Pakai variabel dari `src/styles/theme.css` dan `globals.css`.
- **Cek komponen yang ada:** Sebelum buat komponen baru, cek dulu `src/app/components/ui/`. Gunakan shadcn/ui yang sudah tersedia.
- **State management konsisten:** Gunakan satu pola (misal Zustand atau React Context) untuk data yang dipakai di banyak komponen. Jangan campur pendekatan ad-hoc.
- **Edukasi user:** Setiap opsi pembersihan wajib punya properti `description` dan `warning` untuk tooltip/penjelasan di UI.

---

## 4. Dependensi & Dokumentasi

- **Cek build setelah tambah dependency:** Setelah tambah crate Rust atau package npm baru, jalankan `cargo check` atau `pnpm tauri dev` dulu sebelum lanjut nulis kode.
- **Catat library besar:** Jika menggunakan library pihak ketiga yang signifikan, catat di `ATTRIBUTIONS.md`.
- **Unit test fungsi kritis:** Fungsi yang berisiko menyebabkan kerusakan data (logika scan, path matching, dll) wajib punya unit test minimal di sisi Rust.

---

## 5. Versioning (Semantic Versioning `MAJOR.MINOR.PATCH`)

- **PATCH** (misal 0.1.0 → 0.1.1): bug fix kecil, typo, penyesuaian minor yang tidak mengubah fitur.
- **MINOR** (misal 0.1.0 → 0.2.0): fitur baru yang stabil, perubahan UI/UX yang menambah fungsionalitas, selama tidak merusak yang sudah ada.
- **MAJOR** (misal 0.x.x → 1.0.0): rilis besar/milestone, breaking change arsitektur inti, atau redesign total. Selama masih `0.x.x`, project dianggap dalam pengembangan aktif.
- Bump versi **hanya** setelah user konfirmasi build valid — tidak setiap commit.
- `package.json` dan `src-tauri/tauri.conf.json` harus **selalu identik** angka versinya.

---

## 6. CHANGELOG.md — Sumber Kebenaran Versi

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

## 7. Git & Commit

- **Format wajib Conventional Commits:** Semua commit pakai prefix `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `style:`, `build:`, `ci:`.
- **Selalu pakai flag `-m`:** Jangan biarkan editor commit terbuka — ini mencegah output `git status` tidak sengaja masuk ke commit message.
- **Jangan push ke `main` tanpa konfirmasi user.**

---

## 8. Alur Rilis (Wajib Diikuti Urut)

> User tidak bisa build lokal. Build dilakukan otomatis via GitHub Actions setelah push.

1. Setelah kode selesai, push ke branch `dev` (bukan `main`). Versi belum di-bump.
2. GitHub Actions otomatis build artifact dari branch `dev`.
3. Beritahu user: apa yang berubah + daftar langkah testing setelah download artifact dari Actions.
4. Tunggu konfirmasi user: **valid** atau **error**.
5. Jika **valid** → bump version, update CHANGELOG, merge ke `main`, buat tag `vX.Y.Z`, buat GitHub Release.
6. Jika **error** → perbaiki di branch `dev` yang sama (versi belum berubah), ulangi dari langkah 1.

`main` hanya berisi versi yang sudah terbukti bisa dijalankan oleh user.

---

## 9. Aturan Tambahan

- Setiap kali menggunakan `git-cliff` untuk generate CHANGELOG, jalankan `git cliff --unreleased --prepend CHANGELOG.md` terlebih dahulu agar entri dari commit history otomatis masuk.
- `cliff.toml` ada di root repo — gunakan konfigurasi yang sudah ada, jangan overwrite tanpa alasan.
- File ini (`guidelines/Guidelines.md`) adalah pengganti `.clinerules`. Jangan hapus atau pindahkan.