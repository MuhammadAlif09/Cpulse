
# WinCleaner Pro (Cpulse)

WinCleaner Pro is a modern, responsive, and robust system optimization tool built with React, Tailwind CSS, and Tauri. It offers a suite of features to keep your PC running at peak performance, including system metrics monitoring, junk file cleaning, startup program management, and privacy tracing sweeps.

## Features

- **Dashboard:** Real-time system health metrics (CPU, RAM, Disk, Network) with interactive charts.
- **Cleaner:** Deep scan and removal of temporary data, cache, and residual clutter to free up disk space.
- **Booster:** Optimize system settings for balanced, performance, or gaming modes.
- **Startup Manager:** Review and toggle applications that launch at boot to speed up startup times.
- **Privacy Scanner:** Identify and sweep browsing history, saved passwords, and tracking data.
- **History & Settings:** Track past cleaning sessions and customize app behavior (auto-start, system tray, etc.).

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Recharts
- **Backend/Desktop Integration:** Tauri, Rust
- **UI Components:** Lucide React (Icons), Radix UI / shadcn (Primitives)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Rust](https://www.rust-lang.org/) (for Tauri backend)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MuhammadAlif09/Cpulse.git
   cd Cpulse
   ```

2. Install JavaScript dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Start the development server (with Tauri):
   ```bash
   npm run tauri dev
   # or
   pnpm tauri dev
   ```

## Building for Production

To build the executable for your platform:

```bash
npm run tauri build
# or
pnpm tauri build
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
  