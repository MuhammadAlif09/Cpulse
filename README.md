# ⚡ CPulse

[![Release](https://img.shields.io/github/v/release/MuhammadAlif09/Cpulse?color=blue&logo=github)](https://github.com/MuhammadAlif09/Cpulse/releases)
[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC107?logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-v18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-v1.77%2B-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![License](https://img.shields.io/github/license/MuhammadAlif09/Cpulse?color=emerald)](LICENSE)

CPulse is a state-of-the-art, high-performance Windows system optimization suite. Crafted with a React + TypeScript frontend and powered by a Tauri + Rust backend, CPulse delivers an incredibly fast, secure, and beautiful interface to keep your PC running at peak performance.

---

## ✨ Key Features

### 🖥️ Real-time Dashboard
- **System Health Score**: Dynamic UAC-aware evaluation of your PC's security and performance posture.
- **Hardware Telemetry**: Real-time CPU usage, memory occupancy, logical disk space, and active network bandwidth updates.
- **Real-time History Charts**: High-fidelity AreaCharts documenting CPU and RAM metrics over the last 20 seconds.
- **Interactive Disk Drive List**: Detailed view of all mounted logical partitions showing drive letters, partition capacities, SSD/HDD classifications, and physical hardware model names retrieved directly from system APIs.
- **In-place Quick Actions**: Execute immediate RAM memory flushes or scanner/cleaner sequences with direct state transition animations without leaving the dashboard.

### 🗑️ Junk File Cleaner
- **Deep Scanning Engine**: Rapidly traverses temporary folders, browser caches (Google Chrome & Microsoft Edge), Windows Update caches, and system crash dumps/logs.
- **Granular Deletion**: Allows users to select/deselect specific categories to clean. Supports safe deletion to Recycle Bin or permanent removal based on privilege context.

### 🚀 Performance Booster
- **CPU Priority Management**: Elevates processing scheduling priorities for active foreground applications.
- **Network Latency Tweaks**: Optimizes TCP/IP stack parameters, flushes local DNS resolvers, and tunes buffer sizes to shave off ping latencies.
- **Disk I/O Optimizer**: TRIM SSD sectors and optimize Prefetch/SuperFetch services.
- **Resource Redirection**: Toggles power plans, suspends non-essential animations, and redirects hardware resources toward active gaming threads.
- **UAC Safeguards**: Integrates administrator checks with visual locks, prompting elevating permission where registry access is restricted.

### ⚙️ Startup Optimizer
- **Boot Application Manager**: Scans HKLM and HKCU registry run configurations to list startup applications.
- **Speed Profile**: Disable non-essential startup processes to reduce boot times.

### 🔒 Privacy Sweeper
- **Sensitive Trace Detection**: Audits search indexes, Clipboard stacks, RunMRU history, saved Wi-Fi connection keys, and browser navigation histories.
- **Secure Wiping**: Securely clears credentials and cookie databases to obstruct cross-site tracking.

---

## 🛠️ Tech Stack

- **Frontend core**: React 18, TypeScript, Tailwind CSS
- **Charts**: Recharts (High-performance rendering)
- **Backend & System Bindings**: Tauri v2, Rust (safe, lightweight system bindings)
- **System Library**: `sysinfo` crate for resource telemetry, `winreg` for registry configurations
- **Global Store & State**: Zustand
- **Internationalization**: `react-i18next` (Full English & Indonesian locale support)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your Windows machine:
- **Node.js** (v18.x or higher)
- **Rust toolchain** (via [rustup](https://rustup.rs/))
- **Visual Studio Build Tools** (including C++ build tools for Windows compilation)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MuhammadAlif09/Cpulse.git
   cd Cpulse
   ```

2. **Install JavaScript dependencies**:
   ```bash
   npm install
   # or if you prefer pnpm
   pnpm install
   ```

3. **Run the application in Development Mode**:
   ```bash
   npm run tauri dev
   # or
   pnpm tauri dev
   ```

---

## 📦 Building for Production

To compile the production-ready client executable:

```bash
npm run tauri build
# or
pnpm tauri build
```
The resulting installer and standalone `.exe` binaries will be outputted to `src-tauri/target/release/bundle/`.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Create a feature branch off `dev` (`git checkout -b feature/amazing-feature`).
2. Code your changes following strict TypeScript and Rust standard safety protocols.
3. Confirm compilation succeeds by running `npm run build` and `cargo check`.
4. Commit your changes using Conventional Commits (`git commit -m "feat: add support for X"`).
5. Open a Pull Request targeting the `dev` branch.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.