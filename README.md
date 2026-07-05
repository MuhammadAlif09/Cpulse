# ⚡ CPulse

<p align="center">
  <img src="assets/icon.png" alt="CPulse Logo" width="120" height="120" />
</p>

<h3 align="center">CPulse</h3>

<p align="center">
  Aplikasi desktop Windows modern, cepat, dan ringan untuk membersihkan sampah sistem, mengoptimasi performa, dan menjaga privasi PC Anda. Dibangun menggunakan <b>Tauri v2</b> dan <b>React (TypeScript)</b>.
</p>

<p align="center">
  <a href="https://github.com/MuhammadAlif09/Cpulse/releases">
    <img src="https://img.shields.io/github/v/release/MuhammadAlif09/Cpulse?color=blue&logo=github&style=flat-square" alt="GitHub Release" />
  </a>
  <a href="https://tauri.app/">
    <img src="https://img.shields.io/badge/Tauri-v2-FFC107?logo=tauri&logoColor=white&style=flat-square" alt="Tauri v2" />
  </a>
  <a href="https://react.dev/">
    <img src="https://img.shields.io/badge/React-v18-61DAFB?logo=react&logoColor=black&style=flat-square" alt="React 18" />
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&style=flat-square" alt="TypeScript" />
  </a>
  <a href="https://www.rust-lang.org/">
    <img src="https://img.shields.io/badge/Rust-v1.77%2B-000000?logo=rust&logoColor=white&style=flat-square" alt="Rust" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/MuhammadAlif09/Cpulse?color=emerald&style=flat-square" alt="License" />
  </a>
</p>

---

## 🖼️ Pratinjau Aplikasi

<p align="center">
  <img src="https://github.com/MuhammadAlif09/Cpulse/blob/main/assets/screenshots/dashboard.png?raw=true" alt="Dashboard CPulse" width="49%" />
  <img src="https://github.com/MuhammadAlif09/Cpulse/blob/main/assets/screenshots/cleaner.png?raw=true" alt="Cleaner CPulse" width="49%" />
</p>

---

## 📐 Arsitektur Sistem

CPulse memanfaatkan arsitektur Tauri v2 yang memisahkan antara frontend UI dan backend sistem secara aman melalui IPC (Inter-Process Communication).

```mermaid
graph TD
    %% Nodes
    UI[React Frontend / TypeScript] <-->|Tauri IPC Command / Event| Tauri[Tauri Core / Rust Backend]
    Tauri -->|System Info APIs| Sysinfo[sysinfo crate]
    Tauri -->|Registry Access| Winreg[winreg crate]
    Tauri -->|File Operations| Trash[trash crate]
    
    Sysinfo -->|Hardware Telemetry| WinOS[Windows OS API]
    Winreg -->|Startup Programs & Power Plan| WinOS
    Trash -->|Recycle Bin & Temp Clean| WinOS

    %% Styling
    classDef frontend fill:#61DAFB,stroke:#333,stroke-width:2px,color:#000;
    classDef backend fill:#E57373,stroke:#333,stroke-width:2px,color:#000;
    classDef os fill:#90CAF9,stroke:#333,stroke-width:2px,color:#000;
    
    class UI frontend;
    class Tauri,Sysinfo,Winreg,Trash backend;
    class WinOS os;
```

---

## ✨ Fitur Utama

- **🖥️ Dasbor Real-time**: Telemetri CPU, RAM, Disk, dan Jaringan secara langsung. Deteksi status UAC dan Skor Kesehatan Sistem secara real-time.
- **🗑️ Pembersih Sampah**: Pencarian mendalam (Deep Scan) untuk file sementara (Temp), cache peramban (Chrome & Edge), sisa Windows Update, dan file crash dump.
- **🚀 Pengoptimal Performa**: Manajemen prioritas CPU, optimasi jaringan (konfigurasi TCP/IP & flush DNS), optimasi disk (TRIM SSD), serta mode daya performa tinggi/Gaming Mode.
- **⚙️ Pengoptimal Startup**: Deteksi dan kelola program startup langsung melalui Windows Registry untuk mempercepat proses boot.
- **🔒 Pembersih Privasi**: Membersihkan riwayat sistem, clipboard, daftar RunMRU, password Wi-Fi lama, dan riwayat aktivitas Windows.

---

## 📊 Matriks Kapabilitas

| Kategori | Fitur & Fungsi | Metode Sistem | Target Lokasi |
| :--- | :--- | :--- | :--- |
| **Junk Cleaner** | Pembersihan File Sampah | Pengapusan File/Direktori | `%TEMP%`, `%SYSTEMROOT%\Temp`, Browser Cache, Windows Update |
| **Booster** | Optimasi Jaringan & RAM | Flush DNS, TCP Tweaks | Windows DNS Cache, WinSock API |
| **Disk Care** | TRIM & Recycle Bin | Defrag API, Trash Shell | System Drives (SSD/HDD), `$RECYCLE.BIN` |
| **Startup** | Manajemen Boot Startup | Registry RW | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` |
| **Privacy** | Pembersih Privasi | Registry / Command Execution | RunMRU, Clipboard Service, WiFi Profiles |

---

## 🛠️ Papan Teknologi (Tech Stack)

* **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI (shadcn/ui)
* **Backend**: Tauri v2, Rust (menggunakan library `sysinfo`, `winreg`, `trash`, dll.)
* **State Management**: Zustand
* **Grafik**: Recharts

---

## 🚀 Memulai (Getting Started)

### Prasyarat (Prerequisites)

Untuk membangun proyek ini secara lokal, Anda membutuhkan perkakas berikut terinstal di Windows Anda:

1. **Rust & C++ Build Tools** (Dibutuhkan oleh Tauri):
   ```powershell
   # Install via winget
   winget install Rustlang.Rustup
   winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```
2. **Node.js** (v22 direkomendasikan):
   ```powershell
   winget install OpenJS.NodeJS
   ```
3. **pnpm** (Manajer paket):
   ```powershell
   npm install -g pnpm
   ```

### Pemasangan & Pengembangan (Dev Mode)

```bash
# 1. Kloning repositori
git clone https://github.com/MuhammadAlif09/Cpulse.git
cd Cpulse

# 2. Instal dependensi
pnpm install

# 3. Jalankan dalam mode pengembangan
pnpm tauri dev
```

### Membangun Versi Rilis (Build Production)

```bash
pnpm tauri build
```
Hasil kompilasi file executable installer (`.msi` atau `.exe`) akan disimpan di direktori `src-tauri/target/release/bundle/`.

---

## 📌 Peta Jalan (Roadmap)

- [x] Antarmuka Gelap/Terang (Dark/Light mode)
- [x] CSP yang diperketat & Font lokal untuk performa optimal
- [ ] Pembaru Otomatis (Auto-updater)
- [ ] Dukungan peramban lain (Firefox, Brave)
- [ ] Pengoptimalan Sekali Klik (One-click Full Optimization)
- [ ] Versi Portabel + Paket Winget
- [ ] Ekspor laporan kesehatan sistem

---

## 🤝 Kontribusi

Kontribusi Anda sangat dihargai! Silakan ikuti langkah berikut:

1. **Fork** proyek ini.
2. Buat branch fitur baru (`git checkout -b feature/FiturBaru`).
3. Commit perubahan Anda (`git commit -m "feat: Menambahkan FiturBaru"`).
4. Push ke branch tersebut (`git push origin feature/FiturBaru`).
5. Ajukan **Pull Request** ke branch `dev`.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **MIT License**. Lihat berkas [LICENSE](LICENSE) untuk detail lebih lanjut.

---
Dibuat dengan ❤️ oleh [Muhammad Alif](https://github.com/MuhammadAlif09)
