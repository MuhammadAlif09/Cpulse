# ADR-001: Tauri v2 + Rust Backend

## Status
Accepted

## Context
Cpulse is a desktop system optimization tool for Windows that needs:
- Deep system access (registry, file system, process management, disk I/O)
- Real-time hardware monitoring (CPU, RAM, disk, network, temperature)
- Small binary footprint and low resource overhead
- Cross-platform potential for future macOS/Linux support

Electron was considered but rejected due to its high memory baseline (~150MB+ for the runtime alone), which contradicts the purpose of a system optimizer tool. Native frameworks (C++/Qt, C#/WPF) were considered but rejected due to limited web ecosystem integration and slower UI iteration cycles.

## Decision
Use **Tauri v2** as the application framework with **Rust** for the backend logic:
- **Tauri v2** provides a WebView-based UI layer with minimal overhead (~10-30MB RAM) and built-in plugin system (autostart, updater, store, fs, shell, process).
- **Rust backend** handles all system-level operations: `sysinfo` crate for hardware metrics, `winreg` for Windows registry, `windows-sys` for Win32 API calls, and direct filesystem operations.
- **React 18 + TypeScript** frontend communicates with Rust via Tauri's IPC (`invoke`) and event system (`listen`/`emit`).

## Consequences

### Positive
- Binary size ~5MB (vs ~150MB+ Electron)
- Near-zero idle CPU usage for the framework itself
- Rust's safety guarantees prevent memory leaks in long-running system monitoring
- Tauri plugin ecosystem provides autostart, updater, and store out of the box
- System commands run via `std::process::Command` with `CREATE_NO_WINDOW` flag for silent execution

### Negative
- Steeper learning curve: contributors must know both TypeScript and Rust
- WebView rendering varies across Windows versions (WebView2 requirement)
- Debug tooling is less mature than Electron DevTools
- Some Win32 API calls require `unsafe` blocks in Rust
