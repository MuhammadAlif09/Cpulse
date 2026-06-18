# ⚡ CPulse

[![Release](https://img.shields.io/github/v/release/MuhammadAlif09/Cpulse?color=blue&logo=github)](https://github.com/MuhammadAlif09/Cpulse/releases)
[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC107?logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-v18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-v1.77%2B-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![License](https://img.shields.io/github/license/MuhammadAlif09/Cpulse?color=emerald)](LICENSE)

**Modern Windows Cleaning and Optimization Software**  
CPulse adalah aplikasi desktop Windows yang cepat, ringan, dan cantik untuk membersihkan sampah sistem, mengoptimasi performa, dan menjaga privasi PC kamu.

---

## ✨ Preview

<!-- Tambahkan screenshot di sini nanti -->
![Dashboard](https://github.com/MuhammadAlif09/Cpulse/blob/main/assets/screenshots/dashboard.png?raw=true)
![Cleaner](https://github.com/MuhammadAlif09/Cpulse/blob/main/assets/screenshots/cleaner.png?raw=true)

*(Silakan tambahkan folder `assets/screenshots/` dan upload gambarnya)*

---

## ✨ Key Features

### 🖥️ Real-time Dashboard
- System Health Score dengan deteksi UAC
- Hardware Telemetry (CPU, RAM, Disk, Network)
- Real-time charts (20 detik terakhir)
- Quick Actions langsung dari dashboard

### 🗑️ Junk File Cleaner
- Deep scan: Temp files, Browser cache (Chrome & Edge), Windows Update, Crash dumps
- Pilih kategori secara granular
- Delete ke Recycle Bin atau permanent

### 🚀 Performance Booster
- CPU Priority Management
- Network Optimization (TCP/IP, DNS Flush)
- Disk Optimizer (TRIM SSD)
- Power Plan + Gaming Mode

### ⚙️ Startup Optimizer
- Deteksi & kelola startup programs via Registry
- Mempercepat boot time

### 🔒 Privacy Sweeper
- Membersihkan history, clipboard, RunMRU, WiFi passwords, dll.

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Tauri v2 + Rust
- **State Management**: Zustand
- **Charts**: Recharts
- **System Access**: `sysinfo`, `winreg`, dll.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 atau lebih baru)
- **Rust** (`rustup`)
- **Visual Studio Build Tools** (C++ workload)

### Installation

```bash
git clone https://github.com/MuhammadAlif09/Cpulse.git
cd Cpulse

# Install dependencies
npm install
# atau
pnpm install

# Run development
npm run tauri dev
Build Production
Bashnpm run tauri build
File hasil build akan ada di src-tauri/target/release/bundle/

📌 Roadmap

 Auto-updater
 More browser support (Firefox, Brave)
 One-click Full Optimization
 Portable version + Winget package
 Dark/Light mode toggle
 Export system report


🤝 Contributing
Kontribusi sangat dihargai!

Fork project ini
Buat branch fitur (git checkout -b feature/awesome-feature)
Commit perubahan (git commit -m "feat: add something")
Push ke branch
Buat Pull Request ke dev


📄 License
Project ini dilisensikan di bawah MIT License. Lihat file LICENSE untuk detail.

Made with ❤️ by Muhammad Alif