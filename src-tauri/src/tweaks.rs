//! Modul System Tweaks (`tweaks.rs`) berdasarkan spesifikasi Wintoys v2.6.71.0.
//!
//! Mengimplementasikan 4 fitur tahap pertama:
//! 1. `ClassicMenu`  — Classic Right-Click Context Menu Windows 10/11 (`Tweaks.Desktop`)
//! 2. `EndTask`      — Taskbar End Task Developer Setting (`Tweaks.System`)
//! 3. `HiddenItems`  — Show Hidden Files, Folders, and Drives (`Tweaks.FileExplorer`)
//! 4. `Extensions`   — Show File Extensions for Known File Types (`Tweaks.FileExplorer`)
//!
//! # Catatan Hak Akses (Permissions / UAC Elevation)
//! Keempat fitur pada modul tahap pertama ini beroperasi seluruhnya pada hive
//! **`HKEY_CURRENT_USER` (`HKCU`)**, sehingga **TIDAK membutuhkan hak akses Administrator (UAC)**.
//! Namun, perubahan pada `ClassicMenu` membutuhkan *restart* `explorer.exe` (atau *sign out/in*)
//! agar COM `InprocServer32` dimuat ulang oleh Windows Shell.

use std::error::Error;
use std::io::ErrorKind;
use std::process::Command;
use winreg::enums::*;
use winreg::RegKey;

/// Alias tipe kembalian standar sesuai spesifikasi: `Result<bool, Box<dyn std::error::Error>>`.
pub type TweakResult = Result<bool, Box<dyn Error>>;

/// Flag pembuatan proses Windows tanpa memunculkan jendela konsol (`CREATE_NO_WINDOW`).
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

// =============================================================================
// Path & Value Constants (Sesuai WINTOYS_SPECIFICATION_FOR_AI.md)
// =============================================================================

/// Subkey CLSID untuk mengaktifkan menu konteks (klik kanan) klasik Windows 10 di Windows 11.
pub const CLASSIC_MENU_CLSID_PATH: &str =
    r"SOFTWARE\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}";

/// Subkey `InprocServer32` di bawah CLSID `ClassicMenu`.
pub const CLASSIC_MENU_INPROC_PATH: &str =
    r"SOFTWARE\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32";

/// Subkey pengaturan Taskbar Developer (fitur "End task" di taskbar Windows 11).
pub const END_TASK_SUBKEY_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings";

/// Nama value DWORD untuk fitur Taskbar End Task (`1` = aktif, `0` = nonaktif).
pub const END_TASK_VALUE_NAME: &str = "TaskbarEndTask";

/// Subkey pengaturan lanjutan File Explorer (`HiddenItems` dan `Extensions`).
pub const EXPLORER_ADVANCED_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced";

/// Nama value DWORD untuk menampilkan file tersembunyi (`1` = tampilkan, `2` = sembunyikan).
pub const HIDDEN_ITEMS_VALUE_NAME: &str = "Hidden";

/// Nama value DWORD untuk menyembunyikan ekstensi file (`0` = tampilkan ekstensi, `1` = sembunyikan).
pub const EXTENSIONS_VALUE_NAME: &str = "HideFileExt";

// =============================================================================
// Trait Kontrak Tweak
// =============================================================================

/// Kontrak seragam untuk setiap controller Tweak Wintoys.
pub trait TweakController {
    /// Nama identifikasi fitur sesuai katalog Wintoys.
    const KEY: &'static str;

    /// Menandakan apakah manipulasi fitur ini membutuhkan elevasi Administrator (`HKLM` / System).
    const REQUIRES_ADMIN: bool;

    /// Mengaktifkan fitur tweak pada Windows Registry.
    fn enable() -> TweakResult;

    /// Menonaktifkan fitur tweak (mengembalikan ke perilaku default Windows).
    fn disable() -> TweakResult;

    /// Memeriksa apakah fitur tweak saat ini sedang aktif (`true`) atau tidak (`false`).
    fn is_enabled() -> TweakResult;
}

// =============================================================================
// 1. Classic Right-Click Context Menu Windows 10/11 (`ClassicMenu`)
// =============================================================================

/// **ClassicMenu** (`Tweaks.Desktop`)
///
/// Mengembalikan menu klik kanan klasik Windows 10 pada Windows 11 dengan mendaftarkan
/// override COM kosong pada:
/// `HKCU\SOFTWARE\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32`
///
/// - **Permission**: `HKCU` — **Tidak membutuhkan Administrator (UAC)**.
/// - **Catatan**: Membutuhkan *restart* `explorer.exe` agar efek langsung terlihat.
pub struct ClassicMenu;

impl ClassicMenu {
    /// Mengaktifkan menu klik kanan klasik dengan membuat key `InprocServer32`
    /// dan mengisi `(Default)` value (`""`) menjadi string kosong `""`.
    pub fn enable() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (inproc_key, _disp) = hkcu.create_subkey(CLASSIC_MENU_INPROC_PATH)?;
        // Set (Default) value ("") = "" agar Windows membatalkan COM handler menu modern
        inproc_key.set_value("", &"")?;
        Ok(true)
    }

    /// Menonaktifkan menu klik kanan klasik (kembali ke menu modern Windows 11)
    /// dengan menghapus seluruh pohon subkey CLSID `{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}`.
    pub fn disable() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match hkcu.delete_subkey_all(CLASSIC_MENU_CLSID_PATH) {
            Ok(()) => Ok(true),
            // Jika key memang sudah tidak ada, operasi disable tetap dianggap berhasil
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(true),
            Err(e) => Err(Box::new(e)),
        }
    }

    /// Mengecek apakah `InprocServer32` terdaftar dan memiliki `(Default)` value berupa string kosong `""`.
    pub fn is_enabled() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match hkcu.open_subkey_with_flags(CLASSIC_MENU_INPROC_PATH, KEY_READ) {
            Ok(inproc_key) => match inproc_key.get_value::<String, _>("") {
                Ok(default_val) => Ok(default_val.is_empty()),
                Err(e) if e.kind() == ErrorKind::NotFound => Ok(false),
                Err(e) => Err(Box::new(e)),
            },
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(false),
            Err(e) => Err(Box::new(e)),
        }
    }
}

impl TweakController for ClassicMenu {
    const KEY: &'static str = "ClassicMenu";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult {
        Self::enable()
    }

    fn disable() -> TweakResult {
        Self::disable()
    }

    fn is_enabled() -> TweakResult {
        Self::is_enabled()
    }
}

/// Modul fungsi langsung untuk `ClassicMenu` (`tweaks::classic_menu::{enable, disable, is_enabled}`).
pub mod classic_menu {
    use super::{ClassicMenu, TweakResult};

    pub fn enable() -> TweakResult {
        ClassicMenu::enable()
    }

    pub fn disable() -> TweakResult {
        ClassicMenu::disable()
    }

    pub fn is_enabled() -> TweakResult {
        ClassicMenu::is_enabled()
    }
}

// =============================================================================
// 2. Taskbar End Task (`EndTask`)
// =============================================================================

/// **EndTask** (`Tweaks.System`)
///
/// Menampilkan opsi **"End task"** saat klik kanan ikon aplikasi di Taskbar Windows 11.
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings`
/// - **Value**: `TaskbarEndTask` (`REG_DWORD`: `1` = Enabled, `0` = Disabled)
/// - **Permission**: `HKCU` — **Tidak membutuhkan Administrator (UAC)**.
pub struct EndTask;

impl EndTask {
    /// Mengaktifkan fitur "End task" pada Taskbar (`TaskbarEndTask = 1`).
    pub fn enable() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _disp) = hkcu.create_subkey(END_TASK_SUBKEY_PATH)?;
        key.set_value(END_TASK_VALUE_NAME, &1u32)?;
        Ok(true)
    }

    /// Menonaktifkan fitur "End task" pada Taskbar (`TaskbarEndTask = 0`).
    pub fn disable() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _disp) = hkcu.create_subkey(END_TASK_SUBKEY_PATH)?;
        key.set_value(END_TASK_VALUE_NAME, &0u32)?;
        Ok(true)
    }

    /// Mengecek apakah `TaskbarEndTask` bernilai `1`.
    pub fn is_enabled() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match hkcu.open_subkey_with_flags(END_TASK_SUBKEY_PATH, KEY_READ) {
            Ok(key) => match key.get_value::<u32, _>(END_TASK_VALUE_NAME) {
                Ok(val) => Ok(val == 1),
                Err(e) if e.kind() == ErrorKind::NotFound => Ok(false),
                Err(e) => Err(Box::new(e)),
            },
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(false),
            Err(e) => Err(Box::new(e)),
        }
    }
}

impl TweakController for EndTask {
    const KEY: &'static str = "EndTask";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult {
        Self::enable()
    }

    fn disable() -> TweakResult {
        Self::disable()
    }

    fn is_enabled() -> TweakResult {
        Self::is_enabled()
    }
}

/// Modul fungsi langsung untuk `EndTask` (`tweaks::end_task::{enable, disable, is_enabled}`).
pub mod end_task {
    use super::{EndTask, TweakResult};

    pub fn enable() -> TweakResult {
        EndTask::enable()
    }

    pub fn disable() -> TweakResult {
        EndTask::disable()
    }

    pub fn is_enabled() -> TweakResult {
        EndTask::is_enabled()
    }
}

// =============================================================================
// 3. Show Hidden Files (`HiddenItems`)
// =============================================================================

/// **HiddenItems** (`Tweaks.FileExplorer`)
///
/// Menampilkan file, folder, dan drive tersembunyi di Windows File Explorer.
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced`
/// - **Value**: `Hidden` (`REG_DWORD`: `1` = Show hidden items, `2` = Don't show hidden items)
/// - **Permission**: `HKCU` — **Tidak membutuhkan Administrator (UAC)**.
pub struct HiddenItems;

impl HiddenItems {
    /// Menampilkan file dan folder tersembunyi (`Hidden = 1`).
    pub fn enable() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _disp) = hkcu.create_subkey(EXPLORER_ADVANCED_PATH)?;
        key.set_value(HIDDEN_ITEMS_VALUE_NAME, &1u32)?;
        Ok(true)
    }

    /// Menyembunyikan kembali file dan folder tersembunyi (`Hidden = 2`, nilai default Windows).
    pub fn disable() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _disp) = hkcu.create_subkey(EXPLORER_ADVANCED_PATH)?;
        key.set_value(HIDDEN_ITEMS_VALUE_NAME, &2u32)?;
        Ok(true)
    }

    /// Mengecek apakah file tersembunyi sedang ditampilkan (`Hidden == 1`).
    pub fn is_enabled() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match hkcu.open_subkey_with_flags(EXPLORER_ADVANCED_PATH, KEY_READ) {
            Ok(key) => match key.get_value::<u32, _>(HIDDEN_ITEMS_VALUE_NAME) {
                Ok(val) => Ok(val == 1),
                Err(e) if e.kind() == ErrorKind::NotFound => Ok(false),
                Err(e) => Err(Box::new(e)),
            },
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(false),
            Err(e) => Err(Box::new(e)),
        }
    }
}

impl TweakController for HiddenItems {
    const KEY: &'static str = "HiddenItems";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult {
        Self::enable()
    }

    fn disable() -> TweakResult {
        Self::disable()
    }

    fn is_enabled() -> TweakResult {
        Self::is_enabled()
    }
}

/// Modul fungsi langsung untuk `HiddenItems` (`tweaks::hidden_items::{enable, disable, is_enabled}`).
pub mod hidden_items {
    use super::{HiddenItems, TweakResult};

    pub fn enable() -> TweakResult {
        HiddenItems::enable()
    }

    pub fn disable() -> TweakResult {
        HiddenItems::disable()
    }

    pub fn is_enabled() -> TweakResult {
        HiddenItems::is_enabled()
    }
}

// =============================================================================
// 4. Show File Extensions (`Extensions`)
// =============================================================================

/// **Extensions** (`Tweaks.FileExplorer`)
///
/// Menampilkan ekstensi untuk tipe file yang dikenal (`.exe`, `.txt`, `.rs`, dll.) di File Explorer.
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced`
/// - **Value**: `HideFileExt` (`REG_DWORD`: `0` = Tampilkan ekstensi / Enabled, `1` = Sembunyikan ekstensi / Disabled)
/// - **Permission**: `HKCU` — **Tidak membutuhkan Administrator (UAC)**.
pub struct Extensions;

impl Extensions {
    /// Menampilkan ekstensi file dengan mengatur `HideFileExt = 0`.
    pub fn enable() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _disp) = hkcu.create_subkey(EXPLORER_ADVANCED_PATH)?;
        // Perhatikan: HideFileExt = 0 berarti ekstensi DITAMPILKAN (Show File Extensions = true)
        key.set_value(EXTENSIONS_VALUE_NAME, &0u32)?;
        Ok(true)
    }

    /// Menyembunyikan ekstensi file yang dikenal dengan mengatur `HideFileExt = 1` (default Windows).
    pub fn disable() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _disp) = hkcu.create_subkey(EXPLORER_ADVANCED_PATH)?;
        key.set_value(EXTENSIONS_VALUE_NAME, &1u32)?;
        Ok(true)
    }

    /// Mengecek apakah ekstensi file sedang ditampilkan (`HideFileExt == 0`).
    pub fn is_enabled() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match hkcu.open_subkey_with_flags(EXPLORER_ADVANCED_PATH, KEY_READ) {
            Ok(key) => match key.get_value::<u32, _>(EXTENSIONS_VALUE_NAME) {
                Ok(val) => Ok(val == 0),
                // Default Windows jika value belum ada adalah menyembunyikan ekstensi (false)
                Err(e) if e.kind() == ErrorKind::NotFound => Ok(false),
                Err(e) => Err(Box::new(e)),
            },
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(false),
            Err(e) => Err(Box::new(e)),
        }
    }
}

impl TweakController for Extensions {
    const KEY: &'static str = "Extensions";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult {
        Self::enable()
    }

    fn disable() -> TweakResult {
        Self::disable()
    }

    fn is_enabled() -> TweakResult {
        Self::is_enabled()
    }
}

/// Modul fungsi langsung untuk `Extensions` (`tweaks::extensions::{enable, disable, is_enabled}`).
pub mod extensions {
    use super::{Extensions, TweakResult};

    pub fn enable() -> TweakResult {
        Extensions::enable()
    }

    pub fn disable() -> TweakResult {
        Extensions::disable()
    }

    pub fn is_enabled() -> TweakResult {
        Extensions::is_enabled()
    }
}

// =============================================================================
// Helper: Restart Windows Explorer (`explorer.exe`)
// =============================================================================

/// Memuat ulang proses `explorer.exe` menggunakan `std::process::Command`
/// (berguna setelah mengubah `ClassicMenu` agar shell langsung menerapkan perubahan).
pub fn restart_explorer() -> TweakResult {
    let mut kill_cmd = Command::new("taskkill");
    kill_cmd.args(["/f", "/im", "explorer.exe"]);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        kill_cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let _ = kill_cmd.status()?;

    let mut start_cmd = Command::new("explorer.exe");
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        start_cmd.creation_flags(CREATE_NO_WINDOW);
    }
    start_cmd.spawn()?;

    Ok(true)
}
