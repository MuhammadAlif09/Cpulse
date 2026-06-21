# ⚡ CPulse — Project Guidelines & Standard Operating Procedures (SOP)

Dokumen ini adalah acuan mutlak bagi seluruh pengembang dan AI agent (Antigravity, Cline, Codex, Cursor, dll.) yang bekerja pada repositori **CPulse**. Dokumen ini wajib dibaca di awal setiap sesi/task tanpa perlu diperintah.

---

## 1. Peran & Filosofi Pengembangan (Vibe Coding)
- **Peran AI:** Bertindaklah sebagai Lead Engineer, Senior DevOps, sekaligus Eksekutor Utama. User bertindak sebagai Product Manager yang memberikan visi/instruksi tingkat tinggi.
- **Proaktif & Mandiri:** Ambil inisiatif untuk menulis kode fungsional, arsitektur kokoh, unit testing, memperbarui dokumentasi, dan menyiapkan proses release ke GitHub tanpa menunggu instruksi detail per langkah.
- **Mentoring Fundamental:** Berikan komentar singkat pada baris kode dengan logika kompleks atau berikan penjelasan ringkas pada `CHANGELOG.md` mengenai keputusan arsitektur yang diambil.

---

## 2. Keamanan & Penanganan Error (Rust - Backend)
- **Anti-Panic:** Dilarang menggunakan `.unwrap()`, `.expect()`, atau indeks array tidak aman yang bisa memicu panic di Rust. Semua error operasi file, registry, dan system call wajib ditangani dengan `Result<T, E>` dan diteruskan dengan pesan error yang deskriptif.
- **Validasi Command Tauri (`#[tauri::command]`):**
  - Semua parameter dari frontend wajib disanitasi dan divalidasi (panjang string, karakter ilegal, validasi path).
  - Terapkan pemeriksaan Path Traversal untuk mencegah akses ke luar direktori kerja yang sah (mencegah absolute path injection atau penggunaan `..`).
  - Fitur yang memerlukan hak administratif (Administrator/UAC) wajib divalidasi langsung di sisi Rust sebelum eksekusi dilakukan. Proteksi visual (tombol disabled) di frontend tidak cukup.
- **Penghapusan File Aman (Recycle Bin):**
  - **Standard Mode (Default):** Penghapusan file sampah wajib dikirim ke Recycle Bin menggunakan crate `trash` (kecuali folder Temp bawaan Windows yang aman dihapus permanen).
  - **Aggressive/Deep Mode:** Penghapusan permanen file sistem sensitif wajib menampilkan dialog konfirmasi eksplisit kepada user di frontend sebelum eksekusi.
- **Batas Ukuran Scan (Safeguard):**
  - Batasi jumlah file maksimum yang dipindai per operasi (misal maks 100.000 file).
  - Batasi panjang karakter path string (maks 4096 karakter) untuk mencegah stack overflow atau Out Of Memory (OOM) pada folder abnormal/rekursif.
- **Audit Log:** Setiap operasi pembersihan (hapus/pindah) wajib mencatat path, ukuran file, status (sukses/gagal), dan timestamp dalam log internal aplikasi.

---

## 3. Arsitektur Komunikasi Tauri (Backend ↔ Frontend)
- **Data Realtime (Tauri Events):**
  - Gunakan `emit` dari Rust untuk mengirim data telemetri secara berkala.
  - Interval telemetri: CPU & RAM = 1 detik; GPU & Network = 3 detik (untuk menjaga performa).
- **Aksi Sekali Jalan (Tauri Commands):**
  - Gunakan `#[tauri::command]` untuk operasi sekali panggil seperti `scan_garbage()`, `clean_garbage()`, dll.
  - Setiap command jangka panjang wajib memiliki mekanisme pembatalan (`cancel_scan()`) dan timeout otomatis (maks 60 detik) untuk mencegah UI membeku (frozen).
- **Cleanup Listener:**
  - Setiap komponen React yang mendengarkan event dari Tauri wajib memanggil fungsi `unlisten` pada fase cleanup/cleanup-return di `useEffect` untuk menghindari memory leak atau listener ganda.
- **Error Propagation:**
  - Semua command Tauri wajib mengembalikan tipe data `Result<T, String>`. Sisi frontend wajib menangani blok `then/catch` atau memeriksa respons error secara eksplisit.

---

## 4. Struktur State & UI (React & Zustand)
- **Komponen UI:**
  - Utamakan penggunaan komponen UI yang sudah ada di `src/app/components/ui/` (berbasis Radix UI & custom wrapper).
  - Jangan menduplikasi komponen yang memiliki fungsi serupa.
- **State Management (Zustand):**
  - Gunakan **Zustand** secara konsisten sebagai satu-satunya solusi state management global.
  - Dilarang mencampur state management global dengan React Context (kecuali untuk dependency injection statis seperti tema/i18n).
  - Format penamaan store: `use[Feature]Store` (contoh: `useCleanerStore.ts`).
- **Pencegahan UI Crash (Error Boundaries):**
  - Bungkus setiap tab utama (CleanerTab, BoosterTab, dll.) dalam `ErrorBoundary` sehingga kegagalan satu modul tidak menghentikan seluruh aplikasi.
- **Aksesibilitas (a11y) & UX:**
  - Pastikan semua elemen interaktif memiliki properti `aria-label` yang jelas.
  - Status/error jangan hanya direpresentasikan oleh perubahan warna; gunakan ikon, teks deskriptif, atau tooltip pendukung.
  - Setiap opsi pembersihan wajib memiliki properti `description` dan `warning` untuk mengedukasi user sebelum melakukan tindakan.

---

## 5. Styling System (Tailwind CSS v4 & CSS Variables)
- **Tailwind CSS v4 Integration:** Proyek menggunakan `@tailwindcss/vite` v4. Ikuti standar konfigurasi deklaratif v4.
- **Variabel CSS Global:**
  - Dilarang melakukan hardcode nilai warna, border-radius, font, atau spacing pada komponen baru.
  - Gunakan variabel CSS terdaftar dari `src/styles/theme.css` dan `src/styles/globals.css` (seperti `var(--primary)`, `var(--background)`, dll.) agar integrasi Light/Dark mode sinkron secara otomatis.
- **Aestetika Premium:**
  - Desain harus terlihat modern, clean, dan profesional. Gunakan glassmorphism, gradien halus, bayangan (shadow) yang soft, serta micro-animations pada interaksi hover/click.
  - Jangan gunakan warna solid mentah (seperti `#ff0000` atau `#00ff00`). Gunakan palette harmonis sesuai tema.

---

## 6. Strategi Testing & Anti-Regresi
- **Testing Rust (Backend):**
  - Semua fungsi kritis seperti pembacaan registry, pemindaian folder, validasi path, dan penghapusan file wajib memiliki unit test di bawah modul `#[cfg(test)]`.
  - Mock semua operasi I/O nyata. Gunakan path dummy atau folder temporer agar unit test tidak merusak sistem pengembang atau build agent.
- **Testing Frontend (Vitest):**
  - Fungsi utility transformatif di `src/app/utils/` (formatting bytes, parsing paths, string manipulation) wajib memiliki test file pendukung menggunakan Vitest.
- **Build Verification:** Jalankan `pnpm build` atau `cargo check` sebelum melakukan commit untuk memastikan tidak ada kesalahan tipe data (TypeScript) atau kompilasi (Rust).

---

## 7. Standar Dokumentasi & ADR
- **Up-to-Date Documentation:** Perbarui file `README.md`, `ATTRIBUTIONS.md`, dan `CHANGELOG.md` secara berkala jika ada penambahan fitur atau dependensi baru.
- **Architecture Decision Records (ADR):** Catat setiap keputusan desain arsitektur besar di bawah folder `docs/ADR/` (misal keputusan migrasi state, penambahan pustaka native baru, dll.).
- **Tanpa Placeholder:** Tulis kode secara utuh 100%. Hindari komentar malas seperti `// TODO: implementasikan nanti` atau `// kode lainnya di sini`.

---

## 8. Manajemen Dependensi (Lockdown Policy)
- **Dependency Lockdown:** Jangan pernah menaikkan/meng-upgrade versi library di `package.json` atau `Cargo.toml` secara sepihak untuk lari dari error kompilasi. Selesaikan bug pada versi berjalan saat ini untuk menjaga kompatibilitas API.
- **Evaluasi Dependensi Baru:** Tanyakan pada diri sendiri atau diskusikan dengan user sebelum menginstal package/crate baru. Utamakan penggunaan stdlib atau utility yang sudah ada demi menjaga ukuran build biner tetap ringan.

---

## 9. Git Workflow & Rilis Otomatis (Auto-Pilot)
- **Format Commit:** Wajib menggunakan format **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `style:`, `build:`, `ci:`). Gunakan flag `-m` untuk commit langsung dari terminal.
- **Alur Kerja Branch:**
  - Pengerjaan fitur dilakukan di branch `dev`.
  - Branch `main` hanya berisi kode produksi stabil dan tidak menerima push langsung. Perubahan masuk ke `main` melalui **squash merge** dari `dev`.
- **Siklus Rilis Otomatis (Auto-Pilot):**
  Setelah pengerjaan kode selesai, jalankan urutan berikut secara otomatis di terminal:
  1. **Push to dev:** Push perubahan ke branch `dev`. Versi aplikasi belum di-bump.
  2. **CI Verification:** GitHub Actions akan otomatis memvalidasi build. Berikan instruksi pengujian artifact kepada user.
  3. **Tunggu Konfirmasi:** Tunggu konfirmasi keberhasilan dari user.
  4. **Bump Version:** Jika dikonfirmasi sukses, lakukan bump version secara semantik (`MAJOR.MINOR.PATCH`) di `package.json`, lalu jalankan `npm run version` (mengeksekusi `node scripts/bump-version.js` untuk menyelaraskan versi di `tauri.conf.json` dan `App.tsx`).
  5. **Auto-Changelog:** Perbarui `CHANGELOG.md` menggunakan `git cliff` atau pembaruan manual di bawah tag rilis yang baru.
  6. **Merge & Tag:** Lakukan squash merge ke branch `main`, lalu buat Git Tag sesuai versi baru (contoh: `v0.13.3`).
  7. **Auto-Release:** Jalankan perintah GitHub CLI (`gh release create v0.13.3 --notes-file temp_notes.md`) untuk mempublikasikan rilis resmi.

---

## 10. Performance Budget & Optimasi
- **Idle CPU:** Penggunaan CPU saat aplikasi berjalan di background/idle tidak boleh melebihi **1%** secara berkelanjutan.
- **Idle Memory:** Penggunaan RAM saat idle ditargetkan di bawah **80 MB** (maksimum toleransi **150 MB**).
- **Startup Time:** Aplikasi harus siap interaktif kurang dari **3 detik** sejak dijalankan pada spesifikasi komputer menengah (mid-range).
- **Scan Speed:** Operasi `scan_garbage()` pada direktori standar Windows wajib selesai dalam waktu kurang dari **30 detik**. Tampilkan progress indicator jika memakan waktu lebih lama.
- Catat setiap degradasi performa yang signifikan di `CHANGELOG.md` sebagai `Changed`.

---

## 11. Sinkronisasi File Aturan
- File `guidelines/Guidelines.md` adalah **satu-satunya sumber kebenaran**.
- File `.clinerules` dan `.cursorrules` di root direktori wajib disinkronkan secara otomatis untuk mengarah ke dokumen ini atau mereplikasi isinya secara penuh agar dapat dibaca langsung oleh masing-masing AI Agent.