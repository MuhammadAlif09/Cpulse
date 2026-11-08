//! Modul System Tweaks (`tweaks.rs`) berdasarkan spesifikasi Wintoys v2.6.71.0.
//!
//! # Konvensi Wajib Seluruh Tweak
//! - `enable()`    : **MENERAPKAN tweak** (kondisi *privacy* / *optimized* / fitur tweak aktif).
//! - `disable()`   : **Mengembalikan perilaku default Windows**.
//! - `is_enabled()`: Mengembalikan `Ok(true)` apabila tweak sedang diterapkan.
//! - `is_available()`: Mengembalikan `true` apabila fitur didukung pada build Windows saat ini
//!   (berdasarkan `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\CurrentBuildNumber`).
//!
//! # Daftar Batch yang Diimplementasikan
//! - **Batch 1 (4 fitur)**: `ClassicMenu`, `EndTask`, `HiddenItems`, `Extensions`
//! - **Batch 2 (8 fitur)**: `SearchWebResults`, `Recommendations`, `AutoinstallSuggestions`,
//!   `ShowSuggestions`, `ShowHibernate`, `Advertising`, `WindowsTips`, `TailoredExperiences`
//! - **Batch 3 — Privacy (11 fitur)**: `Telemetry`, `AppTelemetry`, `CEIP`, `ErrorReporting`,
//!   `AppTracking`, `InkingTypingImprove`, `InkingTypingPersonalize`, `SpeechRecognition`,
//!   `Location`, `CameraOnLockscreen`, `CameraIndicator`
//!
//! # Catatan Hak Akses (Permissions / UAC Elevation)
//! Periksa konstanta `T::REQUIRES_ADMIN` pada setiap struct:
//! - `REQUIRES_ADMIN = true` menandakan tweak memodifikasi `HKEY_LOCAL_MACHINE` (`HKLM`),
//!   Windows Service (`sc.exe`), atau Scheduled Task sistem (`schtasks.exe`), sehingga
//!   **WAJIB dijalankan dengan hak akses Administrator (UAC elevation)**.

use crate::services::{self, ServiceStartMode};
use std::error::Error;
use std::fs;
use std::io::ErrorKind;
use std::process::Command;
use winreg::enums::*;
use winreg::{RegKey, RegValue, HKEY};

/// Alias tipe kembalian standar sesuai spesifikasi: `Result<bool, Box<dyn std::error::Error>>`.
pub type TweakResult = Result<bool, Box<dyn Error>>;

/// Flag pembuatan proses Windows tanpa memunculkan jendela konsol (`CREATE_NO_WINDOW`).
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

// =============================================================================
// Path & Value Constants (Sesuai WINTOYS_SPECIFICATION_FOR_AI.md)
// =============================================================================

/// Subkey informasi versi Windows untuk membaca `CurrentBuildNumber`.
pub const WINDOWS_NT_CURRENT_VERSION_PATH: &str =
    r"SOFTWARE\Microsoft\Windows NT\CurrentVersion";
pub const CURRENT_BUILD_NUMBER_VALUE_NAME: &str = "CurrentBuildNumber";

// --- Batch 1 Constants ---
pub const CLASSIC_MENU_CLSID_PATH: &str =
    r"SOFTWARE\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}";
pub const CLASSIC_MENU_INPROC_PATH: &str =
    r"SOFTWARE\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32";

pub const END_TASK_SUBKEY_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings";
pub const END_TASK_VALUE_NAME: &str = "TaskbarEndTask";

pub const EXPLORER_ADVANCED_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced";
pub const HIDDEN_ITEMS_VALUE_NAME: &str = "Hidden";
pub const EXTENSIONS_VALUE_NAME: &str = "HideFileExt";

// --- Batch 2 Constants ---
pub const WINDOWS_SEARCH_PATH: &str = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Search";
pub const BING_SEARCH_VALUE_NAME: &str = "BingSearchEnabled";

pub const POLICIES_EXPLORER_PATH: &str = r"SOFTWARE\Policies\Microsoft\Windows\Explorer";
pub const HIDE_RECOMMENDED_VALUE_NAME: &str = "HideRecommendedSection";

pub const CONTENT_DELIVERY_MANAGER_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager";
pub const SILENT_INSTALLED_APPS_VALUE_NAME: &str = "SilentInstalledAppsEnabled";
pub const PREINSTALLED_APPS_VALUE_NAME: &str = "PreInstalledAppsEnabled";
pub const PREINSTALLED_APPS_EVER_VALUE_NAME: &str = "PreInstalledAppsEverEnabled";
pub const OEM_PREINSTALLED_APPS_VALUE_NAME: &str = "OemPreInstalledAppsEnabled";

pub const POLICIES_CLOUD_CONTENT_PATH: &str =
    r"SOFTWARE\Policies\Microsoft\Windows\CloudContent";
pub const DISABLE_CONSUMER_FEATURES_VALUE_NAME: &str = "DisableWindowsConsumerFeatures";

pub const START_SUGGESTIONS_VALUE_NAME: &str = "SubscribedContent-338388Enabled";
pub const WINDOWS_TIPS_VALUE_NAME: &str = "SubscribedContent-338389Enabled";

pub const FLYOUT_MENU_SETTINGS_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\FlyoutMenuSettings";
pub const SHOW_HIBERNATE_VALUE_NAME: &str = "ShowHibernateOption";

pub const ADVERTISING_INFO_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo";
pub const ADVERTISING_ENABLED_VALUE_NAME: &str = "Enabled";

pub const PRIVACY_PATH: &str = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Privacy";
pub const TAILORED_EXPERIENCES_VALUE_NAME: &str = "TailoredExperiencesWithDiagnosticDataEnabled";

// --- Batch 3 (Privacy) Constants ---
pub const DATA_COLLECTION_POLICY_PATH: &str =
    r"SOFTWARE\Policies\Microsoft\Windows\DataCollection";
pub const DATA_COLLECTION_USERS_BASE_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection\Users";
pub const ALLOW_TELEMETRY_VALUE_NAME: &str = "AllowTelemetry";
pub const DIAGTRACK_SERVICE_NAME: &str = "diagtrack";
pub const COMPAT_APPRAISER_TASK_PATH: &str =
    r"\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser Exp";

pub const APP_COMPAT_POLICY_PATH: &str = r"SOFTWARE\Policies\Microsoft\Windows\AppCompat";
pub const AIT_ENABLE_VALUE_NAME: &str = "AITEnable";

pub const SQM_CLIENT_POLICY_PATH: &str = r"SOFTWARE\Policies\Microsoft\SQMClient\Windows";
pub const CEIP_ENABLE_VALUE_NAME: &str = "CEIPEnable";

pub const WER_PATH: &str = r"SOFTWARE\Microsoft\Windows\Windows Error Reporting";
pub const WER_DISABLED_VALUE_NAME: &str = "Disabled";

pub const START_TRACK_PROGS_VALUE_NAME: &str = "Start_TrackProgs";

pub const TIPC_PATH: &str = r"SOFTWARE\Microsoft\Input\TIPC";
pub const TIPC_ENABLED_VALUE_NAME: &str = "Enabled";

pub const INPUT_PERSONALIZATION_PATH: &str = r"SOFTWARE\Microsoft\InputPersonalization";
pub const RESTRICT_INK_VALUE_NAME: &str = "RestrictImplicitInkCollection";
pub const RESTRICT_TEXT_VALUE_NAME: &str = "RestrictImplicitTextCollection";

pub const TRAINED_DATA_STORE_PATH: &str =
    r"SOFTWARE\Microsoft\InputPersonalization\TrainedDataStore";
pub const HARVEST_CONTACTS_VALUE_NAME: &str = "HarvestContacts";

pub const PERSONALIZATION_SETTINGS_PATH: &str = r"SOFTWARE\Microsoft\Personalization\Settings";
pub const ACCEPTED_PRIVACY_POLICY_VALUE_NAME: &str = "AcceptedPrivacyPolicy";

pub const CPSS_INKING_TYPING_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\CPSS\Store\InkingAndTypingPersonalization";
pub const CPSS_VALUE_NAME: &str = "Value";

pub const ONLINE_SPEECH_PRIVACY_PATH: &str =
    r"SOFTWARE\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy";
pub const HAS_ACCEPTED_VALUE_NAME: &str = "HasAccepted";

pub const LOCATION_CONSENT_STORE_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location";
pub const LOCATION_VALUE_NAME: &str = "Value";
pub const LFSVC_SERVICE_NAME: &str = "lfsvc";

pub const PERSONALIZATION_POLICY_PATH: &str =
    r"SOFTWARE\Policies\Microsoft\Windows\Personalization";
pub const NO_LOCK_SCREEN_CAMERA_VALUE_NAME: &str = "NoLockScreenCamera";

pub const OEM_DEVICE_CAPTURE_PATH: &str = r"SOFTWARE\Microsoft\OEM\Device\Capture";
pub const NO_PHYSICAL_CAMERA_LED_VALUE_NAME: &str = "NoPhysicalCameraLED";

// --- Batch 4 (Remaining Start Menu & Ads) Constants ---
pub const START_ACCOUNT_NOTIFICATIONS_VALUE_NAME: &str = "Start_AccountNotifications";
pub const START_TRACK_DOCS_VALUE_NAME: &str = "Start_TrackDocs";

pub const FUN_FACTS_SUBSCRIBED_VALUE_NAME: &str = "SubscribedContent-338387Enabled";
pub const ROTATING_LOCK_SCREEN_OVERLAY_VALUE_NAME: &str = "RotatingLockScreenOverlayEnabled";

pub const CURRENT_VERSION_POLICIES_EXPLORER_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer";
pub const SETTINGS_PAGE_VISIBILITY_VALUE_NAME: &str = "SettingsPageVisibility";

pub const SUGGESTED_NOTIFICATIONS_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Notifications\Settings\Windows.SystemToast.Suggested";
pub const SUGGESTED_NOTIFICATIONS_ENABLED_VALUE_NAME: &str = "Enabled";

pub const SUGGESTIONS_IN_SETTINGS_338393_VALUE_NAME: &str = "SubscribedContent-338393Enabled";
pub const SUGGESTIONS_IN_SETTINGS_353694_VALUE_NAME: &str = "SubscribedContent-353694Enabled";
pub const SUGGESTIONS_IN_SETTINGS_353696_VALUE_NAME: &str = "SubscribedContent-353696Enabled";

pub const USER_PROFILE_ENGAGEMENT_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\UserProfileEngagement";
pub const SCOOBE_SETTING_ENABLED_VALUE_NAME: &str = "ScoobeSystemSettingEnabled";

pub const WINDOWS_WELCOME_VALUE_NAME: &str = "SubscribedContent-310093Enabled";

// --- Batch 5 (Desktop & File Explorer) Constants ---
pub const DISALLOW_SHAKING_VALUE_NAME: &str = "DisallowShaking";
pub const LISTVIEW_SHADOW_VALUE_NAME: &str = "ListviewShadow";
pub const DISABLE_PREVIEW_DESKTOP_VALUE_NAME: &str = "DisablePreviewDesktop";

pub const HIDE_DESKTOP_ICONS_CLASSIC_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\HideDesktopIcons\ClassicStartMenu";
pub const HIDE_DESKTOP_ICONS_NEW_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\HideDesktopIcons\NewStartPanel";
pub const RECYCLE_BIN_CLSID_VALUE_NAME: &str = "{645FF040-5081-101B-9F08-00AA002F954E}";
pub const THIS_PC_CLSID_VALUE_NAME: &str = "{20D04FE0-3AEA-1069-A2D8-08002B30309D}";

pub const SHELL_ICONS_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons";
pub const SHORTCUT_ARROW_VALUE_NAME: &str = "29";
pub const BLANK_ICO_PATH: &str = r"C:\Windows\blank.ico";

pub const TASKBAR_SD_VALUE_NAME: &str = "TaskbarSd";

pub const WIDGETS_POLICY_MANAGER_PATH: &str =
    r"SOFTWARE\Microsoft\PolicyManager\default\NewsAndInterests\AllowNewsAndInterests";
pub const WIDGETS_POLICY_MANAGER_VALUE_NAME: &str = "value";
pub const WIDGETS_DSH_POLICY_PATH: &str = r"SOFTWARE\Policies\Microsoft\Dsh";
pub const WIDGETS_DSH_VALUE_NAME: &str = "AllowNewsAndInterests";

pub const CONTROL_PANEL_DESKTOP_PATH: &str = r"Control Panel\Desktop";
pub const JPEG_IMPORT_QUALITY_VALUE_NAME: &str = "JPEGImportQuality";

pub const AUTO_CHECK_SELECT_VALUE_NAME: &str = "AutoCheckSelect";

pub const CLASSIC_INTERFACE_CLSID_1_PATH: &str =
    r"SOFTWARE\Classes\CLSID\{2aa9162e-c906-4dd9-ad0b-3d24a8eef5a0}";
pub const CLASSIC_INTERFACE_CLSID_1_INPROC_PATH: &str =
    r"SOFTWARE\Classes\CLSID\{2aa9162e-c906-4dd9-ad0b-3d24a8eef5a0}\InProcServer32";
pub const CLASSIC_INTERFACE_CLSID_2_PATH: &str =
    r"SOFTWARE\Classes\CLSID\{6480100b-5a83-4d1e-9f69-8ae5a88e9a33}";
pub const CLASSIC_INTERFACE_CLSID_2_INPROC_PATH: &str =
    r"SOFTWARE\Classes\CLSID\{6480100b-5a83-4d1e-9f69-8ae5a88e9a33}\InProcServer32";
pub const CLASSIC_INTERFACE_DLL_DUMMY_PATH: &str =
    r"C:\Windows\System32\Windows.UI.FileExplorer.dll_";
pub const IE_SHELL_BROWSER_TOOLBAR_PATH: &str =
    r"SOFTWARE\Microsoft\Internet Explorer\Toolbar\ShellBrowser";
pub const ITBAR7_LAYOUT_VALUE_NAME: &str = "ITBar7Layout";

pub const NAV_PANE_GALLERY_CLSID_PATH: &str =
    r"SOFTWARE\Classes\CLSID\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}";
pub const NAV_PANE_HOME_CLSID_PATH: &str =
    r"SOFTWARE\Classes\CLSID\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}";
pub const NAV_PANE_RECYCLE_BIN_CLSID_PATH: &str =
    r"SOFTWARE\Classes\CLSID\{645FF040-5081-101B-9F08-00AA002F954E}";
pub const IS_PINNED_TO_NAMESPACE_TREE_VALUE_NAME: &str = "System.IsPinnedToNameSpaceTree";

pub const LAUNCH_TO_VALUE_NAME: &str = "LaunchTo";

pub const DETAILS_CONTAINER_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Modules\GlobalSettings\DetailsContainer";
pub const DETAILS_CONTAINER_VALUE_NAME: &str = "DetailsContainer";
pub const DETAILS_CONTAINER_SIZER_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Modules\GlobalSettings\Sizer";
pub const DETAILS_CONTAINER_SIZER_VALUE_NAME: &str = "DetailsContainerSizer";

pub const EXTRACTION_WIZARD_PATH: &str =
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\ExtractionWizard";
pub const EXTRACTION_SHOW_FILES_VALUE_NAME: &str = "ShowFiles";

pub const SHOW_SYNC_PROVIDER_NOTIFICATIONS_VALUE_NAME: &str = "ShowSyncProviderNotifications";

// =============================================================================
// RestartHint & Trait Kontrak Tweak
// =============================================================================

/// Petunjuk aksi tambahan bagi UI setelah sebuah tweak diubah.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RestartHint {
    None,
    RefreshDesktop,
    ReopenExplorerWindows,
    RestartExplorer,
    SignOut,
}

/// Kontrak seragam untuk setiap controller Tweak Wintoys.
pub trait TweakController {
    /// Nama identifikasi fitur sesuai katalog Wintoys.
    const KEY: &'static str;

    /// Menandakan apakah manipulasi fitur ini membutuhkan elevasi Administrator (`HKLM` / Service / Task).
    const REQUIRES_ADMIN: bool;

    /// Petunjuk bagi UI apakah perubahan membutuhkan refresh desktop, buka ulang Explorer,
    /// restart `explorer.exe`, atau sign out.
    const RESTART_HINT: RestartHint = RestartHint::None;

    /// Mengecek ketersediaan fitur berdasarkan nomor build Windows saat ini
    /// (`HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\CurrentBuildNumber`).
    /// Default: `true` (tersedia di Windows 10 & Windows 11).
    fn is_available() -> bool {
        true
    }

    /// **MENERAPKAN tweak** (kondisi *privacy* / *optimized*).
    fn enable() -> TweakResult;

    /// **Mengembalikan perilaku default Windows**.
    fn disable() -> TweakResult;

    /// Memeriksa apakah tweak saat ini sedang diterapkan (`true`) atau tidak (`false`).
    fn is_enabled() -> TweakResult;
}

// =============================================================================
// Internal Registry, OS Build, SID & Process Helpers
// =============================================================================

/// Membaca nomor build Windows dari `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\CurrentBuildNumber`.
/// Contoh: Windows 10 22H2 = `19045`, Windows 11 21H2 = `22000`, Windows 11 22H2+ = `22621` / `22631` / `26100`.
pub fn windows_build_number() -> Option<u32> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm
        .open_subkey_with_flags(WINDOWS_NT_CURRENT_VERSION_PATH, KEY_READ)
        .ok()?;
    let build_str: String = key.get_value(CURRENT_BUILD_NUMBER_VALUE_NAME).ok()?;
    build_str.trim().parse::<u32>().ok()
}

/// Mengembalikan `true` bila sistem operasi adalah Windows 11 (`CurrentBuildNumber >= 22000`).
pub fn is_windows_11() -> bool {
    windows_build_number().map_or(false, |b| b >= 22000)
}

/// Menulis nilai `REG_DWORD` (`u32`) pada hive dan subkey tertentu (membuat subkey bila belum ada).
fn set_dword(
    hive: HKEY,
    subkey_path: &str,
    value_name: &str,
    data: u32,
) -> Result<(), Box<dyn Error>> {
    let root = RegKey::predef(hive);
    let (key, _disp) = root.create_subkey(subkey_path)?;
    key.set_value(value_name, &data)?;
    Ok(())
}

/// Membaca nilai `REG_DWORD` (`u32`). Mengembalikan `Ok(None)` jika subkey atau value belum ada.
fn get_dword_opt(
    hive: HKEY,
    subkey_path: &str,
    value_name: &str,
) -> Result<Option<u32>, Box<dyn Error>> {
    let root = RegKey::predef(hive);
    match root.open_subkey_with_flags(subkey_path, KEY_READ) {
        Ok(key) => match key.get_value::<u32, _>(value_name) {
            Ok(val) => Ok(Some(val)),
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
            Err(e) => Err(Box::new(e)),
        },
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(Box::new(e)),
    }
}

/// Menulis nilai `REG_SZ` (`&str`) pada hive dan subkey tertentu (membuat subkey bila belum ada).
fn set_string(
    hive: HKEY,
    subkey_path: &str,
    value_name: &str,
    data: &str,
) -> Result<(), Box<dyn Error>> {
    let root = RegKey::predef(hive);
    let (key, _disp) = root.create_subkey(subkey_path)?;
    key.set_value(value_name, &data)?;
    Ok(())
}

/// Membaca nilai `REG_SZ` (`String`). Mengembalikan `Ok(None)` jika subkey atau value belum ada.
fn get_string_opt(
    hive: HKEY,
    subkey_path: &str,
    value_name: &str,
) -> Result<Option<String>, Box<dyn Error>> {
    let root = RegKey::predef(hive);
    match root.open_subkey_with_flags(subkey_path, KEY_READ) {
        Ok(key) => match key.get_value::<String, _>(value_name) {
            Ok(val) => Ok(Some(val)),
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
            Err(e) => Err(Box::new(e)),
        },
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(Box::new(e)),
    }
}

/// Menulis nilai `REG_BINARY` (`&[u8]`) pada hive dan subkey tertentu (membuat subkey bila belum ada).
fn set_binary(
    hive: HKEY,
    subkey_path: &str,
    value_name: &str,
    data: &[u8],
) -> Result<(), Box<dyn Error>> {
    let root = RegKey::predef(hive);
    let (key, _disp) = root.create_subkey(subkey_path)?;
    let raw = RegValue {
        vtype: REG_BINARY,
        bytes: data.to_vec(),
    };
    key.set_raw_value(value_name, &raw)?;
    Ok(())
}

/// Membaca nilai `REG_BINARY` (`Vec<u8>`). Mengembalikan `Ok(None)` jika subkey atau value belum ada.
fn get_binary_opt(
    hive: HKEY,
    subkey_path: &str,
    value_name: &str,
) -> Result<Option<Vec<u8>>, Box<dyn Error>> {
    let root = RegKey::predef(hive);
    match root.open_subkey_with_flags(subkey_path, KEY_READ) {
        Ok(key) => match key.get_raw_value(value_name) {
            Ok(raw) => Ok(Some(raw.bytes)),
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
            Err(e) => Err(Box::new(e)),
        },
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(Box::new(e)),
    }
}

/// Menghapus sebuah value dari subkey tertentu. Mengabaikan `ErrorKind::NotFound` jika sudah terhapus.
fn delete_reg_value(
    hive: HKEY,
    subkey_path: &str,
    value_name: &str,
) -> Result<(), Box<dyn Error>> {
    let root = RegKey::predef(hive);
    match root.open_subkey_with_flags(subkey_path, KEY_SET_VALUE) {
        Ok(key) => match key.delete_value(value_name) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(()),
            Err(e) => Err(Box::new(e)),
        },
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(()),
        Err(e) => Err(Box::new(e)),
    }
}

/// Menghapus seluruh pohon subkey. Mengabaikan `ErrorKind::NotFound` jika subkey memang sudah tidak ada.
fn delete_subkey_tree(hive: HKEY, subkey_path: &str) -> Result<(), Box<dyn Error>> {
    let root = RegKey::predef(hive);
    match root.delete_subkey_all(subkey_path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(()),
        Err(e) => Err(Box::new(e)),
    }
}

/// Memanggil `SHChangeNotify(SHCNE_ASSOCCHANGED = 0x08000000, SHCNF_IDLIST = 0, null, null)`
/// lewat crate `windows` agar Desktop & Shell langsung me-refresh ikon tanpa perlu restart Explorer.
pub fn refresh_shell() {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::Shell::{SHChangeNotify, SHCNE_ASSOCCHANGED, SHCNF_IDLIST};
        unsafe {
            SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, None, None);
        }
    }
}

/// Menghasilkan byte file `.ico` 32x32 32-bit BGRA yang sepenuhnya transparan secara murni di Rust:
/// - `ICONDIR` (6 byte) + `ICONDIRENTRY` (16 byte)
/// - `BITMAPINFOHEADER` (40 byte, width = 32, height = 64 [32 XOR + 32 AND], 32bpp)
/// - Piksel BGRA nol (`32 * 32 * 4 = 4096` byte)
/// - AND mask (`32 * 4 = 128` byte)
pub fn generate_blank_32x32_ico() -> Vec<u8> {
    const WIDTH: u32 = 32;
    const HEIGHT: u32 = 32;
    const XOR_MASK_BYTES: u32 = WIDTH * HEIGHT * 4; // 4096 bytes
    const AND_MASK_BYTES: u32 = (WIDTH / 8) * HEIGHT; // 128 bytes
    const BMP_HEADER_BYTES: u32 = 40;
    const IMAGE_RES_BYTES: u32 = BMP_HEADER_BYTES + XOR_MASK_BYTES + AND_MASK_BYTES; // 4264 bytes
    const IMAGE_OFFSET: u32 = 6 + 16; // 22 bytes

    let mut ico = Vec::with_capacity((IMAGE_OFFSET + IMAGE_RES_BYTES) as usize);

    // 1. ICONDIR (6 bytes)
    ico.extend_from_slice(&0u16.to_le_bytes()); // idReserved = 0
    ico.extend_from_slice(&1u16.to_le_bytes()); // idType = 1 (ICO)
    ico.extend_from_slice(&1u16.to_le_bytes()); // idCount = 1 image

    // 2. ICONDIRENTRY (16 bytes)
    ico.push(WIDTH as u8); // bWidth = 32
    ico.push(HEIGHT as u8); // bHeight = 32
    ico.push(0); // bColorCount = 0
    ico.push(0); // bReserved = 0
    ico.extend_from_slice(&1u16.to_le_bytes()); // wPlanes = 1
    ico.extend_from_slice(&32u16.to_le_bytes()); // wBitCount = 32
    ico.extend_from_slice(&IMAGE_RES_BYTES.to_le_bytes()); // dwBytesInRes = 4264
    ico.extend_from_slice(&IMAGE_OFFSET.to_le_bytes()); // dwImageOffset = 22

    // 3. BITMAPINFOHEADER (40 bytes)
    ico.extend_from_slice(&BMP_HEADER_BYTES.to_le_bytes()); // biSize = 40
    ico.extend_from_slice(&(WIDTH as i32).to_le_bytes()); // biWidth = 32
    ico.extend_from_slice(&((HEIGHT * 2) as i32).to_le_bytes()); // biHeight = 64 (XOR + AND)
    ico.extend_from_slice(&1u16.to_le_bytes()); // biPlanes = 1
    ico.extend_from_slice(&32u16.to_le_bytes()); // biBitCount = 32
    ico.extend_from_slice(&0u32.to_le_bytes()); // biCompression = BI_RGB (0)
    ico.extend_from_slice(&(XOR_MASK_BYTES + AND_MASK_BYTES).to_le_bytes()); // biSizeImage
    ico.extend_from_slice(&0i32.to_le_bytes()); // biXPelsPerMeter = 0
    ico.extend_from_slice(&0i32.to_le_bytes()); // biYPelsPerMeter = 0
    ico.extend_from_slice(&0u32.to_le_bytes()); // biClrUsed = 0
    ico.extend_from_slice(&0u32.to_le_bytes()); // biClrImportant = 0

    // 4. Piksel BGRA nol (4096 bytes) + 5. AND mask (128 bytes)
    ico.resize((IMAGE_OFFSET + IMAGE_RES_BYTES) as usize, 0u8);

    ico
}

/// Mengambil Security Identifier (SID) user yang sedang aktif (contoh: `"S-1-5-21-..."`).
/// Menggunakan `whoami.exe /user /nh` dengan fallback enumerasi `HKEY_USERS`.
pub fn current_user_sid() -> Option<String> {
    let mut cmd = Command::new("whoami.exe");
    cmd.args(["/user", "/nh"]);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    if let Ok(output) = cmd.output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for token in stdout.split_whitespace() {
                if token.starts_with("S-1-5-21-") {
                    return Some(token.trim().to_string());
                }
            }
        }
    }

    // Fallback: cari subkey S-1-5-21-* di HKEY_USERS
    let hku = RegKey::predef(HKEY_USERS);
    for name in hku.enum_keys().flatten() {
        if name.starts_with("S-1-5-21-") && !name.ends_with("_Classes") {
            return Some(name);
        }
    }

    None
}

/// Mengaktifkan atau menonaktifkan Scheduled Task via `schtasks.exe /Change /TN <task_path> /Enable|/Disable`.
/// Mengabaikan error bila task tidak ditemukan pada edisi Windows tertentu.
fn set_scheduled_task_enabled(task_path: &str, enable: bool) {
    let flag = if enable { "/Enable" } else { "/Disable" };
    let mut cmd = Command::new("schtasks.exe");
    cmd.args(["/Change", "/TN", task_path, flag]);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let _ = cmd.output();
}

/// Menghentikan proses `StartMenuExperienceHost.exe` agar Windows otomatis me-restart Start Menu
/// dan langsung memuat perubahan policy/registry tanpa perlu *sign out*.
pub fn refresh_start_menu() -> TweakResult {
    let mut cmd = Command::new("taskkill");
    cmd.args(["/f", "/im", "StartMenuExperienceHost.exe"]);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let _ = cmd.output()?;
    Ok(true)
}

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

// =============================================================================
// BATCH 1: Explorer, Context Menu & Taskbar
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Classic Right-Click Context Menu Windows 10/11 (`ClassicMenu`)
// -----------------------------------------------------------------------------

pub struct ClassicMenu;

impl ClassicMenu {
    pub fn is_available() -> bool {
        windows_build_number().map_or(false, |b| b >= 22000)
    }

    pub fn enable() -> TweakResult {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (inproc_key, _disp) = hkcu.create_subkey(CLASSIC_MENU_INPROC_PATH)?;
        inproc_key.set_value("", &"")?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        delete_subkey_tree(HKEY_CURRENT_USER, CLASSIC_MENU_CLSID_PATH)?;
        Ok(true)
    }

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
    const RESTART_HINT: RestartHint = RestartHint::RestartExplorer;

    fn is_available() -> bool {
        Self::is_available()
    }

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod classic_menu {
    use super::{ClassicMenu, TweakResult};
    pub fn is_available() -> bool { ClassicMenu::is_available() }
    pub fn enable() -> TweakResult { ClassicMenu::enable() }
    pub fn disable() -> TweakResult { ClassicMenu::disable() }
    pub fn is_enabled() -> TweakResult { ClassicMenu::is_enabled() }
}

// -----------------------------------------------------------------------------
// 2. Taskbar End Task (`EndTask`)
// -----------------------------------------------------------------------------

pub struct EndTask;

impl EndTask {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(HKEY_CURRENT_USER, END_TASK_SUBKEY_PATH, END_TASK_VALUE_NAME, 1)?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(HKEY_CURRENT_USER, END_TASK_SUBKEY_PATH, END_TASK_VALUE_NAME, 0)?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(HKEY_CURRENT_USER, END_TASK_SUBKEY_PATH, END_TASK_VALUE_NAME)? == Some(1))
    }
}

impl TweakController for EndTask {
    const KEY: &'static str = "EndTask";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod end_task {
    use super::{EndTask, TweakResult};
    pub fn is_available() -> bool { EndTask::is_available() }
    pub fn enable() -> TweakResult { EndTask::enable() }
    pub fn disable() -> TweakResult { EndTask::disable() }
    pub fn is_enabled() -> TweakResult { EndTask::is_enabled() }
}

// -----------------------------------------------------------------------------
// 3. Show Hidden Files (`HiddenItems`)
// -----------------------------------------------------------------------------

pub struct HiddenItems;

impl HiddenItems {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(HKEY_CURRENT_USER, EXPLORER_ADVANCED_PATH, HIDDEN_ITEMS_VALUE_NAME, 1)?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(HKEY_CURRENT_USER, EXPLORER_ADVANCED_PATH, HIDDEN_ITEMS_VALUE_NAME, 2)?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(HKEY_CURRENT_USER, EXPLORER_ADVANCED_PATH, HIDDEN_ITEMS_VALUE_NAME)? == Some(1))
    }
}

impl TweakController for HiddenItems {
    const KEY: &'static str = "HiddenItems";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod hidden_items {
    use super::{HiddenItems, TweakResult};
    pub fn is_available() -> bool { HiddenItems::is_available() }
    pub fn enable() -> TweakResult { HiddenItems::enable() }
    pub fn disable() -> TweakResult { HiddenItems::disable() }
    pub fn is_enabled() -> TweakResult { HiddenItems::is_enabled() }
}

// -----------------------------------------------------------------------------
// 4. Show File Extensions (`Extensions`)
// -----------------------------------------------------------------------------

pub struct Extensions;

impl Extensions {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(HKEY_CURRENT_USER, EXPLORER_ADVANCED_PATH, EXTENSIONS_VALUE_NAME, 0)?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(HKEY_CURRENT_USER, EXPLORER_ADVANCED_PATH, EXTENSIONS_VALUE_NAME, 1)?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(HKEY_CURRENT_USER, EXPLORER_ADVANCED_PATH, EXTENSIONS_VALUE_NAME)? == Some(0))
    }
}

impl TweakController for Extensions {
    const KEY: &'static str = "Extensions";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod extensions {
    use super::{Extensions, TweakResult};
    pub fn is_available() -> bool { Extensions::is_available() }
    pub fn enable() -> TweakResult { Extensions::enable() }
    pub fn disable() -> TweakResult { Extensions::disable() }
    pub fn is_enabled() -> TweakResult { Extensions::is_enabled() }
}

// =============================================================================
// BATCH 2: Start Menu, Search & Ads
// =============================================================================

// -----------------------------------------------------------------------------
// 5. SearchWebResults (Matikan Web Search Bing di Start Menu)
// -----------------------------------------------------------------------------

pub struct SearchWebResults;

impl SearchWebResults {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(HKEY_CURRENT_USER, WINDOWS_SEARCH_PATH, BING_SEARCH_VALUE_NAME, 0)?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        delete_reg_value(HKEY_CURRENT_USER, WINDOWS_SEARCH_PATH, BING_SEARCH_VALUE_NAME)?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(HKEY_CURRENT_USER, WINDOWS_SEARCH_PATH, BING_SEARCH_VALUE_NAME)? == Some(0))
    }
}

impl TweakController for SearchWebResults {
    const KEY: &'static str = "SearchWebResults";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod search_web_results {
    use super::{SearchWebResults, TweakResult};
    pub fn is_available() -> bool { SearchWebResults::is_available() }
    pub fn enable() -> TweakResult { SearchWebResults::enable() }
    pub fn disable() -> TweakResult { SearchWebResults::disable() }
    pub fn is_enabled() -> TweakResult { SearchWebResults::is_enabled() }
}

// -----------------------------------------------------------------------------
// 6. Recommendations (Sembunyikan bagian Recommended di Start Menu Win 11)
// -----------------------------------------------------------------------------

/// Hanya tersedia pada Windows 11 22H2+ (`build >= 22621`).
pub struct Recommendations;

impl Recommendations {
    pub fn is_available() -> bool {
        windows_build_number().map_or(false, |b| b >= 22621)
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            POLICIES_EXPLORER_PATH,
            HIDE_RECOMMENDED_VALUE_NAME,
            1,
        )?;
        let _ = refresh_start_menu();
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        delete_reg_value(
            HKEY_CURRENT_USER,
            POLICIES_EXPLORER_PATH,
            HIDE_RECOMMENDED_VALUE_NAME,
        )?;
        let _ = refresh_start_menu();
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            POLICIES_EXPLORER_PATH,
            HIDE_RECOMMENDED_VALUE_NAME,
        )? == Some(1))
    }
}

impl TweakController for Recommendations {
    const KEY: &'static str = "Recommendations";
    const REQUIRES_ADMIN: bool = false;

    fn is_available() -> bool {
        Self::is_available()
    }

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod recommendations {
    use super::{Recommendations, TweakResult};
    pub fn is_available() -> bool { Recommendations::is_available() }
    pub fn enable() -> TweakResult { Recommendations::enable() }
    pub fn disable() -> TweakResult { Recommendations::disable() }
    pub fn is_enabled() -> TweakResult { Recommendations::is_enabled() }
}

// -----------------------------------------------------------------------------
// 7. AutoinstallSuggestions (Cegah Windows menginstall aplikasi promosi otomatis)
// -----------------------------------------------------------------------------

pub struct AutoinstallSuggestions;

impl AutoinstallSuggestions {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            SILENT_INSTALLED_APPS_VALUE_NAME,
            0,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            PREINSTALLED_APPS_VALUE_NAME,
            0,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            PREINSTALLED_APPS_EVER_VALUE_NAME,
            0,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            OEM_PREINSTALLED_APPS_VALUE_NAME,
            0,
        )?;

        set_dword(
            HKEY_LOCAL_MACHINE,
            POLICIES_CLOUD_CONTENT_PATH,
            DISABLE_CONSUMER_FEATURES_VALUE_NAME,
            1,
        )?;

        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            SILENT_INSTALLED_APPS_VALUE_NAME,
            1,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            PREINSTALLED_APPS_VALUE_NAME,
            1,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            PREINSTALLED_APPS_EVER_VALUE_NAME,
            1,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            OEM_PREINSTALLED_APPS_VALUE_NAME,
            1,
        )?;

        delete_reg_value(
            HKEY_LOCAL_MACHINE,
            POLICIES_CLOUD_CONTENT_PATH,
            DISABLE_CONSUMER_FEATURES_VALUE_NAME,
        )?;

        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let hkcu_disabled = get_dword_opt(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            SILENT_INSTALLED_APPS_VALUE_NAME,
        )? == Some(0);

        let hklm_policy_enabled = get_dword_opt(
            HKEY_LOCAL_MACHINE,
            POLICIES_CLOUD_CONTENT_PATH,
            DISABLE_CONSUMER_FEATURES_VALUE_NAME,
        )? == Some(1);

        Ok(hkcu_disabled && hklm_policy_enabled)
    }
}

impl TweakController for AutoinstallSuggestions {
    const KEY: &'static str = "AutoinstallSuggestions";
    const REQUIRES_ADMIN: bool = true;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod autoinstall_suggestions {
    use super::{AutoinstallSuggestions, TweakResult};
    pub fn is_available() -> bool { AutoinstallSuggestions::is_available() }
    pub fn enable() -> TweakResult { AutoinstallSuggestions::enable() }
    pub fn disable() -> TweakResult { AutoinstallSuggestions::disable() }
    pub fn is_enabled() -> TweakResult { AutoinstallSuggestions::is_enabled() }
}

// -----------------------------------------------------------------------------
// 8. ShowSuggestions (Matikan saran aplikasi di Start Menu — Khusus Windows 10)
// -----------------------------------------------------------------------------

/// Hanya tersedia pada Windows 10 (`build < 22000`).
pub struct ShowSuggestions;

impl ShowSuggestions {
    pub fn is_available() -> bool {
        windows_build_number().map_or(false, |b| b < 22000)
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            START_SUGGESTIONS_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            START_SUGGESTIONS_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            START_SUGGESTIONS_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for ShowSuggestions {
    const KEY: &'static str = "ShowSuggestions";
    const REQUIRES_ADMIN: bool = false;

    fn is_available() -> bool {
        Self::is_available()
    }

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod show_suggestions {
    use super::{ShowSuggestions, TweakResult};
    pub fn is_available() -> bool { ShowSuggestions::is_available() }
    pub fn enable() -> TweakResult { ShowSuggestions::enable() }
    pub fn disable() -> TweakResult { ShowSuggestions::disable() }
    pub fn is_enabled() -> TweakResult { ShowSuggestions::is_enabled() }
}

// -----------------------------------------------------------------------------
// 9. ShowHibernate (Tampilkan opsi Hibernate di tombol Power)
// -----------------------------------------------------------------------------

pub struct ShowHibernate;

impl ShowHibernate {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            FLYOUT_MENU_SETTINGS_PATH,
            SHOW_HIBERNATE_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            FLYOUT_MENU_SETTINGS_PATH,
            SHOW_HIBERNATE_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_LOCAL_MACHINE,
            FLYOUT_MENU_SETTINGS_PATH,
            SHOW_HIBERNATE_VALUE_NAME,
        )? == Some(1))
    }
}

impl TweakController for ShowHibernate {
    const KEY: &'static str = "ShowHibernate";
    const REQUIRES_ADMIN: bool = true;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod show_hibernate {
    use super::{ShowHibernate, TweakResult};
    pub fn is_available() -> bool { ShowHibernate::is_available() }
    pub fn enable() -> TweakResult { ShowHibernate::enable() }
    pub fn disable() -> TweakResult { ShowHibernate::disable() }
    pub fn is_enabled() -> TweakResult { ShowHibernate::is_enabled() }
}

// -----------------------------------------------------------------------------
// 10. Advertising (Matikan Advertising ID untuk personalisasi iklan)
// -----------------------------------------------------------------------------

pub struct Advertising;

impl Advertising {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            ADVERTISING_INFO_PATH,
            ADVERTISING_ENABLED_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            ADVERTISING_INFO_PATH,
            ADVERTISING_ENABLED_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            ADVERTISING_INFO_PATH,
            ADVERTISING_ENABLED_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for Advertising {
    const KEY: &'static str = "Advertising";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod advertising {
    use super::{Advertising, TweakResult};
    pub fn is_available() -> bool { Advertising::is_available() }
    pub fn enable() -> TweakResult { Advertising::enable() }
    pub fn disable() -> TweakResult { Advertising::disable() }
    pub fn is_enabled() -> TweakResult { Advertising::is_enabled() }
}

// -----------------------------------------------------------------------------
// 11. WindowsTips (Matikan tips dan saran pop-up Windows)
// -----------------------------------------------------------------------------

pub struct WindowsTips;

impl WindowsTips {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            WINDOWS_TIPS_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            WINDOWS_TIPS_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            WINDOWS_TIPS_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for WindowsTips {
    const KEY: &'static str = "WindowsTips";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod windows_tips {
    use super::{WindowsTips, TweakResult};
    pub fn is_available() -> bool { WindowsTips::is_available() }
    pub fn enable() -> TweakResult { WindowsTips::enable() }
    pub fn disable() -> TweakResult { WindowsTips::disable() }
    pub fn is_enabled() -> TweakResult { WindowsTips::is_enabled() }
}

// -----------------------------------------------------------------------------
// 12. TailoredExperiences (Matikan penawaran/iklan berdasarkan data diagnostik)
// -----------------------------------------------------------------------------

pub struct TailoredExperiences;

impl TailoredExperiences {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            PRIVACY_PATH,
            TAILORED_EXPERIENCES_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            PRIVACY_PATH,
            TAILORED_EXPERIENCES_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            PRIVACY_PATH,
            TAILORED_EXPERIENCES_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for TailoredExperiences {
    const KEY: &'static str = "TailoredExperiences";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod tailored_experiences {
    use super::{TailoredExperiences, TweakResult};
    pub fn is_available() -> bool { TailoredExperiences::is_available() }
    pub fn enable() -> TweakResult { TailoredExperiences::enable() }
    pub fn disable() -> TweakResult { TailoredExperiences::disable() }
    pub fn is_enabled() -> TweakResult { TailoredExperiences::is_enabled() }
}

// =============================================================================
// BATCH 3: Privacy (11 Tweaks)
// =============================================================================

// -----------------------------------------------------------------------------
// 13. Telemetry (ADMIN — Matikan Telemetry Windows, DiagTrack & Appraiser Task)
// -----------------------------------------------------------------------------

/// **Telemetry** (`Tweaks.Privacy`) — **WAJIB Administrator (UAC)**
///
/// - **enable()**:
///   1. `HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection` -> `AllowTelemetry = 0`
///   2. Service `"diagtrack"`: start mode `Disabled` lalu `stop`
///   3. Scheduled task `\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser Exp` -> `Disable`
/// - **disable()**:
///   1. Hapus `AllowTelemetry` di `HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection`
///   2. Hapus `AllowTelemetry` di `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection\Users\<SID>`
///   3. Service `"diagtrack"`: start mode `Automatic` lalu `start`
///   4. Scheduled task -> `Enable`
/// - **is_enabled()**:
///   `diagtrack` **TIDAK** running **DAN** `AllowTelemetry == 0`.
pub struct Telemetry;

impl Telemetry {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            DATA_COLLECTION_POLICY_PATH,
            ALLOW_TELEMETRY_VALUE_NAME,
            0,
        )?;

        services::set_start_mode(DIAGTRACK_SERVICE_NAME, ServiceStartMode::Disabled)?;
        services::stop(DIAGTRACK_SERVICE_NAME)?;

        set_scheduled_task_enabled(COMPAT_APPRAISER_TASK_PATH, false);

        Ok(true)
    }

    pub fn disable() -> TweakResult {
        delete_reg_value(
            HKEY_LOCAL_MACHINE,
            DATA_COLLECTION_POLICY_PATH,
            ALLOW_TELEMETRY_VALUE_NAME,
        )?;

        if let Some(sid) = current_user_sid() {
            let user_policy_path = format!(r"{}\{}", DATA_COLLECTION_USERS_BASE_PATH, sid);
            let _ = delete_reg_value(
                HKEY_LOCAL_MACHINE,
                &user_policy_path,
                ALLOW_TELEMETRY_VALUE_NAME,
            );
        }

        services::set_start_mode(DIAGTRACK_SERVICE_NAME, ServiceStartMode::Automatic)?;
        services::start(DIAGTRACK_SERVICE_NAME)?;

        set_scheduled_task_enabled(COMPAT_APPRAISER_TASK_PATH, true);

        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let diagtrack_running = services::is_running(DIAGTRACK_SERVICE_NAME)?;
        let allow_telemetry = get_dword_opt(
            HKEY_LOCAL_MACHINE,
            DATA_COLLECTION_POLICY_PATH,
            ALLOW_TELEMETRY_VALUE_NAME,
        )?;

        Ok(!diagtrack_running && allow_telemetry == Some(0))
    }
}

impl TweakController for Telemetry {
    const KEY: &'static str = "Telemetry";
    const REQUIRES_ADMIN: bool = true;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod telemetry {
    use super::{Telemetry, TweakResult};
    pub fn is_available() -> bool { Telemetry::is_available() }
    pub fn enable() -> TweakResult { Telemetry::enable() }
    pub fn disable() -> TweakResult { Telemetry::disable() }
    pub fn is_enabled() -> TweakResult { Telemetry::is_enabled() }
}

// -----------------------------------------------------------------------------
// 14. AppTelemetry (ADMIN — Matikan Application Telemetry)
// -----------------------------------------------------------------------------

/// **AppTelemetry** (`Tweaks.Privacy`) — **WAJIB Administrator (UAC)**
/// - **Path**: `HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat`
/// - **Value**: `AITEnable` (`REG_DWORD`: `enable = 0`, `disable = 1`)
pub struct AppTelemetry;

impl AppTelemetry {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            APP_COMPAT_POLICY_PATH,
            AIT_ENABLE_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            APP_COMPAT_POLICY_PATH,
            AIT_ENABLE_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_LOCAL_MACHINE,
            APP_COMPAT_POLICY_PATH,
            AIT_ENABLE_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for AppTelemetry {
    const KEY: &'static str = "AppTelemetry";
    const REQUIRES_ADMIN: bool = true;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod app_telemetry {
    use super::{AppTelemetry, TweakResult};
    pub fn is_available() -> bool { AppTelemetry::is_available() }
    pub fn enable() -> TweakResult { AppTelemetry::enable() }
    pub fn disable() -> TweakResult { AppTelemetry::disable() }
    pub fn is_enabled() -> TweakResult { AppTelemetry::is_enabled() }
}

// -----------------------------------------------------------------------------
// 15. CEIP (ADMIN — Matikan Customer Experience Improvement Program)
// -----------------------------------------------------------------------------

/// **CEIP** (`Tweaks.Privacy`) — **WAJIB Administrator (UAC)**
/// - **Path**: `HKLM\SOFTWARE\Policies\Microsoft\SQMClient\Windows`
/// - **Value**: `CEIPEnable` (`REG_DWORD`: `enable = 0`, `disable = 1`)
pub struct CEIP;

impl CEIP {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            SQM_CLIENT_POLICY_PATH,
            CEIP_ENABLE_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            SQM_CLIENT_POLICY_PATH,
            CEIP_ENABLE_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_LOCAL_MACHINE,
            SQM_CLIENT_POLICY_PATH,
            CEIP_ENABLE_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for CEIP {
    const KEY: &'static str = "CEIP";
    const REQUIRES_ADMIN: bool = true;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod ceip {
    use super::{TweakResult, CEIP};
    pub fn is_available() -> bool { CEIP::is_available() }
    pub fn enable() -> TweakResult { CEIP::enable() }
    pub fn disable() -> TweakResult { CEIP::disable() }
    pub fn is_enabled() -> TweakResult { CEIP::is_enabled() }
}

// -----------------------------------------------------------------------------
// 16. ErrorReporting (ADMIN — Matikan Windows Error Reporting)
// -----------------------------------------------------------------------------

/// **ErrorReporting** (`Tweaks.Privacy`) — **WAJIB Administrator (UAC)**
/// - **Path**: `HKLM\SOFTWARE\Microsoft\Windows\Windows Error Reporting`
/// - **Value**: `Disabled` (`REG_DWORD`: `enable = 1`, `disable = 0`)
pub struct ErrorReporting;

impl ErrorReporting {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(HKEY_LOCAL_MACHINE, WER_PATH, WER_DISABLED_VALUE_NAME, 1)?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(HKEY_LOCAL_MACHINE, WER_PATH, WER_DISABLED_VALUE_NAME, 0)?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(HKEY_LOCAL_MACHINE, WER_PATH, WER_DISABLED_VALUE_NAME)? == Some(1))
    }
}

impl TweakController for ErrorReporting {
    const KEY: &'static str = "ErrorReporting";
    const REQUIRES_ADMIN: bool = true;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod error_reporting {
    use super::{ErrorReporting, TweakResult};
    pub fn is_available() -> bool { ErrorReporting::is_available() }
    pub fn enable() -> TweakResult { ErrorReporting::enable() }
    pub fn disable() -> TweakResult { ErrorReporting::disable() }
    pub fn is_enabled() -> TweakResult { ErrorReporting::is_enabled() }
}

// -----------------------------------------------------------------------------
// 17. AppTracking (Matikan Pelacakan Peluncuran Aplikasi di Start Menu)
// -----------------------------------------------------------------------------

/// **AppTracking** (`Tweaks.Privacy`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced`
/// - **Value**: `Start_TrackProgs` (`REG_DWORD`: `enable = 0`, `disable = 1`)
pub struct AppTracking;

impl AppTracking {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            START_TRACK_PROGS_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            START_TRACK_PROGS_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            START_TRACK_PROGS_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for AppTracking {
    const KEY: &'static str = "AppTracking";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod app_tracking {
    use super::{AppTracking, TweakResult};
    pub fn is_available() -> bool { AppTracking::is_available() }
    pub fn enable() -> TweakResult { AppTracking::enable() }
    pub fn disable() -> TweakResult { AppTracking::disable() }
    pub fn is_enabled() -> TweakResult { AppTracking::is_enabled() }
}

// -----------------------------------------------------------------------------
// 18. InkingTypingImprove (Matikan pengiriman data Inking & Typing ke Microsoft)
// -----------------------------------------------------------------------------

/// **InkingTypingImprove** (`Tweaks.Privacy`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Input\TIPC`
/// - **Value**: `Enabled` (`REG_DWORD`: `enable = 0`, `disable = 1`)
pub struct InkingTypingImprove;

impl InkingTypingImprove {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(HKEY_CURRENT_USER, TIPC_PATH, TIPC_ENABLED_VALUE_NAME, 0)?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(HKEY_CURRENT_USER, TIPC_PATH, TIPC_ENABLED_VALUE_NAME, 1)?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(HKEY_CURRENT_USER, TIPC_PATH, TIPC_ENABLED_VALUE_NAME)? == Some(0))
    }
}

impl TweakController for InkingTypingImprove {
    const KEY: &'static str = "InkingTypingImprove";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod inking_typing_improve {
    use super::{InkingTypingImprove, TweakResult};
    pub fn is_available() -> bool { InkingTypingImprove::is_available() }
    pub fn enable() -> TweakResult { InkingTypingImprove::enable() }
    pub fn disable() -> TweakResult { InkingTypingImprove::disable() }
    pub fn is_enabled() -> TweakResult { InkingTypingImprove::is_enabled() }
}

// -----------------------------------------------------------------------------
// 19. InkingTypingPersonalize (Matikan Personalisasi Kamus Inking & Typing)
// -----------------------------------------------------------------------------

/// **InkingTypingPersonalize** (`Tweaks.Privacy`) — `HKCU` (Tidak butuh Admin)
///
/// Multi-key `HKCU`:
/// - `SOFTWARE\Microsoft\InputPersonalization` -> `RestrictImplicitInkCollection` & `RestrictImplicitTextCollection` (`enable = 1`, `disable = 0`)
/// - `SOFTWARE\Microsoft\InputPersonalization\TrainedDataStore` -> `HarvestContacts` (`enable = 0`, `disable = 1`)
/// - `SOFTWARE\Microsoft\Personalization\Settings` -> `AcceptedPrivacyPolicy` (`enable = 0`, `disable = 1`)
/// - Khusus Windows 11 (`build >= 22000`):
///   `SOFTWARE\Microsoft\Windows\CurrentVersion\CPSS\Store\InkingAndTypingPersonalization` -> `Value` (`enable = 0`, `disable = 1`)
pub struct InkingTypingPersonalize;

impl InkingTypingPersonalize {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            INPUT_PERSONALIZATION_PATH,
            RESTRICT_INK_VALUE_NAME,
            1,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            INPUT_PERSONALIZATION_PATH,
            RESTRICT_TEXT_VALUE_NAME,
            1,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            TRAINED_DATA_STORE_PATH,
            HARVEST_CONTACTS_VALUE_NAME,
            0,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            PERSONALIZATION_SETTINGS_PATH,
            ACCEPTED_PRIVACY_POLICY_VALUE_NAME,
            0,
        )?;

        if is_windows_11() {
            set_dword(
                HKEY_CURRENT_USER,
                CPSS_INKING_TYPING_PATH,
                CPSS_VALUE_NAME,
                0,
            )?;
        }

        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            INPUT_PERSONALIZATION_PATH,
            RESTRICT_INK_VALUE_NAME,
            0,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            INPUT_PERSONALIZATION_PATH,
            RESTRICT_TEXT_VALUE_NAME,
            0,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            TRAINED_DATA_STORE_PATH,
            HARVEST_CONTACTS_VALUE_NAME,
            1,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            PERSONALIZATION_SETTINGS_PATH,
            ACCEPTED_PRIVACY_POLICY_VALUE_NAME,
            1,
        )?;

        if is_windows_11() {
            set_dword(
                HKEY_CURRENT_USER,
                CPSS_INKING_TYPING_PATH,
                CPSS_VALUE_NAME,
                1,
            )?;
        }

        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let restrict_ink = get_dword_opt(
            HKEY_CURRENT_USER,
            INPUT_PERSONALIZATION_PATH,
            RESTRICT_INK_VALUE_NAME,
        )? == Some(1);
        let restrict_text = get_dword_opt(
            HKEY_CURRENT_USER,
            INPUT_PERSONALIZATION_PATH,
            RESTRICT_TEXT_VALUE_NAME,
        )? == Some(1);
        let harvest_off = get_dword_opt(
            HKEY_CURRENT_USER,
            TRAINED_DATA_STORE_PATH,
            HARVEST_CONTACTS_VALUE_NAME,
        )? == Some(0);
        let policy_off = get_dword_opt(
            HKEY_CURRENT_USER,
            PERSONALIZATION_SETTINGS_PATH,
            ACCEPTED_PRIVACY_POLICY_VALUE_NAME,
        )? == Some(0);

        let win11_cpss_ok = if is_windows_11() {
            get_dword_opt(HKEY_CURRENT_USER, CPSS_INKING_TYPING_PATH, CPSS_VALUE_NAME)? == Some(0)
        } else {
            true
        };

        Ok(restrict_ink && restrict_text && harvest_off && policy_off && win11_cpss_ok)
    }
}

impl TweakController for InkingTypingPersonalize {
    const KEY: &'static str = "InkingTypingPersonalize";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod inking_typing_personalize {
    use super::{InkingTypingPersonalize, TweakResult};
    pub fn is_available() -> bool { InkingTypingPersonalize::is_available() }
    pub fn enable() -> TweakResult { InkingTypingPersonalize::enable() }
    pub fn disable() -> TweakResult { InkingTypingPersonalize::disable() }
    pub fn is_enabled() -> TweakResult { InkingTypingPersonalize::is_enabled() }
}

// -----------------------------------------------------------------------------
// 20. SpeechRecognition (Matikan Online Speech Recognition)
// -----------------------------------------------------------------------------

/// **SpeechRecognition** (`Tweaks.Privacy`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy`
/// - **Value**: `HasAccepted` (`REG_DWORD`: `enable = 0`, `disable = 1`)
pub struct SpeechRecognition;

impl SpeechRecognition {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            ONLINE_SPEECH_PRIVACY_PATH,
            HAS_ACCEPTED_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            ONLINE_SPEECH_PRIVACY_PATH,
            HAS_ACCEPTED_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            ONLINE_SPEECH_PRIVACY_PATH,
            HAS_ACCEPTED_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for SpeechRecognition {
    const KEY: &'static str = "SpeechRecognition";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod speech_recognition {
    use super::{SpeechRecognition, TweakResult};
    pub fn is_available() -> bool { SpeechRecognition::is_available() }
    pub fn enable() -> TweakResult { SpeechRecognition::enable() }
    pub fn disable() -> TweakResult { SpeechRecognition::disable() }
    pub fn is_enabled() -> TweakResult { SpeechRecognition::is_enabled() }
}

// -----------------------------------------------------------------------------
// 21. Location (ADMIN — Matikan Location Tracking & Geolocation Service `lfsvc`)
// -----------------------------------------------------------------------------

/// **Location** (`Tweaks.Privacy`) — **WAJIB Administrator (UAC)**
/// - **Path**: `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location`
/// - **Value**: `Value` (`REG_SZ`)
/// - **enable()**: Set `"Deny"` + service `"lfsvc"` `Disabled` & `stop`
/// - **disable()**: Set `"Allow"` + service `"lfsvc"` `Automatic` & `start`
/// - **is_enabled()**: `Value == "Deny"` **DAN** `lfsvc` tidak running
pub struct Location;

impl Location {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_string(
            HKEY_LOCAL_MACHINE,
            LOCATION_CONSENT_STORE_PATH,
            LOCATION_VALUE_NAME,
            "Deny",
        )?;
        services::set_start_mode(LFSVC_SERVICE_NAME, ServiceStartMode::Disabled)?;
        services::stop(LFSVC_SERVICE_NAME)?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_string(
            HKEY_LOCAL_MACHINE,
            LOCATION_CONSENT_STORE_PATH,
            LOCATION_VALUE_NAME,
            "Allow",
        )?;
        services::set_start_mode(LFSVC_SERVICE_NAME, ServiceStartMode::Automatic)?;
        services::start(LFSVC_SERVICE_NAME)?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let consent_val = get_string_opt(
            HKEY_LOCAL_MACHINE,
            LOCATION_CONSENT_STORE_PATH,
            LOCATION_VALUE_NAME,
        )?;
        let is_denied = consent_val
            .as_deref()
            .map_or(false, |v| v.eq_ignore_ascii_case("Deny"));
        let lfsvc_running = services::is_running(LFSVC_SERVICE_NAME)?;

        Ok(is_denied && !lfsvc_running)
    }
}

impl TweakController for Location {
    const KEY: &'static str = "Location";
    const REQUIRES_ADMIN: bool = true;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod location {
    use super::{Location, TweakResult};
    pub fn is_available() -> bool { Location::is_available() }
    pub fn enable() -> TweakResult { Location::enable() }
    pub fn disable() -> TweakResult { Location::disable() }
    pub fn is_enabled() -> TweakResult { Location::is_enabled() }
}

// -----------------------------------------------------------------------------
// 22. CameraOnLockscreen (ADMIN — Matikan Kamera pada Lock Screen)
// -----------------------------------------------------------------------------

/// **CameraOnLockscreen** (`Tweaks.Privacy`) — **WAJIB Administrator (UAC)**
/// - **Path**: `HKLM\SOFTWARE\Policies\Microsoft\Windows\Personalization`
/// - **Value**: `NoLockScreenCamera` (`REG_DWORD`: `enable = set 1`, `disable = hapus value`)
pub struct CameraOnLockscreen;

impl CameraOnLockscreen {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            PERSONALIZATION_POLICY_PATH,
            NO_LOCK_SCREEN_CAMERA_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        delete_reg_value(
            HKEY_LOCAL_MACHINE,
            PERSONALIZATION_POLICY_PATH,
            NO_LOCK_SCREEN_CAMERA_VALUE_NAME,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_LOCAL_MACHINE,
            PERSONALIZATION_POLICY_PATH,
            NO_LOCK_SCREEN_CAMERA_VALUE_NAME,
        )? == Some(1))
    }
}

impl TweakController for CameraOnLockscreen {
    const KEY: &'static str = "CameraOnLockscreen";
    const REQUIRES_ADMIN: bool = true;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod camera_on_lockscreen {
    use super::{CameraOnLockscreen, TweakResult};
    pub fn is_available() -> bool { CameraOnLockscreen::is_available() }
    pub fn enable() -> TweakResult { CameraOnLockscreen::enable() }
    pub fn disable() -> TweakResult { CameraOnLockscreen::disable() }
    pub fn is_enabled() -> TweakResult { CameraOnLockscreen::is_enabled() }
}

// -----------------------------------------------------------------------------
// 23. CameraIndicator (ADMIN — Tampilkan Indikator Kamera On-Screen)
// -----------------------------------------------------------------------------

/// **CameraIndicator** (`Tweaks.Privacy`) — **WAJIB Administrator (UAC)**
/// - **Path**: `HKLM\SOFTWARE\Microsoft\OEM\Device\Capture`
/// - **Value**: `NoPhysicalCameraLED` (`REG_DWORD`: `enable = 1`, `disable = 0`)
pub struct CameraIndicator;

impl CameraIndicator {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            OEM_DEVICE_CAPTURE_PATH,
            NO_PHYSICAL_CAMERA_LED_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            OEM_DEVICE_CAPTURE_PATH,
            NO_PHYSICAL_CAMERA_LED_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_LOCAL_MACHINE,
            OEM_DEVICE_CAPTURE_PATH,
            NO_PHYSICAL_CAMERA_LED_VALUE_NAME,
        )? == Some(1))
    }
}

impl TweakController for CameraIndicator {
    const KEY: &'static str = "CameraIndicator";
    const REQUIRES_ADMIN: bool = true;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod camera_indicator {
    use super::{CameraIndicator, TweakResult};
    pub fn is_available() -> bool { CameraIndicator::is_available() }
    pub fn enable() -> TweakResult { CameraIndicator::enable() }
    pub fn disable() -> TweakResult { CameraIndicator::disable() }
    pub fn is_enabled() -> TweakResult { CameraIndicator::is_enabled() }
}

// =============================================================================
// BATCH 4: Remaining Start Menu & Ads (8 Tweaks)
// =============================================================================

// -----------------------------------------------------------------------------
// 24. AccountNotifications (Matikan notifikasi akun Microsoft di Start Menu)
// -----------------------------------------------------------------------------

/// **AccountNotifications** (`Tweaks.StartMenu`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced`
/// - **Value**: `Start_AccountNotifications` (`REG_DWORD`: `enable = 0`, `disable = 1`)
/// - **is_available**: `build >= 19045`
pub struct AccountNotifications;

impl AccountNotifications {
    pub fn is_available() -> bool {
        windows_build_number().map_or(false, |b| b >= 19045)
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            START_ACCOUNT_NOTIFICATIONS_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            START_ACCOUNT_NOTIFICATIONS_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            START_ACCOUNT_NOTIFICATIONS_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for AccountNotifications {
    const KEY: &'static str = "AccountNotifications";
    const REQUIRES_ADMIN: bool = false;

    fn is_available() -> bool {
        Self::is_available()
    }

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod account_notifications {
    use super::{AccountNotifications, TweakResult};
    pub fn is_available() -> bool { AccountNotifications::is_available() }
    pub fn enable() -> TweakResult { AccountNotifications::enable() }
    pub fn disable() -> TweakResult { AccountNotifications::disable() }
    pub fn is_enabled() -> TweakResult { AccountNotifications::is_enabled() }
}

// -----------------------------------------------------------------------------
// 25. RecentItemsTracking (Matikan riwayat file terbaru di Start / Jump List)
// -----------------------------------------------------------------------------

/// **RecentItemsTracking** (`Tweaks.StartMenu`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced`
/// - **Value**: `Start_TrackDocs` (`REG_DWORD`: `enable = 0`, `disable = 1`)
pub struct RecentItemsTracking;

impl RecentItemsTracking {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            START_TRACK_DOCS_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            START_TRACK_DOCS_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            START_TRACK_DOCS_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for RecentItemsTracking {
    const KEY: &'static str = "RecentItemsTracking";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod recent_items_tracking {
    use super::{RecentItemsTracking, TweakResult};
    pub fn is_available() -> bool { RecentItemsTracking::is_available() }
    pub fn enable() -> TweakResult { RecentItemsTracking::enable() }
    pub fn disable() -> TweakResult { RecentItemsTracking::disable() }
    pub fn is_enabled() -> TweakResult { RecentItemsTracking::is_enabled() }
}

// -----------------------------------------------------------------------------
// 26. FunFacts (Matikan fun facts / tips di Lock Screen)
// -----------------------------------------------------------------------------

/// **FunFacts** (`Tweaks.Ads`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager`
/// - **Values**: `SubscribedContent-338387Enabled` DAN `RotatingLockScreenOverlayEnabled`
/// - **enable**: keduanya `0`, **disable**: keduanya `1`
/// - **is_enabled**: keduanya `== 0`
pub struct FunFacts;

impl FunFacts {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            FUN_FACTS_SUBSCRIBED_VALUE_NAME,
            0,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            ROTATING_LOCK_SCREEN_OVERLAY_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            FUN_FACTS_SUBSCRIBED_VALUE_NAME,
            1,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            ROTATING_LOCK_SCREEN_OVERLAY_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let sub_off = get_dword_opt(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            FUN_FACTS_SUBSCRIBED_VALUE_NAME,
        )? == Some(0);
        let overlay_off = get_dword_opt(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            ROTATING_LOCK_SCREEN_OVERLAY_VALUE_NAME,
        )? == Some(0);
        Ok(sub_off && overlay_off)
    }
}

impl TweakController for FunFacts {
    const KEY: &'static str = "FunFacts";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod fun_facts {
    use super::{FunFacts, TweakResult};
    pub fn is_available() -> bool { FunFacts::is_available() }
    pub fn enable() -> TweakResult { FunFacts::enable() }
    pub fn disable() -> TweakResult { FunFacts::disable() }
    pub fn is_enabled() -> TweakResult { FunFacts::is_enabled() }
}

// -----------------------------------------------------------------------------
// 27. HomeInSettings (ADMIN — Sembunyikan halaman Home di aplikasi Settings)
// -----------------------------------------------------------------------------

/// **HomeInSettings** (`Tweaks.Ads`) — **WAJIB Administrator (UAC)**
/// - **Path**: `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer`
/// - **Value**: `SettingsPageVisibility` (`REG_SZ`)
/// - **enable**: set `"hide:home"` (jika sudah ada aturan `hide:...` lain seperti `"hide:windowsupdate"`,
///   digabung menjadi `"hide:home;windowsupdate"` tanpa menimpa aturan lain).
/// - **disable**: buang `"home"` saja dari daftar; jika tidak ada aturan lain tersisa, hapus value.
/// - **is_enabled**: `value == "hide:home"` atau `"home"` terdaftar di dalam aturan `hide:...`.
/// - **is_available**: `build >= 22621`
pub struct HomeInSettings;

impl HomeInSettings {
    pub fn is_available() -> bool {
        windows_build_number().map_or(false, |b| b >= 22621)
    }

    pub fn enable() -> TweakResult {
        let current = get_string_opt(
            HKEY_LOCAL_MACHINE,
            CURRENT_VERSION_POLICIES_EXPLORER_PATH,
            SETTINGS_PAGE_VISIBILITY_VALUE_NAME,
        )?;

        let new_val = match current {
            Some(existing) => {
                let trimmed = existing.trim();
                if trimmed.len() >= 5 && trimmed[..5].eq_ignore_ascii_case("hide:") {
                    let pages: Vec<&str> = trimmed[5..]
                        .split(';')
                        .map(str::trim)
                        .filter(|s| !s.is_empty())
                        .collect();

                    if pages.iter().any(|p| p.eq_ignore_ascii_case("home")) {
                        format!("hide:{}", pages.join(";"))
                    } else if pages.is_empty() {
                        "hide:home".to_string()
                    } else {
                        format!("hide:home;{}", pages.join(";"))
                    }
                } else {
                    "hide:home".to_string()
                }
            }
            None => "hide:home".to_string(),
        };

        set_string(
            HKEY_LOCAL_MACHINE,
            CURRENT_VERSION_POLICIES_EXPLORER_PATH,
            SETTINGS_PAGE_VISIBILITY_VALUE_NAME,
            &new_val,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        let current = get_string_opt(
            HKEY_LOCAL_MACHINE,
            CURRENT_VERSION_POLICIES_EXPLORER_PATH,
            SETTINGS_PAGE_VISIBILITY_VALUE_NAME,
        )?;

        if let Some(existing) = current {
            let trimmed = existing.trim();
            if trimmed.len() >= 5 && trimmed[..5].eq_ignore_ascii_case("hide:") {
                let remaining: Vec<&str> = trimmed[5..]
                    .split(';')
                    .map(str::trim)
                    .filter(|s| !s.is_empty() && !s.eq_ignore_ascii_case("home"))
                    .collect();

                if remaining.is_empty() {
                    delete_reg_value(
                        HKEY_LOCAL_MACHINE,
                        CURRENT_VERSION_POLICIES_EXPLORER_PATH,
                        SETTINGS_PAGE_VISIBILITY_VALUE_NAME,
                    )?;
                } else {
                    let updated = format!("hide:{}", remaining.join(";"));
                    set_string(
                        HKEY_LOCAL_MACHINE,
                        CURRENT_VERSION_POLICIES_EXPLORER_PATH,
                        SETTINGS_PAGE_VISIBILITY_VALUE_NAME,
                        &updated,
                    )?;
                }
            } else {
                delete_reg_value(
                    HKEY_LOCAL_MACHINE,
                    CURRENT_VERSION_POLICIES_EXPLORER_PATH,
                    SETTINGS_PAGE_VISIBILITY_VALUE_NAME,
                )?;
            }
        }

        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let current = get_string_opt(
            HKEY_LOCAL_MACHINE,
            CURRENT_VERSION_POLICIES_EXPLORER_PATH,
            SETTINGS_PAGE_VISIBILITY_VALUE_NAME,
        )?;

        if let Some(existing) = current {
            let trimmed = existing.trim();
            if trimmed.eq_ignore_ascii_case("hide:home") {
                return Ok(true);
            }
            if trimmed.len() >= 5 && trimmed[..5].eq_ignore_ascii_case("hide:") {
                let has_home = trimmed[5..]
                    .split(';')
                    .map(str::trim)
                    .any(|p| p.eq_ignore_ascii_case("home"));
                return Ok(has_home);
            }
        }

        Ok(false)
    }
}

impl TweakController for HomeInSettings {
    const KEY: &'static str = "HomeInSettings";
    const REQUIRES_ADMIN: bool = true;

    fn is_available() -> bool {
        Self::is_available()
    }

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod home_in_settings {
    use super::{HomeInSettings, TweakResult};
    pub fn is_available() -> bool { HomeInSettings::is_available() }
    pub fn enable() -> TweakResult { HomeInSettings::enable() }
    pub fn disable() -> TweakResult { HomeInSettings::disable() }
    pub fn is_enabled() -> TweakResult { HomeInSettings::is_enabled() }
}

// -----------------------------------------------------------------------------
// 28. SuggestedNotifications (Matikan notifikasi saran dari Windows)
// -----------------------------------------------------------------------------

/// **SuggestedNotifications** (`Tweaks.Ads`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Notifications\Settings\Windows.SystemToast.Suggested`
/// - **Value**: `Enabled` (`REG_DWORD`: `enable = 0`, `disable = 1`)
pub struct SuggestedNotifications;

impl SuggestedNotifications {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            SUGGESTED_NOTIFICATIONS_PATH,
            SUGGESTED_NOTIFICATIONS_ENABLED_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            SUGGESTED_NOTIFICATIONS_PATH,
            SUGGESTED_NOTIFICATIONS_ENABLED_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            SUGGESTED_NOTIFICATIONS_PATH,
            SUGGESTED_NOTIFICATIONS_ENABLED_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for SuggestedNotifications {
    const KEY: &'static str = "SuggestedNotifications";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod suggested_notifications {
    use super::{SuggestedNotifications, TweakResult};
    pub fn is_available() -> bool { SuggestedNotifications::is_available() }
    pub fn enable() -> TweakResult { SuggestedNotifications::enable() }
    pub fn disable() -> TweakResult { SuggestedNotifications::disable() }
    pub fn is_enabled() -> TweakResult { SuggestedNotifications::is_enabled() }
}

// -----------------------------------------------------------------------------
// 29. SuggestionsInSettings (Matikan konten saran di aplikasi Settings)
// -----------------------------------------------------------------------------

/// **SuggestionsInSettings** (`Tweaks.Ads`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager`
/// - **Values**: `SubscribedContent-338393Enabled`, `SubscribedContent-353694Enabled`, `SubscribedContent-353696Enabled`
/// - **enable**: semua `0`, **disable**: semua `1`
/// - **is_enabled**: semua `== 0`
pub struct SuggestionsInSettings;

impl SuggestionsInSettings {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        for val_name in [
            SUGGESTIONS_IN_SETTINGS_338393_VALUE_NAME,
            SUGGESTIONS_IN_SETTINGS_353694_VALUE_NAME,
            SUGGESTIONS_IN_SETTINGS_353696_VALUE_NAME,
        ] {
            set_dword(
                HKEY_CURRENT_USER,
                CONTENT_DELIVERY_MANAGER_PATH,
                val_name,
                0,
            )?;
        }
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        for val_name in [
            SUGGESTIONS_IN_SETTINGS_338393_VALUE_NAME,
            SUGGESTIONS_IN_SETTINGS_353694_VALUE_NAME,
            SUGGESTIONS_IN_SETTINGS_353696_VALUE_NAME,
        ] {
            set_dword(
                HKEY_CURRENT_USER,
                CONTENT_DELIVERY_MANAGER_PATH,
                val_name,
                1,
            )?;
        }
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let v1 = get_dword_opt(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            SUGGESTIONS_IN_SETTINGS_338393_VALUE_NAME,
        )? == Some(0);
        let v2 = get_dword_opt(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            SUGGESTIONS_IN_SETTINGS_353694_VALUE_NAME,
        )? == Some(0);
        let v3 = get_dword_opt(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            SUGGESTIONS_IN_SETTINGS_353696_VALUE_NAME,
        )? == Some(0);
        Ok(v1 && v2 && v3)
    }
}

impl TweakController for SuggestionsInSettings {
    const KEY: &'static str = "SuggestionsInSettings";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod suggestions_in_settings {
    use super::{SuggestionsInSettings, TweakResult};
    pub fn is_available() -> bool { SuggestionsInSettings::is_available() }
    pub fn enable() -> TweakResult { SuggestionsInSettings::enable() }
    pub fn disable() -> TweakResult { SuggestionsInSettings::disable() }
    pub fn is_enabled() -> TweakResult { SuggestionsInSettings::is_enabled() }
}

// -----------------------------------------------------------------------------
// 30. WindowsSetup (Matikan layar "Let's finish setting up your device" / SCOOBE)
// -----------------------------------------------------------------------------

/// **WindowsSetup** (`Tweaks.Ads`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\UserProfileEngagement`
/// - **Value**: `ScoobeSystemSettingEnabled` (`REG_DWORD`: `enable = 0`, `disable = 1`)
pub struct WindowsSetup;

impl WindowsSetup {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            USER_PROFILE_ENGAGEMENT_PATH,
            SCOOBE_SETTING_ENABLED_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            USER_PROFILE_ENGAGEMENT_PATH,
            SCOOBE_SETTING_ENABLED_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            USER_PROFILE_ENGAGEMENT_PATH,
            SCOOBE_SETTING_ENABLED_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for WindowsSetup {
    const KEY: &'static str = "WindowsSetup";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod windows_setup {
    use super::{TweakResult, WindowsSetup};
    pub fn is_available() -> bool { WindowsSetup::is_available() }
    pub fn enable() -> TweakResult { WindowsSetup::enable() }
    pub fn disable() -> TweakResult { WindowsSetup::disable() }
    pub fn is_enabled() -> TweakResult { WindowsSetup::is_enabled() }
}

// -----------------------------------------------------------------------------
// 31. WindowsWelcome (Matikan Windows Welcome Experience setelah update)
// -----------------------------------------------------------------------------

/// **WindowsWelcome** (`Tweaks.Ads`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager`
/// - **Value**: `SubscribedContent-310093Enabled` (`REG_DWORD`: `enable = 0`, `disable = 1`)
pub struct WindowsWelcome;

impl WindowsWelcome {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            WINDOWS_WELCOME_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            WINDOWS_WELCOME_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            CONTENT_DELIVERY_MANAGER_PATH,
            WINDOWS_WELCOME_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for WindowsWelcome {
    const KEY: &'static str = "WindowsWelcome";
    const REQUIRES_ADMIN: bool = false;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod windows_welcome {
    use super::{TweakResult, WindowsWelcome};
    pub fn is_available() -> bool { WindowsWelcome::is_available() }
    pub fn enable() -> TweakResult { WindowsWelcome::enable() }
    pub fn disable() -> TweakResult { WindowsWelcome::disable() }
    pub fn is_enabled() -> TweakResult { WindowsWelcome::is_enabled() }
}

// =============================================================================
// BATCH 5: Desktop & File Explorer (18 Items)
// =============================================================================

// -----------------------------------------------------------------------------
// 32. AeroShake (Matikan "shake untuk minimize jendela lain")
// -----------------------------------------------------------------------------

/// **AeroShake** (`Tweaks.Desktop`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced` -> `DisallowShaking`
/// - **enable**: `1`, **disable**: hapus value
/// - **is_enabled**: `val == Some(1) || (val == None && build >= 22000)`
pub struct AeroShake;

impl AeroShake {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            DISALLOW_SHAKING_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        delete_reg_value(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            DISALLOW_SHAKING_VALUE_NAME,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let val = get_dword_opt(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            DISALLOW_SHAKING_VALUE_NAME,
        )?;
        let build = windows_build_number().unwrap_or(0);
        Ok(val == Some(1) || (val.is_none() && build >= 22000))
    }
}

impl TweakController for AeroShake {
    const KEY: &'static str = "AeroShake";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::None;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod aero_shake {
    use super::{AeroShake, TweakResult};
    pub fn is_available() -> bool { AeroShake::is_available() }
    pub fn enable() -> TweakResult { AeroShake::enable() }
    pub fn disable() -> TweakResult { AeroShake::disable() }
    pub fn is_enabled() -> TweakResult { AeroShake::is_enabled() }
}

// -----------------------------------------------------------------------------
// 33. DropShadows (Matikan bayangan label ikon desktop)
// -----------------------------------------------------------------------------

/// **DropShadows** (`Tweaks.Desktop`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced` -> `ListviewShadow`
/// - **enable**: `0`, **disable**: `1`
/// - **RESTART_HINT**: `RestartHint::SignOut`
pub struct DropShadows;

impl DropShadows {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            LISTVIEW_SHADOW_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            LISTVIEW_SHADOW_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            LISTVIEW_SHADOW_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for DropShadows {
    const KEY: &'static str = "DropShadows";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::SignOut;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod drop_shadows {
    use super::{DropShadows, TweakResult};
    pub fn is_available() -> bool { DropShadows::is_available() }
    pub fn enable() -> TweakResult { DropShadows::enable() }
    pub fn disable() -> TweakResult { DropShadows::disable() }
    pub fn is_enabled() -> TweakResult { DropShadows::is_enabled() }
}

// -----------------------------------------------------------------------------
// 34. PeekPreview (Matikan Aero Peek — Khusus Windows 10)
// -----------------------------------------------------------------------------

/// **PeekPreview** (`Tweaks.Desktop`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced` -> `DisablePreviewDesktop`
/// - **enable**: `1`, **disable**: `0`
/// - **is_available**: `build < 22000`
pub struct PeekPreview;

impl PeekPreview {
    pub fn is_available() -> bool {
        windows_build_number().map_or(false, |b| b < 22000)
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            DISABLE_PREVIEW_DESKTOP_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            DISABLE_PREVIEW_DESKTOP_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            DISABLE_PREVIEW_DESKTOP_VALUE_NAME,
        )? == Some(1))
    }
}

impl TweakController for PeekPreview {
    const KEY: &'static str = "PeekPreview";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::None;

    fn is_available() -> bool {
        Self::is_available()
    }

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod peek_preview {
    use super::{PeekPreview, TweakResult};
    pub fn is_available() -> bool { PeekPreview::is_available() }
    pub fn enable() -> TweakResult { PeekPreview::enable() }
    pub fn disable() -> TweakResult { PeekPreview::disable() }
    pub fn is_enabled() -> TweakResult { PeekPreview::is_enabled() }
}

// -----------------------------------------------------------------------------
// 35. RecycleBin (Sembunyikan ikon Recycle Bin di desktop)
// -----------------------------------------------------------------------------

/// **RecycleBin** (`Tweaks.Desktop`) — `HKCU` (Tidak butuh Admin)
/// - **Paths**: `ClassicStartMenu` & `NewStartPanel` di bawah `HideDesktopIcons`
/// - **Value**: `"{645FF040-5081-101B-9F08-00AA002F954E}"` (`enable = 1`, `disable = 0`) + `refresh_shell()`
pub struct RecycleBin;

impl RecycleBin {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            HIDE_DESKTOP_ICONS_CLASSIC_PATH,
            RECYCLE_BIN_CLSID_VALUE_NAME,
            1,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            HIDE_DESKTOP_ICONS_NEW_PATH,
            RECYCLE_BIN_CLSID_VALUE_NAME,
            1,
        )?;
        refresh_shell();
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            HIDE_DESKTOP_ICONS_CLASSIC_PATH,
            RECYCLE_BIN_CLSID_VALUE_NAME,
            0,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            HIDE_DESKTOP_ICONS_NEW_PATH,
            RECYCLE_BIN_CLSID_VALUE_NAME,
            0,
        )?;
        refresh_shell();
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let classic = get_dword_opt(
            HKEY_CURRENT_USER,
            HIDE_DESKTOP_ICONS_CLASSIC_PATH,
            RECYCLE_BIN_CLSID_VALUE_NAME,
        )? == Some(1);
        let new_panel = get_dword_opt(
            HKEY_CURRENT_USER,
            HIDE_DESKTOP_ICONS_NEW_PATH,
            RECYCLE_BIN_CLSID_VALUE_NAME,
        )? == Some(1);
        Ok(classic && new_panel)
    }
}

impl TweakController for RecycleBin {
    const KEY: &'static str = "RecycleBin";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::None;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod recycle_bin {
    use super::{RecycleBin, TweakResult};
    pub fn is_available() -> bool { RecycleBin::is_available() }
    pub fn enable() -> TweakResult { RecycleBin::enable() }
    pub fn disable() -> TweakResult { RecycleBin::disable() }
    pub fn is_enabled() -> TweakResult { RecycleBin::is_enabled() }
}

// -----------------------------------------------------------------------------
// 36. ThisPC (Tampilkan ikon This PC di desktop)
// -----------------------------------------------------------------------------

/// **ThisPC** (`Tweaks.Desktop`) — `HKCU` (Tidak butuh Admin)
/// - **Paths**: `ClassicStartMenu` & `NewStartPanel` di bawah `HideDesktopIcons`
/// - **Value**: `"{20D04FE0-3AEA-1069-A2D8-08002B30309D}"` (`enable = 0`, `disable = 1`) + `refresh_shell()`
/// - **is_enabled**: Windows 10 cukup cek `NewStartPanel == 0`; Windows 11 cek keduanya `== 0`.
pub struct ThisPC;

impl ThisPC {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            HIDE_DESKTOP_ICONS_CLASSIC_PATH,
            THIS_PC_CLSID_VALUE_NAME,
            0,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            HIDE_DESKTOP_ICONS_NEW_PATH,
            THIS_PC_CLSID_VALUE_NAME,
            0,
        )?;
        refresh_shell();
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            HIDE_DESKTOP_ICONS_CLASSIC_PATH,
            THIS_PC_CLSID_VALUE_NAME,
            1,
        )?;
        set_dword(
            HKEY_CURRENT_USER,
            HIDE_DESKTOP_ICONS_NEW_PATH,
            THIS_PC_CLSID_VALUE_NAME,
            1,
        )?;
        refresh_shell();
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let new_panel_ok = get_dword_opt(
            HKEY_CURRENT_USER,
            HIDE_DESKTOP_ICONS_NEW_PATH,
            THIS_PC_CLSID_VALUE_NAME,
        )? == Some(0);

        if is_windows_11() {
            let classic_ok = get_dword_opt(
                HKEY_CURRENT_USER,
                HIDE_DESKTOP_ICONS_CLASSIC_PATH,
                THIS_PC_CLSID_VALUE_NAME,
            )? == Some(0);
            Ok(classic_ok && new_panel_ok)
        } else {
            Ok(new_panel_ok)
        }
    }
}

impl TweakController for ThisPC {
    const KEY: &'static str = "ThisPC";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::None;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod this_pc {
    use super::{ThisPC, TweakResult};
    pub fn is_available() -> bool { ThisPC::is_available() }
    pub fn enable() -> TweakResult { ThisPC::enable() }
    pub fn disable() -> TweakResult { ThisPC::disable() }
    pub fn is_enabled() -> TweakResult { ThisPC::is_enabled() }
}

// -----------------------------------------------------------------------------
// 37. ShortcutArrow (ADMIN — Hilangkan panah di ikon shortcut)
// -----------------------------------------------------------------------------

/// **ShortcutArrow** (`Tweaks.Desktop`) — **WAJIB Administrator (UAC)**
/// - **Path**: `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons`
/// - **Value**: `"29"` (`REG_SZ`) = `"C:\\Windows\\blank.ico"`
/// - **enable**: Generate file `C:\Windows\blank.ico` (32x32 32bpp transparan) terlebih dahulu, lalu set `"29"`.
/// - **disable**: Hapus value `"29"`.
/// - **is_enabled**: Value `"29"` ada.
/// - **RESTART_HINT**: `RestartHint::RestartExplorer`
pub struct ShortcutArrow;

impl ShortcutArrow {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        let ico_bytes = generate_blank_32x32_ico();
        fs::write(BLANK_ICO_PATH, ico_bytes)?;
        set_string(
            HKEY_LOCAL_MACHINE,
            SHELL_ICONS_PATH,
            SHORTCUT_ARROW_VALUE_NAME,
            BLANK_ICO_PATH,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        delete_reg_value(
            HKEY_LOCAL_MACHINE,
            SHELL_ICONS_PATH,
            SHORTCUT_ARROW_VALUE_NAME,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_string_opt(
            HKEY_LOCAL_MACHINE,
            SHELL_ICONS_PATH,
            SHORTCUT_ARROW_VALUE_NAME,
        )?
        .is_some())
    }
}

impl TweakController for ShortcutArrow {
    const KEY: &'static str = "ShortcutArrow";
    const REQUIRES_ADMIN: bool = true;
    const RESTART_HINT: RestartHint = RestartHint::RestartExplorer;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod shortcut_arrow {
    use super::{ShortcutArrow, TweakResult};
    pub fn is_available() -> bool { ShortcutArrow::is_available() }
    pub fn enable() -> TweakResult { ShortcutArrow::enable() }
    pub fn disable() -> TweakResult { ShortcutArrow::disable() }
    pub fn is_enabled() -> TweakResult { ShortcutArrow::is_enabled() }
}

// -----------------------------------------------------------------------------
// 38. ShowDesktop (Matikan "klik pojok kanan taskbar untuk show desktop")
// -----------------------------------------------------------------------------

/// **ShowDesktop** (`Tweaks.Desktop`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced` -> `TaskbarSd`
/// - **enable**: `0`, **disable**: `1`
/// - **is_enabled**: `val == Some(0)`
/// - **is_available**: `build >= 22000`
pub struct ShowDesktop;

impl ShowDesktop {
    pub fn is_available() -> bool {
        windows_build_number().map_or(false, |b| b >= 22000)
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            TASKBAR_SD_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            TASKBAR_SD_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            TASKBAR_SD_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for ShowDesktop {
    const KEY: &'static str = "ShowDesktop";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::None;

    fn is_available() -> bool {
        Self::is_available()
    }

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod show_desktop {
    use super::{ShowDesktop, TweakResult};
    pub fn is_available() -> bool { ShowDesktop::is_available() }
    pub fn enable() -> TweakResult { ShowDesktop::enable() }
    pub fn disable() -> TweakResult { ShowDesktop::disable() }
    pub fn is_enabled() -> TweakResult { ShowDesktop::is_enabled() }
}

// -----------------------------------------------------------------------------
// 39. Widgets (ADMIN — Matikan Windows Widgets)
// -----------------------------------------------------------------------------

/// **Widgets** (`Tweaks.Desktop`) — **WAJIB Administrator (UAC)**
/// - **Path A**: `HKLM\SOFTWARE\Microsoft\PolicyManager\default\NewsAndInterests\AllowNewsAndInterests` -> `"value"`
/// - **Path B**: `HKLM\SOFTWARE\Policies\Microsoft\Dsh` -> `"AllowNewsAndInterests"`
/// - **enable**: `A = 0` dan `B = 0`
/// - **disable**: `A = 1` dan hapus `B`
/// - **is_enabled**: `!(A == Some(1) && B != Some(0))`
/// - **is_available**: `build >= 22000`
pub struct Widgets;

impl Widgets {
    pub fn is_available() -> bool {
        windows_build_number().map_or(false, |b| b >= 22000)
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            WIDGETS_POLICY_MANAGER_PATH,
            WIDGETS_POLICY_MANAGER_VALUE_NAME,
            0,
        )?;
        set_dword(
            HKEY_LOCAL_MACHINE,
            WIDGETS_DSH_POLICY_PATH,
            WIDGETS_DSH_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_LOCAL_MACHINE,
            WIDGETS_POLICY_MANAGER_PATH,
            WIDGETS_POLICY_MANAGER_VALUE_NAME,
            1,
        )?;
        delete_reg_value(
            HKEY_LOCAL_MACHINE,
            WIDGETS_DSH_POLICY_PATH,
            WIDGETS_DSH_VALUE_NAME,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let a = get_dword_opt(
            HKEY_LOCAL_MACHINE,
            WIDGETS_POLICY_MANAGER_PATH,
            WIDGETS_POLICY_MANAGER_VALUE_NAME,
        )?;
        let b = get_dword_opt(
            HKEY_LOCAL_MACHINE,
            WIDGETS_DSH_POLICY_PATH,
            WIDGETS_DSH_VALUE_NAME,
        )?;
        Ok(!(a == Some(1) && b != Some(0)))
    }
}

impl TweakController for Widgets {
    const KEY: &'static str = "Widgets";
    const REQUIRES_ADMIN: bool = true;
    const RESTART_HINT: RestartHint = RestartHint::None;

    fn is_available() -> bool {
        Self::is_available()
    }

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod widgets {
    use super::{TweakResult, Widgets};
    pub fn is_available() -> bool { Widgets::is_available() }
    pub fn enable() -> TweakResult { Widgets::enable() }
    pub fn disable() -> TweakResult { Widgets::disable() }
    pub fn is_enabled() -> TweakResult { Widgets::is_enabled() }
}

// -----------------------------------------------------------------------------
// 40. WallpaperQuality (API Terpisah — Kualitas Kompresi JPEG Wallpaper 0..=100)
// -----------------------------------------------------------------------------

/// **WallpaperQuality** (`Tweaks.Desktop`) — API terpisah (bukan boolean on/off).
/// - **Path**: `HKCU\Control Panel\Desktop` -> `JPEGImportQuality` (`REG_DWORD`)
/// - **Catatan untuk UI**: Wallpaper harus dipasang ulang supaya perubahan kualitas terlihat.
pub struct WallpaperQuality;

impl WallpaperQuality {
    /// Membaca kualitas kompresi wallpaper (`0..=100`). Jika value belum ada, mengembalikan default Windows (`85`).
    pub fn get() -> u32 {
        get_dword_opt(
            HKEY_CURRENT_USER,
            CONTROL_PANEL_DESKTOP_PATH,
            JPEG_IMPORT_QUALITY_VALUE_NAME,
        )
        .ok()
        .flatten()
        .unwrap_or(85)
    }

    /// Mengatur kualitas kompresi wallpaper (`0..=100`). Mengembalikan `Err` jika `q > 100`.
    pub fn set(q: u32) -> TweakResult {
        if !(0..=100).contains(&q) {
            return Err("JPEGImportQuality harus berada dalam rentang 0..=100".into());
        }
        set_dword(
            HKEY_CURRENT_USER,
            CONTROL_PANEL_DESKTOP_PATH,
            JPEG_IMPORT_QUALITY_VALUE_NAME,
            q,
        )?;
        Ok(true)
    }

    /// Menghapus value `JPEGImportQuality` agar kembali ke default Windows (`85`).
    pub fn reset() -> TweakResult {
        delete_reg_value(
            HKEY_CURRENT_USER,
            CONTROL_PANEL_DESKTOP_PATH,
            JPEG_IMPORT_QUALITY_VALUE_NAME,
        )?;
        Ok(true)
    }
}

// -----------------------------------------------------------------------------
// 41. Checkboxes (Tampilkan checkbox untuk memilih item di File Explorer)
// -----------------------------------------------------------------------------

/// **Checkboxes** (`Tweaks.FileExplorer`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced` -> `AutoCheckSelect`
/// - **enable**: `1`, **disable**: `0`
/// - **RESTART_HINT**: `RestartHint::ReopenExplorerWindows`
pub struct Checkboxes;

impl Checkboxes {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            AUTO_CHECK_SELECT_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            AUTO_CHECK_SELECT_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            AUTO_CHECK_SELECT_VALUE_NAME,
        )? == Some(1))
    }
}

impl TweakController for Checkboxes {
    const KEY: &'static str = "Checkboxes";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::ReopenExplorerWindows;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod checkboxes {
    use super::{Checkboxes, TweakResult};
    pub fn is_available() -> bool { Checkboxes::is_available() }
    pub fn enable() -> TweakResult { Checkboxes::enable() }
    pub fn disable() -> TweakResult { Checkboxes::disable() }
    pub fn is_enabled() -> TweakResult { Checkboxes::is_enabled() }
}

// -----------------------------------------------------------------------------
// 42. ClassicInterface (Ribbon File Explorer gaya Windows 10 di Windows 11)
// -----------------------------------------------------------------------------

/// **ClassicInterface** (`Tweaks.FileExplorer`) — `HKCU` (Tidak butuh Admin)
/// - **is_available**: `build >= 22000`
/// - **RESTART_HINT**: `RestartHint::RestartExplorer`
/// - **Catatan Penting**: Akhiran `"dll_"` pada `"C:\Windows\System32\Windows.UI.FileExplorer.dll_"`
///   adalah disengaja agar COM gagal memuat XAML Island Windows 11 dan jatuh ke UI Ribbon klasik.
pub struct ClassicInterface;

impl ClassicInterface {
    /// Menghasilkan array 568 byte `ITBar7Layout` standar untuk Classic Explorer Ribbon.
    fn expected_itbar7_layout() -> Vec<u8> {
        let mut v = vec![0u8; 568];
        v[0] = 19;
        v[12] = 32;
        v[16] = 16;
        v[18] = 1;
        v[24] = 1;
        v[28] = 1;
        v[29] = 7;
        v[32] = 94;
        v[33] = 1;
        v
    }

    pub fn is_available() -> bool {
        windows_build_number().map_or(false, |b| b >= 22000)
    }

    pub fn enable() -> TweakResult {
        // 1. CLSID {2aa9162e-c906-4dd9-ad0b-3d24a8eef5a0}
        set_string(
            HKEY_CURRENT_USER,
            CLASSIC_INTERFACE_CLSID_1_PATH,
            "",
            "CLSID_ItemsViewAdapter",
        )?;
        set_string(
            HKEY_CURRENT_USER,
            CLASSIC_INTERFACE_CLSID_1_INPROC_PATH,
            "",
            CLASSIC_INTERFACE_DLL_DUMMY_PATH,
        )?;
        set_string(
            HKEY_CURRENT_USER,
            CLASSIC_INTERFACE_CLSID_1_INPROC_PATH,
            "ThreadingModel",
            "Apartment",
        )?;

        // 2. CLSID {6480100b-5a83-4d1e-9f69-8ae5a88e9a33}
        set_string(
            HKEY_CURRENT_USER,
            CLASSIC_INTERFACE_CLSID_2_PATH,
            "",
            "File Explorer Xaml Island View Adapter",
        )?;
        set_string(
            HKEY_CURRENT_USER,
            CLASSIC_INTERFACE_CLSID_2_INPROC_PATH,
            "",
            CLASSIC_INTERFACE_DLL_DUMMY_PATH,
        )?;
        set_string(
            HKEY_CURRENT_USER,
            CLASSIC_INTERFACE_CLSID_2_INPROC_PATH,
            "ThreadingModel",
            "Apartment",
        )?;

        // 3. ITBar7Layout (REG_BINARY, 568 bytes)
        let layout = Self::expected_itbar7_layout();
        set_binary(
            HKEY_CURRENT_USER,
            IE_SHELL_BROWSER_TOOLBAR_PATH,
            ITBAR7_LAYOUT_VALUE_NAME,
            &layout,
        )?;

        Ok(true)
    }

    pub fn disable() -> TweakResult {
        delete_subkey_tree(HKEY_CURRENT_USER, CLASSIC_INTERFACE_CLSID_1_PATH)?;
        delete_subkey_tree(HKEY_CURRENT_USER, CLASSIC_INTERFACE_CLSID_2_PATH)?;
        delete_reg_value(
            HKEY_CURRENT_USER,
            IE_SHELL_BROWSER_TOOLBAR_PATH,
            ITBAR7_LAYOUT_VALUE_NAME,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let c1_default = get_string_opt(HKEY_CURRENT_USER, CLASSIC_INTERFACE_CLSID_1_PATH, "")?;
        let c1_inproc =
            get_string_opt(HKEY_CURRENT_USER, CLASSIC_INTERFACE_CLSID_1_INPROC_PATH, "")?;
        let c1_threading = get_string_opt(
            HKEY_CURRENT_USER,
            CLASSIC_INTERFACE_CLSID_1_INPROC_PATH,
            "ThreadingModel",
        )?;

        let c2_default = get_string_opt(HKEY_CURRENT_USER, CLASSIC_INTERFACE_CLSID_2_PATH, "")?;
        let c2_inproc =
            get_string_opt(HKEY_CURRENT_USER, CLASSIC_INTERFACE_CLSID_2_INPROC_PATH, "")?;
        let c2_threading = get_string_opt(
            HKEY_CURRENT_USER,
            CLASSIC_INTERFACE_CLSID_2_INPROC_PATH,
            "ThreadingModel",
        )?;

        let layout = get_binary_opt(
            HKEY_CURRENT_USER,
            IE_SHELL_BROWSER_TOOLBAR_PATH,
            ITBAR7_LAYOUT_VALUE_NAME,
        )?;

        let strings_ok = c1_default.as_deref() == Some("CLSID_ItemsViewAdapter")
            && c1_inproc.as_deref() == Some(CLASSIC_INTERFACE_DLL_DUMMY_PATH)
            && c1_threading.as_deref() == Some("Apartment")
            && c2_default.as_deref() == Some("File Explorer Xaml Island View Adapter")
            && c2_inproc.as_deref() == Some(CLASSIC_INTERFACE_DLL_DUMMY_PATH)
            && c2_threading.as_deref() == Some("Apartment");

        let expected_layout = Self::expected_itbar7_layout();
        let layout_ok = layout.as_deref() == Some(expected_layout.as_slice());

        Ok(strings_ok && layout_ok)
    }
}

impl TweakController for ClassicInterface {
    const KEY: &'static str = "ClassicInterface";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::RestartExplorer;

    fn is_available() -> bool {
        Self::is_available()
    }

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod classic_interface {
    use super::{ClassicInterface, TweakResult};
    pub fn is_available() -> bool { ClassicInterface::is_available() }
    pub fn enable() -> TweakResult { ClassicInterface::enable() }
    pub fn disable() -> TweakResult { ClassicInterface::disable() }
    pub fn is_enabled() -> TweakResult { ClassicInterface::is_enabled() }
}

// -----------------------------------------------------------------------------
// 43. NavigationPaneGallery (Sembunyikan Gallery di panel kiri File Explorer)
// -----------------------------------------------------------------------------

/// **NavigationPaneGallery** (`Tweaks.FileExplorer`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Classes\CLSID\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}` -> `System.IsPinnedToNameSpaceTree`
/// - **enable**: `0`, **disable**: `1`
/// - **is_available**: `build >= 22621`
/// - **RESTART_HINT**: `RestartHint::ReopenExplorerWindows`
pub struct NavigationPaneGallery;

impl NavigationPaneGallery {
    pub fn is_available() -> bool {
        windows_build_number().map_or(false, |b| b >= 22621)
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            NAV_PANE_GALLERY_CLSID_PATH,
            IS_PINNED_TO_NAMESPACE_TREE_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            NAV_PANE_GALLERY_CLSID_PATH,
            IS_PINNED_TO_NAMESPACE_TREE_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            NAV_PANE_GALLERY_CLSID_PATH,
            IS_PINNED_TO_NAMESPACE_TREE_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for NavigationPaneGallery {
    const KEY: &'static str = "NavigationPaneGallery";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::ReopenExplorerWindows;

    fn is_available() -> bool {
        Self::is_available()
    }

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod navigation_pane_gallery {
    use super::{NavigationPaneGallery, TweakResult};
    pub fn is_available() -> bool { NavigationPaneGallery::is_available() }
    pub fn enable() -> TweakResult { NavigationPaneGallery::enable() }
    pub fn disable() -> TweakResult { NavigationPaneGallery::disable() }
    pub fn is_enabled() -> TweakResult { NavigationPaneGallery::is_enabled() }
}

// -----------------------------------------------------------------------------
// 44. NavigationPaneHome (Sembunyikan Home di panel kiri File Explorer)
// -----------------------------------------------------------------------------

/// **NavigationPaneHome** (`Tweaks.FileExplorer`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Classes\CLSID\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}` -> `System.IsPinnedToNameSpaceTree`
/// - **enable**: `0`, **disable**: `1`
/// - **is_available**: `build >= 22621`
/// - **RESTART_HINT**: `RestartHint::ReopenExplorerWindows`
pub struct NavigationPaneHome;

impl NavigationPaneHome {
    pub fn is_available() -> bool {
        windows_build_number().map_or(false, |b| b >= 22621)
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            NAV_PANE_HOME_CLSID_PATH,
            IS_PINNED_TO_NAMESPACE_TREE_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            NAV_PANE_HOME_CLSID_PATH,
            IS_PINNED_TO_NAMESPACE_TREE_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            NAV_PANE_HOME_CLSID_PATH,
            IS_PINNED_TO_NAMESPACE_TREE_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for NavigationPaneHome {
    const KEY: &'static str = "NavigationPaneHome";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::ReopenExplorerWindows;

    fn is_available() -> bool {
        Self::is_available()
    }

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod navigation_pane_home {
    use super::{NavigationPaneHome, TweakResult};
    pub fn is_available() -> bool { NavigationPaneHome::is_available() }
    pub fn enable() -> TweakResult { NavigationPaneHome::enable() }
    pub fn disable() -> TweakResult { NavigationPaneHome::disable() }
    pub fn is_enabled() -> TweakResult { NavigationPaneHome::is_enabled() }
}

// -----------------------------------------------------------------------------
// 45. NavigationPaneRecycleBin (Tampilkan Recycle Bin di panel kiri File Explorer)
// -----------------------------------------------------------------------------

/// **NavigationPaneRecycleBin** (`Tweaks.FileExplorer`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Classes\CLSID\{645FF040-5081-101B-9F08-00AA002F954E}` -> `System.IsPinnedToNameSpaceTree`
/// - **enable**: `1`, **disable**: `0`
/// - **RESTART_HINT**: `RestartHint::ReopenExplorerWindows`
pub struct NavigationPaneRecycleBin;

impl NavigationPaneRecycleBin {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            NAV_PANE_RECYCLE_BIN_CLSID_PATH,
            IS_PINNED_TO_NAMESPACE_TREE_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            NAV_PANE_RECYCLE_BIN_CLSID_PATH,
            IS_PINNED_TO_NAMESPACE_TREE_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            NAV_PANE_RECYCLE_BIN_CLSID_PATH,
            IS_PINNED_TO_NAMESPACE_TREE_VALUE_NAME,
        )? == Some(1))
    }
}

impl TweakController for NavigationPaneRecycleBin {
    const KEY: &'static str = "NavigationPaneRecycleBin";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::ReopenExplorerWindows;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod navigation_pane_recycle_bin {
    use super::{NavigationPaneRecycleBin, TweakResult};
    pub fn is_available() -> bool { NavigationPaneRecycleBin::is_available() }
    pub fn enable() -> TweakResult { NavigationPaneRecycleBin::enable() }
    pub fn disable() -> TweakResult { NavigationPaneRecycleBin::disable() }
    pub fn is_enabled() -> TweakResult { NavigationPaneRecycleBin::is_enabled() }
}

// -----------------------------------------------------------------------------
// 46. OpenTo (API Terpisah — Halaman Tujuan Saat Membuka File Explorer)
// -----------------------------------------------------------------------------

/// Pilihan halaman awal saat membuka File Explorer (`LaunchTo`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExplorerOpenTo {
    ThisPC = 1,
    Home = 2,
    Downloads = 3,
}

/// **OpenTo** (`Tweaks.FileExplorer`) — API terpisah (bukan boolean on/off).
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced` -> `LaunchTo`
pub struct OpenTo;

impl OpenTo {
    /// Membaca halaman tujuan File Explorer saat ini. Jika value belum ada atau tidak dikenal,
    /// mengembalikan `ExplorerOpenTo::Home`.
    pub fn get() -> ExplorerOpenTo {
        match get_dword_opt(HKEY_CURRENT_USER, EXPLORER_ADVANCED_PATH, LAUNCH_TO_VALUE_NAME)
            .ok()
            .flatten()
        {
            Some(1) => ExplorerOpenTo::ThisPC,
            Some(2) => ExplorerOpenTo::Home,
            Some(3) => ExplorerOpenTo::Downloads,
            _ => ExplorerOpenTo::Home,
        }
    }

    /// Mengatur halaman tujuan saat membuka File Explorer (`ThisPC = 1`, `Home = 2`, `Downloads = 3`).
    pub fn set(target: ExplorerOpenTo) -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            LAUNCH_TO_VALUE_NAME,
            target as u32,
        )?;
        Ok(true)
    }
}

// -----------------------------------------------------------------------------
// 47. PreviewPane (Tampilkan Details Pane secara default di File Explorer)
// -----------------------------------------------------------------------------

/// **PreviewPane** (`Tweaks.FileExplorer`) — `HKCU` (Tidak butuh Admin)
/// - **Path 1**: `HKCU\...\Explorer\Modules\GlobalSettings\DetailsContainer` -> `DetailsContainer` (`REG_BINARY`)
///   - `enable`: `[2, 0, 0, 0, 1, 0, 0, 0]`
///   - `disable`: `[2, 0, 0, 0, 2, 0, 0, 0]`
/// - **Path 2**: `HKCU\...\Explorer\Modules\GlobalSettings\Sizer` -> `DetailsContainerSizer` (`REG_BINARY`)
///   - `enable`: `[59, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 181, 3, 0, 0]`
///   - `disable`: `[59, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 181, 3, 0, 0]`
/// - **RESTART_HINT**: `RestartHint::ReopenExplorerWindows`
pub struct PreviewPane;

impl PreviewPane {
    pub const CONTAINER_ENABLE: [u8; 8] = [2, 0, 0, 0, 1, 0, 0, 0];
    pub const CONTAINER_DISABLE: [u8; 8] = [2, 0, 0, 0, 2, 0, 0, 0];

    pub const SIZER_ENABLE: [u8; 16] = [59, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 181, 3, 0, 0];
    pub const SIZER_DISABLE: [u8; 16] = [59, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 181, 3, 0, 0];

    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_binary(
            HKEY_CURRENT_USER,
            DETAILS_CONTAINER_PATH,
            DETAILS_CONTAINER_VALUE_NAME,
            &Self::CONTAINER_ENABLE,
        )?;
        set_binary(
            HKEY_CURRENT_USER,
            DETAILS_CONTAINER_SIZER_PATH,
            DETAILS_CONTAINER_SIZER_VALUE_NAME,
            &Self::SIZER_ENABLE,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_binary(
            HKEY_CURRENT_USER,
            DETAILS_CONTAINER_PATH,
            DETAILS_CONTAINER_VALUE_NAME,
            &Self::CONTAINER_DISABLE,
        )?;
        set_binary(
            HKEY_CURRENT_USER,
            DETAILS_CONTAINER_SIZER_PATH,
            DETAILS_CONTAINER_SIZER_VALUE_NAME,
            &Self::SIZER_DISABLE,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        let container = get_binary_opt(
            HKEY_CURRENT_USER,
            DETAILS_CONTAINER_PATH,
            DETAILS_CONTAINER_VALUE_NAME,
        )?;
        let sizer = get_binary_opt(
            HKEY_CURRENT_USER,
            DETAILS_CONTAINER_SIZER_PATH,
            DETAILS_CONTAINER_SIZER_VALUE_NAME,
        )?;

        Ok(container.as_deref() == Some(Self::CONTAINER_ENABLE.as_slice())
            && sizer.as_deref() == Some(Self::SIZER_ENABLE.as_slice()))
    }
}

impl TweakController for PreviewPane {
    const KEY: &'static str = "PreviewPane";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::ReopenExplorerWindows;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod preview_pane {
    use super::{PreviewPane, TweakResult};
    pub fn is_available() -> bool { PreviewPane::is_available() }
    pub fn enable() -> TweakResult { PreviewPane::enable() }
    pub fn disable() -> TweakResult { PreviewPane::disable() }
    pub fn is_enabled() -> TweakResult { PreviewPane::is_enabled() }
}

// -----------------------------------------------------------------------------
// 48. ShowFilesAfterExtraction (Jangan buka folder otomatis setelah extract ZIP)
// -----------------------------------------------------------------------------

/// **ShowFilesAfterExtraction** (`Tweaks.FileExplorer`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\ExtractionWizard` -> `ShowFiles`
/// - **enable**: `0`, **disable**: `1`
pub struct ShowFilesAfterExtraction;

impl ShowFilesAfterExtraction {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXTRACTION_WIZARD_PATH,
            EXTRACTION_SHOW_FILES_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXTRACTION_WIZARD_PATH,
            EXTRACTION_SHOW_FILES_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            EXTRACTION_WIZARD_PATH,
            EXTRACTION_SHOW_FILES_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for ShowFilesAfterExtraction {
    const KEY: &'static str = "ShowFilesAfterExtraction";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::None;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod show_files_after_extraction {
    use super::{ShowFilesAfterExtraction, TweakResult};
    pub fn is_available() -> bool { ShowFilesAfterExtraction::is_available() }
    pub fn enable() -> TweakResult { ShowFilesAfterExtraction::enable() }
    pub fn disable() -> TweakResult { ShowFilesAfterExtraction::disable() }
    pub fn is_enabled() -> TweakResult { ShowFilesAfterExtraction::is_enabled() }
}

// -----------------------------------------------------------------------------
// 49. SyncProviderNotifications (Matikan iklan/notifikasi OneDrive di File Explorer)
// -----------------------------------------------------------------------------

/// **SyncProviderNotifications** (`Tweaks.FileExplorer`) — `HKCU` (Tidak butuh Admin)
/// - **Path**: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced` -> `ShowSyncProviderNotifications`
/// - **enable**: `0`, **disable**: `1`
pub struct SyncProviderNotifications;

impl SyncProviderNotifications {
    pub fn is_available() -> bool {
        <Self as TweakController>::is_available()
    }

    pub fn enable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            SHOW_SYNC_PROVIDER_NOTIFICATIONS_VALUE_NAME,
            0,
        )?;
        Ok(true)
    }

    pub fn disable() -> TweakResult {
        set_dword(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            SHOW_SYNC_PROVIDER_NOTIFICATIONS_VALUE_NAME,
            1,
        )?;
        Ok(true)
    }

    pub fn is_enabled() -> TweakResult {
        Ok(get_dword_opt(
            HKEY_CURRENT_USER,
            EXPLORER_ADVANCED_PATH,
            SHOW_SYNC_PROVIDER_NOTIFICATIONS_VALUE_NAME,
        )? == Some(0))
    }
}

impl TweakController for SyncProviderNotifications {
    const KEY: &'static str = "SyncProviderNotifications";
    const REQUIRES_ADMIN: bool = false;
    const RESTART_HINT: RestartHint = RestartHint::None;

    fn enable() -> TweakResult { Self::enable() }
    fn disable() -> TweakResult { Self::disable() }
    fn is_enabled() -> TweakResult { Self::is_enabled() }
}

pub mod sync_provider_notifications {
    use super::{SyncProviderNotifications, TweakResult};
    pub fn is_available() -> bool { SyncProviderNotifications::is_available() }
    pub fn enable() -> TweakResult { SyncProviderNotifications::enable() }
    pub fn disable() -> TweakResult { SyncProviderNotifications::disable() }
    pub fn is_enabled() -> TweakResult { SyncProviderNotifications::is_enabled() }
}


