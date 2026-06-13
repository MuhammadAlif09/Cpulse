
# WinCleaner Pro (Cpulse)

WinCleaner Pro is a modern, responsive, and robust system optimization tool built with React, Tailwind CSS, and Tauri. It offers a suite of features to keep your PC running at peak performance, including system metrics monitoring, junk file cleaning, startup program management, and privacy tracing sweeps.

## Features

### 🖥️ Dashboard
System overview and real-time health metrics.

![Dashboard](assets/dashboard.svg)

### 🗑️ Cleaner
Scan and remove junk files to free up disk space.

![Cleaner](assets/cleaner.svg)

### 🚀 Booster
Tune Windows settings for maximum performance.

![Booster](assets/booster.svg)

### ⚙️ Startup & Privacy
Manage programs that launch automatically at boot, find and erase privacy traces and tracking data.

![Startup & Privacy](assets/privacy.svg)

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
  