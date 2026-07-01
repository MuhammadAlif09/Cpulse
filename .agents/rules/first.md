---
trigger: always_on
---

## RULES: Rust/Tauri Workspace Hygiene (anti-bloat)

### Cargo.toml wajib ada
```toml
[profile.dev]
incremental = false
debug = "line-tables-only"
strip = "debuginfo"

[profile.release]
strip = true
lto = true
codegen-units = 1
```

### Sebelum agent commit/build
- SELALU cek `du -sh target/` sebelum & sesudah build besar, laporkan delta.
- JANGAN pernah `cargo build` ulang tanpa alasan — reuse existing build kalau cuma edit non-Rust file (config, assets, frontend).
- Kalau nambah dependency baru di `Cargo.toml`, cek dulu apakah ada crate serupa yang udah dipakai (hindari duplikat functionality, contoh: jangan pakai `reqwest` + `ureq` bareng).
- Setelah `cargo test` atau `cargo check` besar-besaran, jalankan `cargo clean -p <crate>` buat crate yang gak dipakai lagi kalau ada sisa build gagal.

### Target directory
- WAJIB set `CARGO_TARGET_DIR` shared, jangan biarin tiap project punya `target/` sendiri:
```toml
# .cargo/config.toml (root workspace)
[build]
target-dir = "D:/cargo-target/cpulse"
```
- JANGAN taruh target dir di C: kalau C: free space < 10 GiB.

### Autopilot cleanup rules (agent wajib jalanin otomatis)
- Habis `cargo build --release` sukses dan binary udah di-copy/dipakai → `cargo clean --release` kalau gak butuh rebuild cepat lagi.
- Kalau branch/feature udah di-merge atau task selesai → `cargo clean` full di project itu, jangan nunggu disuruh.
- JANGAN jalankan `cargo build` lebih dari sekali buat perubahan yang sama (no re-run tanpa diff kode).

### Larangan
- jangan auto proceed implementation dan lainnya, perlu update dan persetujuan dari user
- JANGAN generate/commit file besar (>50MB) ke repo (installer, binary release, dll) — taruh di `.gitignore`.
- `.gitignore` WAJIB include:/target
/src-tauri/target
node_modules/
*.log
dist/
- JANGAN biarin `node_modules` numpuk di banyak folder project — cek dulu apakah bisa pakai pnpm (hardlink, bukan copy) sebelum install ulang.

### Monitoring wajib tiap sesi kerja
- Di awal sesi, agent cek: `Get-PSDrive C | Select-Object Free`
- Kalau free space < 5 GiB → STOP, warning ke user dulu sebelum build apapun, jangan lanjut otomatis.

### sccache (opsional tapi disaranin)
```toml
# .cargo/config.toml
[build]
rustc-wrapper = "sccache"
```
- Kalau `sccache` kedetect terinstall, pakai otomatis. Kalau belum, sarankan install sekali, jangan install tiap sesi.

## Context Efficiency
- Always check STATUS.md first before reading other files.
- If STATUS.md exists, treat it as source of truth for project state.
- Do not scan project files to answer status/progress questions if STATUS.md is current.