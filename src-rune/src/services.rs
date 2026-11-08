//! Modul manajemen Windows Service (`services.rs`) menggunakan `sc.exe` via `std::process::Command`.
//!
//! Digunakan secara reusable oleh modul `tweaks.rs` (kategori Privacy, Optimizations, dan Health)
//! untuk mengatur mode startup service (`Automatic`, `Manual`, `Disabled`), menjalankan (`start`),
//! menghentikan (`stop`), dan memeriksa status berjalan (`is_running`).
//!
//! # Catatan Hak Akses (Permissions / UAC Elevation)
//! Operasi perubahan konfigurasi (`set_start_mode`), `start`, dan `stop` pada Windows Service
//! **WAJIB dijalankan dengan hak akses Administrator (UAC elevation)**. Pemeriksaan status
//! (`is_running`) dapat dijalankan oleh user standar.

use std::error::Error;
use std::fmt;
use std::process::Command;

/// Flag pembuatan proses Windows tanpa memunculkan jendela konsol (`CREATE_NO_WINDOW`).
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Mode startup Windows Service yang didukung oleh `sc.exe config <name> start= <mode>`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ServiceStartMode {
    /// Service berjalan otomatis saat boot (`start= auto`).
    Automatic,
    /// Service berjalan sesuai permintaan / on-demand (`start= demand`).
    Manual,
    /// Service dinonaktifkan sepenuhnya (`start= disabled`).
    Disabled,
}

impl ServiceStartMode {
    /// Mengembalikan argumen nilai `start=` sesuai sintaks `sc.exe`.
    pub const fn as_sc_arg(self) -> &'static str {
        match self {
            ServiceStartMode::Automatic => "auto",
            ServiceStartMode::Manual => "demand",
            ServiceStartMode::Disabled => "disabled",
        }
    }
}

impl fmt::Display for ServiceStartMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_sc_arg())
    }
}

/// Membuat instance `std::process::Command` untuk `sc.exe` dengan flag `CREATE_NO_WINDOW`.
fn sc_command() -> Command {
    let mut cmd = Command::new("sc.exe");
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

/// Mengubah startup mode sebuah Windows Service (`Automatic`, `Manual`, atau `Disabled`).
///
/// Menjalankan: `sc.exe config <name> start= <auto|demand|disabled>`
///
/// **Perhatian**: Membutuhkan hak akses **Administrator (UAC)**.
pub fn set_start_mode(name: &str, mode: ServiceStartMode) -> Result<(), Box<dyn Error>> {
    let output = sc_command()
        .args(["config", name, "start=", mode.as_sc_arg()])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "Gagal mengubah start mode service '{}' ke '{}': {} {}",
            name,
            mode,
            stdout.trim(),
            stderr.trim()
        )
        .into());
    }

    Ok(())
}

/// Menjalankan (start) sebuah Windows Service.
///
/// Menjalankan: `sc.exe start <name>`
/// Jika service sudah dalam keadaan berjalan (`ERROR_SERVICE_ALREADY_RUNNING` / kode 1056),
/// fungsi ini tetap mengembalikan `Ok(())`.
///
/// **Perhatian**: Membutuhkan hak akses **Administrator (UAC)**.
pub fn start(name: &str) -> Result<(), Box<dyn Error>> {
    if is_running(name).unwrap_or(false) {
        return Ok(());
    }

    let output = sc_command().args(["start", name]).output()?;

    if !output.status.success() {
        let combined = format!(
            "{} {}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        if combined.contains("1056") || combined.to_ascii_lowercase().contains("already running") {
            return Ok(());
        }
        return Err(format!("Gagal menjalankan service '{}': {}", name, combined.trim()).into());
    }

    Ok(())
}

/// Menghentikan (stop) sebuah Windows Service.
///
/// Menjalankan: `sc.exe stop <name>`
/// Jika service memang sedang tidak berjalan (`ERROR_SERVICE_NOT_ACTIVE` / kode 1062),
/// fungsi ini tetap mengembalikan `Ok(())`.
///
/// **Perhatian**: Membutuhkan hak akses **Administrator (UAC)**.
pub fn stop(name: &str) -> Result<(), Box<dyn Error>> {
    if !is_running(name).unwrap_or(true) {
        return Ok(());
    }

    let output = sc_command().args(["stop", name]).output()?;

    if !output.status.success() {
        let combined = format!(
            "{} {}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        if combined.contains("1062") || combined.to_ascii_lowercase().contains("not been started") {
            return Ok(());
        }
        return Err(format!("Gagal menghentikan service '{}': {}", name, combined.trim()).into());
    }

    Ok(())
}

/// Memeriksa apakah sebuah Windows Service saat ini sedang berjalan (`RUNNING` / state code `4`).
///
/// Menjalankan: `sc.exe query <name>`
pub fn is_running(name: &str) -> Result<bool, Box<dyn Error>> {
    let output = sc_command().args(["query", name]).output()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if !output.status.success() {
        if stdout.contains("1060") || stderr.contains("1060") {
            return Ok(false);
        }
        return Err(format!(
            "Gagal memeriksa status service '{}': {} {}",
            name,
            stdout.trim(),
            stderr.trim()
        )
        .into());
    }

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("STATE") {
            if let Some(after_colon) = trimmed.split(':').nth(1) {
                let state_part = after_colon.trim();
                if state_part.starts_with('4') || state_part.contains("RUNNING") {
                    return Ok(true);
                }
            }
        }
    }

    Ok(false)
}
