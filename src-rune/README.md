# ⚡ CPulse — Pure-Rust Rune GPU Edition (`src-rune/`)

**Zero `msedgewebview2.exe` • 100% Pure-Rust GPU Rendering via [`anomalyco/rune`](https://github.com/anomalyco/rune)**

Direktori `src-rune/` berisi implementasi **100% Pure Rust** dari aplikasi desktop **CPulse** yang merender seluruh antarmuka pengguna langsung ke GPU menggunakan **DirectX 12 (`wgpu`)** melalui ekosistem **[`anomalyco/rune`](https://github.com/anomalyco/rune)**—tanpa runtime browser Chromium (`msedgewebview2.exe`), tanpa proses IPC JSON, dan tanpa beban memori WebView.

---

## 🚀 Perbandingan: Tauri + WebView2 vs Pure-Rust Rune GPU

| Metrik | Tauri v2 + React (`src-tauri/`) | Pure-Rust Rune GPU (`src-rune/`) |
| :--- | :--- | :--- |
| **Proses Runtime** | `cpulse.exe` + 5–7 proses `msedgewebview2.exe` | **Hanya 1 proses `cpulse-rune.exe`** |
| **Pemakaian RAM Idle** | ~120 MB – 220 MB (termasuk WebView2) | **~15 MB – 28 MB** (murni GPU vertex/SDF buffer) |
| **Render Engine** | Blink / Chromium DOM + CSS Layout | **`wgpu` DirectX 12 + Taffy Flexbox + CosmicText** |
| **Komunikasi Data** | JSON IPC (`invoke` & `emit` antar-proses) | **Zero-Copy In-Process (`AppHandle::update`)** |
| **Penyimpanan State** | `@tauri-apps/plugin-store` | **`rune::prefs::Prefs` (`%APPDATA%\com.cpulse.app`)** |
| **Notifikasi OS** | WebView Notification / Plugin | **`rune-notify` (Native WinRT Toast Notification)** |
| **System Tray** | `tauri::tray` | **`rune::tray` (`Shell_NotifyIconW` Win32 Murni)** |
| **Lokalisasi (i18n)** | `react-i18next` (JS runtime) | **`rune-i18n` (`Catalog`, `Locale`, `Translator`)** |

---

## 🧩 Pemetaan Fitur `anomalyco/rune` yang Digunakan Maksimal

Seluruh crate dan modul resmi dari repositori `anomalyco/rune` (`rev = 59e7c017b968fdcfe289b6bdfc6eaffc09388b11`) telah diintegrasikan secara penuh:

1. **`rune` Core & Startup Optimization (`src-rune/src/main.rs`)**:
   - `rune::prewarm_gpu()` — Menginisialisasi adapter DirectX 12 / `wgpu` di background thread sebelum window dibuat agar cold-start instan.
   - `rune::single_instance("com.cpulse.app")` — Mencegah duplikasi proses aplikasi dan otomatis memfokuskan window yang sudah berjalan.
   - `App::new(AppSpec { ... }).keep_running()` — Menjaga aplikasi tetap aktif di System Tray saat window utama ditutup.
   - `AppSpec::scenes` — Mendukung mode inspeksi headless (`--snap <file.png> --scene <tab>` dan `--tree`) untuk ke-8 tab (`dashboard`, `cleaner`, `booster`, `startup`, `privacy`, `diagnostics`, `history`, `settings`).
   - `Tx::save_file(SaveFileSpec::new()...)` — Menggunakan fitur `native-file-dialog` (`rfd`) untuk mengekspor laporan diagnostik `.txt`.
   - `Tx::copy(...)` — Menyalin Windows OEM/BIOS Product Key langsung ke clipboard sistem.

2. **`rune::Shape` & `rune::canvas` Zero-Atlas GPU Charts (`src-rune/src/charts.rs`)**:
   - Menggambar waveform real-time 60 detik (CPU, RAM, Disk Read/Write, Network Down/Up), **System Health Radial Gauge**, dan **Monthly Freed Space Bar Chart** langsung di GPU setiap frame tanpa library chart eksternal.

3. **`rune-kit` Desktop Shell & Komponen (`src-rune/src/main.rs`)**:
   - `Kit::from_palette(PaletteSeed { bg, fg, accent })` dengan warna khas **CPulse Teal (`oklch(0.64, 0.13, 180.0)`)** dan animasi pegas `Spring::snappy()` dari `rune-motion`.
   - `SplitView`, `Sidebar`, `SidebarSection`, `SidebarRow` (dengan badge dinamis untuk jumlah kategori sampah, startup High Impact, dan jejak privasi), serta `Toolbar`.
   - Virtualized `Table` (`TableState`, `TableColumn`, `Cell`, `SortDir`) untuk **Startup Manager** dan **Activity History**.
   - `Card`, `Button` (dengan efek `.rolling(...)` `rolling_text`), `IconButton`, `Switch`, `Checkbox`, `SegmentedControl`, `Select`, `TextInput`, `Progress`, `ProgressCircle`, `Badge`, `Divider`, `Dialog`, `Popover`, serta `ToastRegion` + `Toast`.

4. **`rune::prefs::Prefs` & `rune::dirs::AppDirs`**:
   - Menyimpan pengaturan (`user-settings`) dan riwayat pembersihan (`cleaning-history`) secara atomik di `%APPDATA%\com.cpulse.app\prefs.json`.
   - Mengelola direktori log audit (`cleaner_audit.log`) dan laporan diagnostik (`reports/`).

5. **`rune::tray` & `rune-notify` & `rune-i18n`**:
   - System Tray native Windows dengan menu **Open CPulse Dashboard**, **Run Quick Clean**, **Boost RAM Now**, dan **Exit CPulse**.
   - Notifikasi native Windows Toast via `rune_notify::register` dan `rune_notify::post`.
   - Katalog terjemahan dua bahasa (`en` & `id`) menggunakan `rune_i18n::{Catalog, Locale, Translator}`.

---

## 🛠️ Cara Menjalankan & Build di Windows

Pastikan Anda memiliki Rust toolchain (`rustup` / `cargo` versi 1.77+):

```powershell
# 1. Jalankan dalam mode development (Pure Rust GPU UI)
cargo run --manifest-path src-rune/Cargo.toml
# atau via pnpm:
pnpm run rune:dev

# 2. Build binary rilis produksi (Zero WebView2, LTO + Strip aktif)
cargo build --release --manifest-path src-rune/Cargo.toml
# atau via pnpm:
pnpm run rune:build

# Binary hasil kompilasi tersedia di:
# src-rune/target/release/cpulse-rune.exe

# 3. Render screenshot headless per scene (fitur bawaan Rune)
cargo run --manifest-path src-rune/Cargo.toml -- --snap dashboard.png --scene dashboard
cargo run --manifest-path src-rune/Cargo.toml -- --tree --scene cleaner
```
