pub mod cleaner;

use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::time::Duration;
use sysinfo::{Components, Disks, Networks, System};
use tauri::{Emitter, Manager};

use cleaner::{
    cancel_scan, clean_junk, clear_dir, format_size, open_cleaner_audit_log, run_silent_clean,
    scan_junk, ScanCancelFlag,
};

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::CloseHandle;
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::ProcessStatus::EmptyWorkingSet;
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::ProcessStatus::EnumProcesses;
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Threading::{
    OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_SET_QUOTA,
};
use winreg::enums::*;
use winreg::RegKey;
use winreg::RegValue;

pub const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn win_cmd(program: &str) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

static DISK_READ_BYTES: AtomicU64 = AtomicU64::new(0);
static DISK_WRITE_BYTES: AtomicU64 = AtomicU64::new(0);
static TYPEPERF_CHILD_PID: AtomicU32 = AtomicU32::new(0);

#[derive(Clone, Serialize, Debug)]
pub struct DiskInfo {
    pub name: String,
    pub used: f64,
    pub total: f64,
    pub disk_type: String,
    pub model: String,
}

#[derive(Clone, Serialize, Debug)]
pub struct SystemMetrics {
    pub cpu_usage: f32,
    pub cpu_temp: f32,
    pub cpu_name: String,
    pub cpu_cores: Vec<f32>,
    pub ram_usage: f32,
    pub total_ram: f64,
    pub used_ram: f64,
    pub disks: Vec<DiskInfo>,
    pub network_up: f64,
    pub network_down: f64,
    pub disk_read_speed: f64,
    pub disk_write_speed: f64,
    pub uptime: u64,
    pub process_count: u64,
}

fn get_disk_details() -> std::collections::HashMap<String, (String, String)> {
    let mut map = std::collections::HashMap::new();

    let part_output = win_cmd("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-Partition | Where-Object DriveLetter | Select-Object DriveLetter, DiskNumber | ConvertTo-Json"
        ])
        .output();

    let phys_output = win_cmd("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-PhysicalDisk | Select-Object DeviceId, Model, MediaType | ConvertTo-Json",
        ])
        .output();

    let mut parts: Vec<serde_json::Value> = Vec::new();
    if let Ok(out) = part_output {
        let s = String::from_utf8_lossy(&out.stdout);
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            if trimmed.starts_with('{') {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&format!("[{}]", trimmed))
                {
                    if let Some(arr) = v.as_array() {
                        parts = arr.clone();
                    }
                }
            } else if trimmed.starts_with('[') {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed) {
                    if let Some(arr) = v.as_array() {
                        parts = arr.clone();
                    }
                }
            }
        }
    }

    let mut disks: HashMap<String, (String, String)> = HashMap::new();
    if let Ok(out) = phys_output {
        let s = String::from_utf8_lossy(&out.stdout);
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            let mut arr_val = Vec::new();
            if trimmed.starts_with('{') {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&format!("[{}]", trimmed))
                {
                    if let Some(arr) = v.as_array() {
                        arr_val = arr.clone();
                    }
                }
            } else if trimmed.starts_with('[') {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed) {
                    if let Some(arr) = v.as_array() {
                        arr_val = arr.clone();
                    }
                }
            }

            for d in arr_val {
                let id = d["DeviceId"].to_string().replace('"', "");
                let model = d["Model"].as_str().unwrap_or("Unknown Drive").to_string();
                let mtype_code = d["MediaType"].as_i64().unwrap_or(0);
                let mtype = match mtype_code {
                    4 => "SSD".to_string(),
                    3 => "HDD".to_string(),
                    5 => "SCM".to_string(),
                    _ => {
                        let t_str = d["MediaType"].as_str().unwrap_or("");
                        if t_str.to_lowercase().contains("ssd") {
                            "SSD".to_string()
                        } else if t_str.to_lowercase().contains("hdd") {
                            "HDD".to_string()
                        } else {
                            "SSD".to_string()
                        }
                    }
                };
                disks.insert(id, (model, mtype));
            }
        }
    }

    for p in parts {
        let letter = p["DriveLetter"].as_str().unwrap_or("").to_string();
        if letter.is_empty() {
            continue;
        }
        let disk_num = p["DiskNumber"].to_string().replace('"', "");

        let (model, mtype) = if let Some(found) = disks.get(&disk_num) {
            found.clone()
        } else {
            ("Local Disk".to_string(), "SSD".to_string())
        };

        map.insert(letter.to_uppercase(), (model, mtype));
    }

    map
}

#[tauri::command]
fn is_admin() -> bool {
    is_elevated::is_elevated()
}

#[tauri::command]
fn flush_dns() -> Result<String, String> {
    let output = win_cmd("ipconfig")
        .arg("/flushdns")
        .output()
        .map_err(|e| format!("Failed to run ipconfig /flushdns: {}", e))?;

    if output.status.success() {
        Ok("DNS cache flushed successfully".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[derive(Clone, Serialize)]
struct PrivacyCategoryInfo {
    found: bool,
    desc: String,
    count: usize,
}

#[derive(Clone, Serialize)]
struct PrivacyScanResult {
    chrome_hist: PrivacyCategoryInfo,
    edge_hist: PrivacyCategoryInfo,
    recent_files: PrivacyCategoryInfo,
    clipboard: PrivacyCategoryInfo,
    search_hist: PrivacyCategoryInfo,
    wifi_pass: PrivacyCategoryInfo,
    cookies: PrivacyCategoryInfo,
    run_hist: PrivacyCategoryInfo,
}

pub fn get_wifi_profiles_count() -> usize {
    let path = Path::new("C:\\ProgramData\\Microsoft\\WlanSvc\\Profiles\\Interfaces");
    if !path.exists() {
        return 0;
    }
    let mut count = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                if let Ok(files) = fs::read_dir(entry.path()) {
                    for f in files.flatten() {
                        if f.path().is_file() {
                            count += 1;
                        }
                    }
                }
            }
        }
    }
    count
}

pub fn get_recent_files_count() -> usize {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let mut count = 0;
    if let Ok(key) =
        hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs")
    {
        count = key.enum_values().count();
    }
    if let Some(app_data) = std::env::var_os("APPDATA") {
        let recent_dir = PathBuf::from(app_data).join("Microsoft\\Windows\\Recent");
        if let Ok(entries) = fs::read_dir(recent_dir) {
            count += entries.count();
        }
    }
    count
}

pub fn get_run_mru_count() -> usize {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) =
        hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RunMRU")
    {
        key.enum_values().count()
    } else {
        0
    }
}

pub fn get_search_history_count() -> usize {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) =
        hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Search\\RecentSearches")
    {
        key.enum_keys().count()
    } else {
        0
    }
}

#[tauri::command]
async fn scan_privacy() -> Result<PrivacyScanResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let local_app_data = std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_default();

        let chrome_hist_path = local_app_data.join("Google\\Chrome\\User Data\\Default\\History");
        let chrome_found = chrome_hist_path.exists();
        let chrome_count = if chrome_found {
            fs::metadata(&chrome_hist_path).map(|m| (m.len() / 1024) as usize).unwrap_or(1)
        } else {
            0
        };

        let edge_hist_path = local_app_data.join("Microsoft\\Edge\\User Data\\Default\\History");
        let edge_found = edge_hist_path.exists();
        let edge_count = if edge_found {
            fs::metadata(&edge_hist_path).map(|m| (m.len() / 1024) as usize).unwrap_or(1)
        } else {
            0
        };

        let chrome_cookies_path = local_app_data.join("Google\\Chrome\\User Data\\Default\\Network\\Cookies");
        let edge_cookies_path = local_app_data.join("Microsoft\\Edge\\User Data\\Default\\Network\\Cookies");
        let cookies_found = chrome_cookies_path.exists() || edge_cookies_path.exists();
        let mut cookies_count = 0;
        if chrome_cookies_path.exists() {
            cookies_count += fs::metadata(&chrome_cookies_path).map(|m| (m.len() / 512) as usize).unwrap_or(0);
        }
        if edge_cookies_path.exists() {
            cookies_count += fs::metadata(&edge_cookies_path).map(|m| (m.len() / 512) as usize).unwrap_or(0);
        }

        let wifi_count = get_wifi_profiles_count();
        let recent_count = get_recent_files_count();
        let run_count = get_run_mru_count();
        let search_count = get_search_history_count();

        Ok(PrivacyScanResult {
            chrome_hist: PrivacyCategoryInfo {
                found: chrome_found,
                desc: if chrome_found { format!("Chrome history file detected (~{} KB)", chrome_count) } else { "No history detected".into() },
                count: chrome_count,
            },
            edge_hist: PrivacyCategoryInfo {
                found: edge_found,
                desc: if edge_found { format!("Edge history file detected (~{} KB)", edge_count) } else { "No history detected".into() },
                count: edge_count,
            },
            recent_files: PrivacyCategoryInfo {
                found: recent_count > 0,
                desc: if recent_count > 0 { format!("{} recent file entries found", recent_count) } else { "No recent files".into() },
                count: recent_count,
            },
            clipboard: PrivacyCategoryInfo {
                found: true,
                desc: "Active clipboard buffer".into(),
                count: 1,
            },
            search_hist: PrivacyCategoryInfo {
                found: search_count > 0,
                desc: if search_count > 0 { format!("{} search history queries found", search_count) } else { "No search history".into() },
                count: search_count,
            },
            wifi_pass: PrivacyCategoryInfo {
                found: wifi_count > 0,
                desc: if wifi_count > 0 { format!("{} Wi-Fi network profiles stored", wifi_count) } else { "No Wi-Fi profiles".into() },
                count: wifi_count,
            },
            cookies: PrivacyCategoryInfo {
                found: cookies_found,
                desc: if cookies_found { format!("Browser cookie vaults found (~{} cookies)", cookies_count) } else { "No cookies detected".into() },
                count: cookies_count,
            },
            run_hist: PrivacyCategoryInfo {
                found: run_count > 0,
                desc: if run_count > 0 { format!("{} Run MRU dialog commands stored", run_count) } else { "No run commands stored".into() },
                count: run_count,
            },
        })
    })
    .await
    .map_err(|e| format!("Privacy scan thread error: {}", e))?
}

#[tauri::command]
async fn sweep_privacy(items: Vec<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let local_app_data = std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_default();

        let mut success_msgs = Vec::new();
        let mut fail_msgs = Vec::new();

        for item in items {
            match item.as_str() {
                "recent_files" => {
                    let r1 = hkcu.delete_subkey_all(
                        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs",
                    );
                    let mut r2_ok = true;
                    if let Some(app_data) = std::env::var_os("APPDATA") {
                        let recent_dir = PathBuf::from(app_data).join("Microsoft\\Windows\\Recent");
                        if let Err(e) = clear_dir(&recent_dir, false) {
                            r2_ok = false;
                            eprintln!("Failed to clear recent dir: {}", e);
                        }
                    }
                    if r1.is_ok() || r2_ok {
                        success_msgs.push("Recent files cleared.");
                    } else {
                        fail_msgs.push("Failed to clear recent files.");
                    }
                }
                "run_hist" => {
                    if hkcu.delete_subkey_all(
                        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RunMRU",
                    ).is_ok() {
                        success_msgs.push("Run history cleared.");
                    } else {
                        fail_msgs.push("Failed to clear Run history.");
                    }
                }
                "search_hist" => {
                    if hkcu.delete_subkey_all(
                        "Software\\Microsoft\\Windows\\CurrentVersion\\Search\\RecentSearches",
                    ).is_ok() {
                        success_msgs.push("Windows search history cleared.");
                    } else {
                        fail_msgs.push("Failed to clear search history.");
                    }
                }
                "clipboard" => {
                    let output = win_cmd("powershell")
                        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", "Clear-Clipboard"])
                        .output();
                    match output {
                        Ok(out) if out.status.success() => {
                            success_msgs.push("Clipboard cleared successfully.");
                        }
                        _ => {
                            fail_msgs.push("Failed to clear clipboard.");
                        }
                    }
                }
                "wifi_pass" => {
                    let output = win_cmd("netsh")
                        .args(["wlan", "delete", "profile", "name=*"])
                        .output();
                    match output {
                        Ok(out) if out.status.success() => {
                            success_msgs.push("Wi-Fi profiles cleared.");
                        }
                        _ => {
                            fail_msgs.push("Failed to clear Wi-Fi profiles.");
                        }
                    }
                }
                "chrome_hist" => {
                    let chrome_hist_path = local_app_data.join("Google\\Chrome\\User Data\\Default\\History");
                    if chrome_hist_path.exists() {
                        if fs::remove_file(&chrome_hist_path).is_ok() {
                            success_msgs.push("Chrome history cleared.");
                        } else {
                            fail_msgs.push("Could not clear Chrome history. Close Chrome first.");
                        }
                    } else {
                        success_msgs.push("Chrome history is clean.");
                    }
                }
                "edge_hist" => {
                    let edge_hist_path = local_app_data.join("Microsoft\\Edge\\User Data\\Default\\History");
                    if edge_hist_path.exists() {
                        if fs::remove_file(&edge_hist_path).is_ok() {
                            success_msgs.push("Edge history cleared.");
                        } else {
                            fail_msgs.push("Could not clear Edge history. Close Edge first.");
                        }
                    } else {
                        success_msgs.push("Edge history is clean.");
                    }
                }
                "cookies" => {
                    let chrome_cookies = local_app_data.join("Google\\Chrome\\User Data\\Default\\Network\\Cookies");
                    let edge_cookies = local_app_data.join("Microsoft\\Edge\\User Data\\Default\\Network\\Cookies");

                    let mut c_ok = true;
                    let mut e_ok = true;

                    if chrome_cookies.exists() && fs::remove_file(&chrome_cookies).is_err() {
                        c_ok = false;
                    }
                    if edge_cookies.exists() && fs::remove_file(&edge_cookies).is_err() {
                        e_ok = false;
                    }

                    if c_ok && e_ok {
                        success_msgs.push("Cookies cleared.");
                    } else {
                        fail_msgs.push("Some browser cookies could not be cleared. Close browsers and retry.");
                    }
                }
                _ => {}
            }
        }

        if fail_msgs.is_empty() {
            Ok(format!("Privacy sweep completed: {}", success_msgs.join(" ")))
        } else if !success_msgs.is_empty() {
            Ok(format!("Partially completed. Succeeded: {}. Failed: {}", success_msgs.join(" "), fail_msgs.join(" ")))
        } else {
            Err(format!("Sweep failed: {}", fail_msgs.join(" ")))
        }
    })
    .await
    .map_err(|e| format!("Sweep thread error: {}", e))?
}

#[derive(Clone, Serialize, Debug)]
pub struct StartupItem {
    pub name: String,
    pub command: String,
    pub enabled: bool,
    pub registry_path: String,
    pub is_hkcu: bool,
    pub publisher: String,
    pub impact: String,
    pub delay: f64,
}

fn estimate_startup_impact(path: &str, is_enabled: bool) -> (&'static str, f64) {
    if !is_enabled {
        return ("None", 0.0);
    }
    let lower = path.to_lowercase();
    if lower.contains("discord") || lower.contains("steam") || lower.contains("teams") || lower.contains("slack") {
        ("High", 2.5)
    } else if lower.contains("spotify") || lower.contains("epic") || lower.contains("onedrive") {
        ("Medium", 1.2)
    } else {
        ("Low", 0.3)
    }
}

fn extract_publisher(path: &str) -> String {
    let lower = path.to_lowercase();
    if lower.contains("microsoft") || lower.contains("windows") || lower.contains("onedrive") {
        "Microsoft Corporation".into()
    } else if lower.contains("discord") {
        "Discord Inc.".into()
    } else if lower.contains("spotify") {
        "Spotify AB".into()
    } else if lower.contains("valve") || lower.contains("steam") {
        "Valve Corporation".into()
    } else {
        "Unknown Publisher".into()
    }
}

#[tauri::command]
async fn get_startup_items() -> Result<Vec<StartupItem>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut items = Vec::new();
        let run_path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
        let approved_path = "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run";

        let roots = [
            (RegKey::predef(HKEY_CURRENT_USER), true, "HKCU"),
            (RegKey::predef(HKEY_LOCAL_MACHINE), false, "HKLM"),
        ];

        for (root, is_hkcu, root_name) in roots {
            let key = match root.open_subkey(run_path) {
                Ok(k) => k,
                Err(_) => continue,
            };

            let approved_key = root.open_subkey(approved_path).ok();

            for val_res in key.enum_values().flatten() {
                let name = val_res.0;
                let cmd_str: String = match val_res.1.to_string() {
                    s => s,
                };

                let mut enabled = true;
                if let Some(ref app_k) = approved_key {
                    if let Ok(raw_val) = app_k.get_raw_value(&name) {
                        if !raw_val.bytes.is_empty() {
                            enabled = raw_val.bytes[0] % 2 == 0;
                        }
                    }
                }

                let (impact, delay) = estimate_startup_impact(&cmd_str, enabled);
                let publisher = extract_publisher(&cmd_str);

                items.push(StartupItem {
                    name,
                    command: cmd_str,
                    enabled,
                    registry_path: format!("{}\\{}", root_name, run_path),
                    is_hkcu,
                    publisher,
                    impact: impact.to_string(),
                    delay,
                });
            }
        }

        Ok(items)
    })
    .await
    .map_err(|e| format!("Failed to fetch startup items: {}", e))?
}

#[tauri::command]
fn toggle_startup_item(name: String, is_hkcu: bool, enable: bool) -> Result<String, String> {
    if !is_hkcu && !is_elevated::is_elevated() {
        return Err("Administrator privileges required to change HKLM startup items".into());
    }

    let root = if is_hkcu {
        RegKey::predef(HKEY_CURRENT_USER)
    } else {
        RegKey::predef(HKEY_LOCAL_MACHINE)
    };
    let approved_path =
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run";

    let (key, _) = root
        .create_subkey(approved_path)
        .map_err(|e| format!("Failed to access StartupApproved registry key: {}", e))?;

    let mut data = vec![0u8; 12];
    data[0] = if enable { 0x02 } else { 0x03 };

    let reg_val = RegValue {
        vtype: REG_BINARY,
        bytes: data.into(),
    };

    key.set_raw_value(&name, &reg_val)
        .map_err(|e| format!("Failed to set startup approved state for '{}': {}", name, e))?;

    Ok(format!("Toggled {}", name))
}

pub fn delete_startup_item_impl(name: String, is_hkcu: bool) -> Result<String, String> {
    if !is_hkcu && !is_elevated::is_elevated() {
        return Err("Administrator privileges required to delete HKLM startup items".into());
    }

    let root = if is_hkcu {
        RegKey::predef(HKEY_CURRENT_USER)
    } else {
        RegKey::predef(HKEY_LOCAL_MACHINE)
    };
    let run_path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    let approved_path =
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run";

    let key = root
        .open_subkey_with_flags(run_path, KEY_WRITE)
        .map_err(|e| format!("Failed to open Run registry key: {}", e))?;
    key.delete_value(&name)
        .map_err(|e| format!("Failed to delete startup item '{}': {}", name, e))?;

    if let Ok(approved_key) = root.open_subkey_with_flags(approved_path, KEY_WRITE) {
        let _ = approved_key.delete_value(&name);
    }

    Ok(format!("Deleted startup item {}", name))
}

#[tauri::command]
fn delete_startup_item(name: String, is_hkcu: bool) -> Result<String, String> {
    delete_startup_item_impl(name, is_hkcu)
}

pub fn add_startup_item_impl(name: String, path: String, is_hkcu: bool) -> Result<String, String> {
    if !is_hkcu && !is_elevated::is_elevated() {
        return Err("Administrator privileges required to add HKLM startup items".into());
    }

    let root = if is_hkcu {
        RegKey::predef(HKEY_CURRENT_USER)
    } else {
        RegKey::predef(HKEY_LOCAL_MACHINE)
    };
    let run_path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";

    let key = root
        .open_subkey_with_flags(run_path, KEY_WRITE)
        .map_err(|e| format!("Failed to open Run registry key: {}", e))?;
    key.set_value(&name, &path)
        .map_err(|e| format!("Failed to write startup item value: {}", e))?;

    Ok(format!("Added startup item {}", name))
}

#[tauri::command]
fn add_startup_item(name: String, path: String, is_hkcu: bool) -> Result<String, String> {
    add_startup_item_impl(name, path, is_hkcu)
}

#[tauri::command]
fn clean_ram() -> Result<u64, String> {
    #[cfg(target_os = "windows")]
    {
        let mut sys = System::new_all();
        sys.refresh_memory();
        let before_available = sys.available_memory();

        let mut processes = [0u32; 1024];
        let mut needed = 0;

        unsafe {
            if EnumProcesses(
                processes.as_mut_ptr(),
                std::mem::size_of_val(&processes) as u32,
                &mut needed,
            ) != 0
            {
                let count = needed / std::mem::size_of::<u32>() as u32;
                for i in 0..count {
                    let pid = processes[i as usize];
                    if pid != 0 {
                        let handle =
                            OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA, 0, pid);
                        if !handle.is_null() {
                            let _ = EmptyWorkingSet(handle);
                            CloseHandle(handle);
                        }
                    }
                }
            }
        }

        std::thread::sleep(Duration::from_millis(150));
        sys.refresh_memory();
        let after_available = sys.available_memory();

        let actual_freed_bytes = after_available.saturating_sub(before_available);
        Ok(actual_freed_bytes)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(0)
    }
}

#[tauri::command]
fn set_power_plan(plan: String) -> Result<String, String> {
    let guid = match plan.as_str() {
        "performance" | "gaming" => "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
        _ => "381b4222-f694-41f0-9685-ff5bb260df2e",
    };

    let output = win_cmd("powercfg")
        .args(["/setactive", guid])
        .output()
        .map_err(|e| format!("Failed to set power plan: {}", e))?;

    if output.status.success() {
        Ok(format!("Power plan set to {}", plan))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn apply_boost(id: String, profile: String) -> Result<String, String> {
    if ["cpu", "net", "disk"].contains(&id.as_str()) && !is_elevated::is_elevated() {
        return Err(format!(
            "Administrator privileges are required to apply the {} boost.",
            id.to_uppercase()
        ));
    }

    match id.as_str() {
        "ram" => {
            let freed = clean_ram()?;
            return Ok(format!("RAM cleaned: freed {}", format_size(freed)));
        }
        "dns" => {
            flush_dns()?;
            return Ok("DNS cache flushed successfully".into());
        }
        "startup_delay" => {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            let (key, _) = hkcu
                .create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize")
                .map_err(|e| format!("Registry error: {}", e))?;
            key.set_value("StartupDelayInMSec", &0u32)
                .map_err(|e| format!("Registry write failed: {}", e))?;
        }
        "cpu" => {
            let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
            let (key, _) = hklm
                .create_subkey("SYSTEM\\CurrentControlSet\\Control\\PriorityControl")
                .map_err(|e| format!("Registry error: {}", e))?;
            key.set_value("Win32PrioritySeparation", &26u32)
                .map_err(|e| format!("Registry write failed: {}", e))?;
        }
        "net" => {
            let output = win_cmd("netsh")
                .args(["int", "tcp", "set", "global", "autotuninglevel=normal"])
                .output()
                .map_err(|e| format!("Failed to execute netsh: {}", e))?;
            if !output.status.success() {
                return Err(String::from_utf8_lossy(&output.stderr).to_string());
            }
        }
        "visual" => {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            let (key, _) = hkcu
                .create_subkey(
                    "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects",
                )
                .map_err(|e| format!("Registry error: {}", e))?;
            key.set_value("VisualFXSetting", &2u32)
                .map_err(|e| format!("Registry write failed: {}", e))?;
        }
        "power" => {
            set_power_plan(profile)?;
        }
        "disk" => {
            let output = win_cmd("fsutil")
                .args(["behavior", "set", "DisableDeleteNotify", "0"])
                .output()
                .map_err(|e| format!("Failed to execute fsutil: {}", e))?;
            if !output.status.success() {
                return Err(String::from_utf8_lossy(&output.stderr).to_string());
            }
        }
        "game" => {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            let (key, _) = hkcu
                .create_subkey("Software\\Microsoft\\GameBar")
                .map_err(|e| format!("Registry error: {}", e))?;
            key.set_value("AllowAutoGameMode", &1u32)
                .map_err(|e| format!("Registry write failed: {}", e))?;
            key.set_value("AutoGameModeEnabled", &1u32)
                .map_err(|e| format!("Registry write failed: {}", e))?;
        }
        "temp" => {
            let output = win_cmd("powercfg")
                .args([
                    "-setacvalueindex",
                    "SCHEME_CURRENT",
                    "SUB_PROCESSOR",
                    "SYSCOOLPOL",
                    "1",
                ])
                .output()
                .map_err(|e| format!("Failed to set powercfg cooling policy: {}", e))?;
            if !output.status.success() {
                return Err(String::from_utf8_lossy(&output.stderr).to_string());
            }
            let output2 = win_cmd("powercfg")
                .args(["-setactive", "SCHEME_CURRENT"])
                .output()
                .map_err(|e| format!("Failed to apply power plan settings: {}", e))?;
            if !output2.status.success() {
                return Err(String::from_utf8_lossy(&output2.stderr).to_string());
            }
        }
        unknown => {
            return Err(format!("Unknown boost identifier: '{}'", unknown));
        }
    }
    Ok(format!("Boost {} applied successfully", id))
}

#[tauri::command]
fn restore_boost(id: String) -> Result<String, String> {
    if ["cpu", "net", "disk"].contains(&id.as_str()) && !is_elevated::is_elevated() {
        return Err(format!(
            "Administrator privileges are required to restore the {} boost.",
            id.to_uppercase()
        ));
    }

    match id.as_str() {
        "ram" => {
            return Ok("RAM boost state reset".into());
        }
        "dns" => {
            return Ok("DNS cache flush is already completed".into());
        }
        "startup_delay" => {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            if let Ok(key) = hkcu.open_subkey_with_flags(
                "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize",
                KEY_WRITE,
            ) {
                let _ = key.delete_value("StartupDelayInMSec");
            }
        }
        "cpu" => {
            let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
            let (key, _) = hklm
                .create_subkey("SYSTEM\\CurrentControlSet\\Control\\PriorityControl")
                .map_err(|e| format!("Registry error: {}", e))?;
            key.set_value("Win32PrioritySeparation", &2u32)
                .map_err(|e| format!("Registry write failed: {}", e))?;
        }
        "net" => {
            let output = win_cmd("netsh")
                .args(["int", "tcp", "set", "global", "autotuninglevel=disabled"])
                .output()
                .map_err(|e| format!("Failed to execute netsh: {}", e))?;
            if !output.status.success() {
                return Err(String::from_utf8_lossy(&output.stderr).to_string());
            }
        }
        "visual" => {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            let (key, _) = hkcu
                .create_subkey(
                    "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects",
                )
                .map_err(|e| format!("Registry error: {}", e))?;
            key.set_value("VisualFXSetting", &0u32)
                .map_err(|e| format!("Registry write failed: {}", e))?;
        }
        "power" => {
            set_power_plan("balanced".to_string())?;
        }
        "disk" => {
            let output = win_cmd("fsutil")
                .args(["behavior", "set", "DisableDeleteNotify", "1"])
                .output()
                .map_err(|e| format!("Failed to execute fsutil: {}", e))?;
            if !output.status.success() {
                return Err(String::from_utf8_lossy(&output.stderr).to_string());
            }
        }
        "game" => {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            let (key, _) = hkcu
                .create_subkey("Software\\Microsoft\\GameBar")
                .map_err(|e| format!("Registry error: {}", e))?;
            key.set_value("AllowAutoGameMode", &0u32)
                .map_err(|e| format!("Registry write failed: {}", e))?;
            key.set_value("AutoGameModeEnabled", &0u32)
                .map_err(|e| format!("Registry write failed: {}", e))?;
        }
        "temp" => {
            let output = win_cmd("powercfg")
                .args([
                    "-setacvalueindex",
                    "SCHEME_CURRENT",
                    "SUB_PROCESSOR",
                    "SYSCOOLPOL",
                    "0",
                ])
                .output()
                .map_err(|e| format!("Failed to set powercfg cooling policy: {}", e))?;
            if !output.status.success() {
                return Err(String::from_utf8_lossy(&output.stderr).to_string());
            }
            let output2 = win_cmd("powercfg")
                .args(["-setactive", "SCHEME_CURRENT"])
                .output()
                .map_err(|e| format!("Failed to apply power plan settings: {}", e))?;
            if !output2.status.success() {
                return Err(String::from_utf8_lossy(&output2.stderr).to_string());
            }
        }
        unknown => {
            return Err(format!("Unknown boost identifier: '{}'", unknown));
        }
    }
    Ok(format!("Boost {} restored successfully", id))
}

#[tauri::command]
fn toggle_context_menu(enable: bool) -> Result<String, String> {
    if !is_elevated::is_elevated() {
        return Err("Administrator privileges are required to modify the context menu.".into());
    }

    let hkcr = RegKey::predef(HKEY_CLASSES_ROOT);
    let key_path = "Directory\\Background\\shell\\CPulse";

    if enable {
        let (key, _) = hkcr
            .create_subkey(key_path)
            .map_err(|e| format!("Registry error: {}", e))?;
        key.set_value("", &"Clean with CPulse")
            .map_err(|e| format!("Registry error: {}", e))?;

        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_str = exe_path.to_str().unwrap_or_default();
        key.set_value("Icon", &exe_str)
            .map_err(|e| format!("Registry error: {}", e))?;

        let (cmd_key, _) = key
            .create_subkey("command")
            .map_err(|e| format!("Registry error: {}", e))?;
        let cmd = format!("\"{}\" --silent-clean", exe_str);
        cmd_key
            .set_value("", &cmd)
            .map_err(|e| format!("Registry error: {}", e))?;

        Ok("Context menu entry added successfully".into())
    } else {
        match hkcr.delete_subkey_all(key_path) {
            Ok(_) => Ok("Context menu entry removed successfully".into()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                Ok("Context menu entry already removed".into())
            }
            Err(e) => Err(format!("Failed to delete context menu key: {}", e)),
        }
    }
}

#[tauri::command]
fn update_auto_clean(enable: bool) -> Result<String, String> {
    if enable {
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_str = exe_path.to_str().unwrap_or_default();
        let cmd = format!("\"{}\" --silent-clean", exe_str);

        let mut args = vec![
            "/create",
            "/tn",
            "WinCleanerAuto",
            "/tr",
            &cmd,
            "/sc",
            "WEEKLY",
            "/f",
        ];
        if is_elevated::is_elevated() {
            args.push("/rl");
            args.push("HIGHEST");
        }

        let output = win_cmd("schtasks")
            .args(&args)
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok("Auto-clean scheduled".into())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    } else {
        let output = win_cmd("schtasks")
            .args(["/delete", "/tn", "WinCleanerAuto", "/f"])
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() || String::from_utf8_lossy(&output.stderr).contains("cannot find") {
            Ok("Auto-clean removed".into())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

#[tauri::command]
fn update_auto_update(enable: bool) -> Result<String, String> {
    Ok(format!("Auto-update {}", if enable { "enabled" } else { "disabled" }))
}

#[tauri::command]
fn update_notifications(enable: bool) -> Result<String, String> {
    Ok(format!("Notifications {}", if enable { "enabled" } else { "disabled" }))
}

#[tauri::command]
fn update_language(lang: String) -> Result<String, String> {
    Ok(format!("Language set to {}", lang))
}

fn parse_typeperf_line(line: &str) -> Option<(u64, u64)> {
    let parts: Vec<&str> = line.split('"').collect();
    if parts.len() >= 6 {
        let read_str = parts[3].replace(',', ".");
        let write_str = parts[5].replace(',', ".");
        if let (Ok(r_val), Ok(w_val)) = (
            read_str.trim().parse::<f64>(),
            write_str.trim().parse::<f64>(),
        ) {
            return Some((r_val as u64, w_val as u64));
        }
    }
    None
}

fn spawn_typeperf_listener() {
    std::thread::spawn(|| {
        loop {
            let mut cmd = std::process::Command::new("typeperf");
            cmd.args([
                r#"\PhysicalDisk(_Total)\Disk Read Bytes/sec"#,
                r#"\PhysicalDisk(_Total)\Disk Write Bytes/sec"#,
                "-si",
                "1",
            ]);
            cmd.stdout(std::process::Stdio::piped());
            cmd.stderr(std::process::Stdio::null());
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(CREATE_NO_WINDOW);
            }

            match cmd.spawn() {
                Ok(mut child) => {
                    let pid = child.id();
                    TYPEPERF_CHILD_PID.store(pid, Ordering::SeqCst);

                    if let Some(stdout) = child.stdout.take() {
                        let reader = std::io::BufReader::new(stdout);
                        use std::io::BufRead;
                        for line in reader.lines().map_while(Result::ok) {
                            if let Some((read, write)) = parse_typeperf_line(&line) {
                                DISK_READ_BYTES.store(read, Ordering::SeqCst);
                                DISK_WRITE_BYTES.store(write, Ordering::SeqCst);
                            }
                        }
                    }

                    let _ = child.wait();
                }
                Err(e) => {
                    eprintln!("Failed to spawn typeperf: {}", e);
                    DISK_READ_BYTES.store(0, Ordering::SeqCst);
                    DISK_WRITE_BYTES.store(0, Ordering::SeqCst);
                }
            }
            TYPEPERF_CHILD_PID.store(0, Ordering::SeqCst);
            std::thread::sleep(Duration::from_secs(5));
        }
    });
}

fn cleanup_typeperf() {
    let pid = TYPEPERF_CHILD_PID.swap(0, Ordering::SeqCst);
    if pid != 0 {
        let _ = win_cmd("taskkill")
            .args(["/F", "/PID", &pid.to_string()])
            .status();
    }
}

#[tauri::command]
fn get_system_info() -> Result<serde_json::Value, String> {
    let os_name = System::name().unwrap_or_else(|| "Windows".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());
    let kernel = System::kernel_version().unwrap_or_else(|| "Unknown".to_string());
    let host = System::host_name().unwrap_or_else(|| "Unknown".to_string());
    Ok(serde_json::json!({
        "os_name": os_name,
        "os_version": os_version,
        "kernel": kernel,
        "host_name": host
    }))
}

pub fn collect_system_metrics_internal(
    sys: &mut System,
    disks: &mut Disks,
    components: &mut Components,
    networks: &mut Networks,
    disk_cache: &HashMap<String, (String, String)>,
) -> SystemMetrics {
    sys.refresh_cpu_all();
    sys.refresh_memory();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    disks.refresh(true);
    components.refresh(true);
    networks.refresh(true);

    let cpu_usage = sys.global_cpu_usage();
    let cpu_name = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".to_string());

    let mut cpu_cores = Vec::new();
    for cpu in sys.cpus() {
        cpu_cores.push(cpu.cpu_usage());
    }

    let uptime = sysinfo::System::uptime();
    let process_count = sys.processes().len() as u64;

    let mut cpu_temp = 0.0;
    for comp in components.list() {
        if comp.label().to_lowercase().contains("cpu") {
            cpu_temp = comp.temperature().unwrap_or(0.0);
            break;
        }
    }

    let total_ram = sys.total_memory() as f64 / 1_073_741_824.0;
    let used_ram = sys.used_memory() as f64 / 1_073_741_824.0;
    let ram_usage = if total_ram > 0.0 {
        (used_ram / total_ram * 100.0) as f32
    } else {
        0.0
    };

    let mut disks_info = Vec::new();
    for disk in disks.list() {
        let t = disk.total_space() as f64 / 1_073_741_824.0;
        let u = (disk.total_space() - disk.available_space()) as f64 / 1_073_741_824.0;
        let mount_p = disk.mount_point().to_string_lossy().into_owned();
        let letter = mount_p
            .chars()
            .next()
            .unwrap_or('C')
            .to_string()
            .to_uppercase();

        let (model, disk_type) = if let Some((m, dt)) = disk_cache.get(&letter) {
            (m.clone(), dt.clone())
        } else {
            let dt = match disk.kind() {
                sysinfo::DiskKind::SSD => "SSD".to_string(),
                sysinfo::DiskKind::HDD => "HDD".to_string(),
                _ => "SSD".to_string(),
            };
            ("Local Disk".to_string(), dt)
        };

        disks_info.push(DiskInfo {
            name: format!("{}:", letter),
            used: u,
            total: t,
            disk_type,
            model,
        });
    }

    let mut network_up = 0.0;
    let mut network_down = 0.0;
    for (_, data) in networks.iter() {
        network_up += data.transmitted() as f64 / 1_048_576.0;
        network_down += data.received() as f64 / 1_048_576.0;
    }

    let disk_read_speed = DISK_READ_BYTES.load(Ordering::SeqCst) as f64 / 1_048_576.0;
    let disk_write_speed = DISK_WRITE_BYTES.load(Ordering::SeqCst) as f64 / 1_048_576.0;

    SystemMetrics {
        cpu_usage,
        cpu_temp,
        cpu_name,
        cpu_cores,
        ram_usage,
        total_ram,
        used_ram,
        disks: disks_info,
        network_up,
        network_down,
        disk_read_speed,
        disk_write_speed,
        uptime,
        process_count,
    }
}

#[tauri::command]
async fn generate_diagnostics_report(app: tauri::AppHandle) -> Result<String, String> {
    let mut sys = System::new_all();
    let mut components = Components::new_with_refreshed_list();
    let mut disks = Disks::new_with_refreshed_list();
    let mut networks = Networks::new_with_refreshed_list();
    let disk_cache = get_disk_details();

    let metrics = collect_system_metrics_internal(
        &mut sys,
        &mut disks,
        &mut components,
        &mut networks,
        &disk_cache,
    );

    let os_name = System::name().unwrap_or_else(|| "Windows".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown Version".to_string());
    let kernel_version = System::kernel_version().unwrap_or_else(|| "Unknown Kernel".to_string());
    let host_name = System::host_name().unwrap_or_else(|| "DESKTOP-CPULSE".to_string());

    let mut processes: Vec<_> = sys.processes().values().collect();
    processes.sort_by(|a, b| {
        b.cpu_usage()
            .partial_cmp(&a.cpu_usage())
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let top_cpu: Vec<_> = processes
        .iter()
        .take(10)
        .map(|p| {
            format!(
                "| {} | {} | {:.1}% | {} |",
                p.pid(),
                p.name().to_string_lossy(),
                p.cpu_usage(),
                format_size(p.memory())
            )
        })
        .collect();

    processes.sort_by_key(|b| std::cmp::Reverse(b.memory()));
    let top_mem: Vec<_> = processes
        .iter()
        .take(10)
        .map(|p| {
            format!(
                "| {} | {} | {} | {:.1}% |",
                p.pid(),
                p.name().to_string_lossy(),
                format_size(p.memory()),
                p.cpu_usage()
            )
        })
        .collect();

    let date_str = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let mut report = String::new();
    report.push_str("# CPulse System Diagnostics Report\n\n");
    report.push_str(&format!("**Generated on:** {}\n", date_str));
    report.push_str(&format!("**Host Name:** {}\n", host_name));
    report.push_str("\n## OS Information\n");
    report.push_str(&format!("- **OS Name:** {}\n", os_name));
    report.push_str(&format!("- **OS Version:** {}\n", os_version));
    report.push_str(&format!("- **Kernel Version:** {}\n", kernel_version));

    report.push_str("\n## Hardware Specifications\n");
    report.push_str(&format!("- **CPU:** {}\n", metrics.cpu_name));
    report.push_str(&format!("- **Logical Cores:** {}\n", metrics.cpu_cores.len()));
    report.push_str(&format!("- **Total Memory:** {:.2} GB\n", metrics.total_ram));
    report.push_str(&format!(
        "- **Used Memory:** {:.2} GB ({:.1}%)\n",
        metrics.used_ram, metrics.ram_usage
    ));
    report.push_str(&format!(
        "- **Free Memory:** {:.2} GB\n",
        (metrics.total_ram - metrics.used_ram).max(0.0)
    ));

    report.push_str("\n## Disk Storage Details\n");
    report.push_str("| Drive | Model | Type | Used | Total | Free | % Used |\n");
    report.push_str("| --- | --- | --- | --- | --- | --- | --- |\n");
    for disk in &metrics.disks {
        let free = (disk.total - disk.used).max(0.0);
        let pct = if disk.total > 0.0 {
            (disk.used / disk.total) * 100.0
        } else {
            0.0
        };
        report.push_str(&format!(
            "| {} | {} | {} | {:.1} GB | {:.1} GB | {:.1} GB | {:.1}% |\n",
            disk.name, disk.model, disk.disk_type, disk.used, disk.total, free, pct
        ));
    }

    report.push_str("\n## Top 10 CPU Consumers\n");
    report.push_str("| PID | Process Name | CPU % | Memory |\n");
    report.push_str("| --- | --- | --- | --- |\n");
    for row in top_cpu {
        report.push_str(&format!("{}\n", row));
    }

    report.push_str("\n## Top 10 Memory Consumers\n");
    report.push_str("| PID | Process Name | Memory | CPU % |\n");
    report.push_str("| --- | --- | --- | --- |\n");
    for row in top_mem {
        report.push_str(&format!("{}\n", row));
    }

    let reports_dir = if let Ok(app_data) = app.path().app_data_dir() {
        app_data.join("reports")
    } else {
        std::env::temp_dir().join("cpulse_reports")
    };
    let _ = fs::create_dir_all(&reports_dir);

    let clean_date = date_str.replace([':', ' '], "_");
    let file_name = format!("Diagnostics_Report_{}.txt", clean_date);
    let full_path = reports_dir.join(&file_name);

    fs::write(&full_path, &report).map_err(|e| format!("Failed to write report file: {}", e))?;

    Ok(file_name)
}

#[tauri::command]
fn get_diagnostics_reports(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let reports_dir = if let Ok(app_data) = app.path().app_data_dir() {
        app_data.join("reports")
    } else {
        std::env::temp_dir().join("cpulse_reports")
    };

    if !reports_dir.exists() {
        return Ok(Vec::new());
    }

    let mut reports = Vec::new();
    if let Ok(entries) = fs::read_dir(reports_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "txt" {
                        if let Some(file_name) = path.file_name() {
                            reports.push(file_name.to_string_lossy().into_owned());
                        }
                    }
                }
            }
        }
    }

    reports.sort_by(|a, b| b.cmp(a));
    Ok(reports)
}

#[tauri::command]
fn read_diagnostics_report(app: tauri::AppHandle, filename: String) -> Result<String, String> {
    let reports_dir = if let Ok(app_data) = app.path().app_data_dir() {
        app_data.join("reports")
    } else {
        std::env::temp_dir().join("cpulse_reports")
    };

    let target_path = reports_dir.join(filename);
    if !target_path.exists() {
        return Err("Report file does not exist.".into());
    }

    fs::read_to_string(target_path).map_err(|e| format!("Failed to read report: {}", e))
}

#[tauri::command]
fn export_diagnostics_report(app: tauri::AppHandle, filename: String) -> Result<String, String> {
    let reports_dir = if let Ok(app_data) = app.path().app_data_dir() {
        app_data.join("reports")
    } else {
        std::env::temp_dir().join("cpulse_reports")
    };

    let target_path = reports_dir.join(&filename);
    if !target_path.exists() {
        return Err("Report file does not exist.".into());
    }

    let downloads_dir = dirs_next::download_dir().unwrap_or_else(std::env::temp_dir);
    let destination = downloads_dir.join(&filename);

    fs::copy(&target_path, &destination).map_err(|e| format!("Failed to export report: {}", e))?;

    Ok(format!(
        "Exported successfully to {}",
        destination.to_string_lossy()
    ))
}

fn get_os_edition_rust() -> String {
    let hk = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hk.open_subkey("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion") {
        let mut clean = String::new();
        if let Ok(edition_id) = key.get_value::<String, _>("EditionID") {
            if !edition_id.trim().is_empty() {
                clean = format!("Windows 11 {}", edition_id.trim());
            }
        }
        if clean.is_empty() {
            if let Ok(prod_name) = key.get_value::<String, _>("ProductName") {
                let stripped = prod_name.replace("Microsoft ", "").trim().to_string();
                if !stripped.is_empty() {
                    clean = stripped;
                }
            }
        }
        if !clean.is_empty() {
            let build_number: String = key.get_value("CurrentBuild").unwrap_or_default();
            if !build_number.is_empty() {
                return format!("{} (Build {})", clean, build_number);
            }
            return clean;
        }
    }
    if let Some(long_os) = System::long_os_version() {
        if !long_os.trim().is_empty() {
            return long_os.replace("Microsoft ", "").trim().to_string();
        }
    }
    "Windows 11 Pro".to_string()
}

#[derive(Clone, Serialize, Debug)]
pub struct WindowsKeyInfo {
    pub key: String,
    pub key_type: String,
    pub edition: String,
    pub is_valid: bool,
}

#[tauri::command]
async fn get_windows_key() -> Result<WindowsKeyInfo, String> {
    let exact_rust_edition = get_os_edition_rust();

    let script = r#"
    $ErrorActionPreference = 'SilentlyContinue'

    function Decode-DigitalProductId ($digitalProductId) {
        if (-not $digitalProductId -or $digitalProductId.Length -lt 67) { return $null }
        try {
            $keyOffset = 52
            $isWin8 = [math]::Truncate($digitalProductId[$keyOffset + 14] / 8) -band 1
            $digitalProductId[$keyOffset + 14] = ($digitalProductId[$keyOffset + 14] -band 0xF7) -bor (($isWin8 -band 1) * 8)
            $chars = "BCDFGHJKMPQRTVWXY2346789"
            $rawKey = ""
            for ($i = 24; $i -ge 0; $i--) {
                $current = 0
                for ($j = 14; $j -ge 0; $j--) {
                    $current = $current * 256
                    $current = $digitalProductId[$j + $keyOffset] + $current
                    $digitalProductId[$j + $keyOffset] = [math]::Truncate($current / 24)
                    $current = $current % 24
                }
                $rawKey = $chars[$current] + $rawKey
            }
            if ($isWin8 -eq 1) {
                $keyPart1 = $rawKey.Substring(1, $current)
                $keyPart2 = $rawKey.Substring($current + 1)
                $rawKey = $keyPart1 + "N" + $keyPart2
            }
            $formattedKey = ""
            for ($i = 0; $i -lt 25; $i++) {
                if ($i -gt 0 -and ($i % 5) -eq 0) { $formattedKey += "-" }
                $formattedKey += $rawKey[$i]
            }
            if ($formattedKey.Length -eq 29) { return $formattedKey }
        } catch {}
        return $null
    }

    $osObj = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction SilentlyContinue
    $caption = if ($osObj -and $osObj.Caption) { [string]$osObj.Caption } else { [string](Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -Name ProductName -ErrorAction SilentlyContinue).ProductName }
    if (-not $caption -or $caption.Trim() -eq "") { $caption = "Windows 11 / 10" }
    $edition = $caption.Replace("Microsoft ", "").Trim()

    # 1. OEM Key from WMI / BIOS
    $oemKey = (Get-CimInstance -ClassName SoftwareLicensingService -ErrorAction SilentlyContinue).OA3xOriginalProductKey
    if (-not $oemKey) {
        $oemKey = (Get-CimInstance -Namespace root\wmi -ClassName MSSoftwareLicensingProductKeyData -ErrorAction SilentlyContinue).OA3xOriginalProductKey
    }
    if ($oemKey -and $oemKey.Trim().Length -ge 20) {
        @{
            key = $oemKey.Trim()
            key_type = "OEM (BIOS / Firmware)"
            edition = $edition
            is_valid = $true
        } | ConvertTo-Json -Compress
        exit
    }

    # 2. Decode DigitalProductId from Registry
    $digitalBytes = (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -Name DigitalProductId -ErrorAction SilentlyContinue).DigitalProductId
    $decodedKey = Decode-DigitalProductId $digitalBytes
    if ($decodedKey -and $decodedKey.Length -ge 20 -and $decodedKey -ne "BBBBB-BBBBB-BBBBB-BBBBB-BBBBB") {
        @{
            key = $decodedKey
            key_type = "Retail / Digital Key"
            edition = $edition
            is_valid = $true
        } | ConvertTo-Json -Compress
        exit
    }

    # 3. BackupProductKeyDefault from Registry
    $regKey = (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SoftwareProtectionPlatform' -Name BackupProductKeyDefault -ErrorAction SilentlyContinue).BackupProductKeyDefault
    if ($regKey -and $regKey.Trim().Length -ge 20) {
        @{
            key = $regKey.Trim()
            key_type = "Installed / Registry Key"
            edition = $edition
            is_valid = $true
        } | ConvertTo-Json -Compress
        exit
    }

    # 4. Digital License Partial Product Key
    $licProduct = Get-CimInstance -ClassName SoftwareLicensingProduct -ErrorAction SilentlyContinue | Where-Object { $_.PartialProductKey -and $_.Name -like "*Windows*" -and $_.LicenseStatus -eq 1 } | Select-Object -First 1
    if ($licProduct -and $licProduct.PartialProductKey) {
        @{
            key = "Partial: *****-*****-*****-*****-" + $licProduct.PartialProductKey
            key_type = "Digital License (Active)"
            edition = $edition
            is_valid = $true
        } | ConvertTo-Json -Compress
        exit
    }

    # 5. If no genuine key detected, report is_valid = false
    @{
        key = ""
        key_type = "Not Detected"
        edition = $edition
        is_valid = $false
    } | ConvertTo-Json -Compress
    "#;

    let output = win_cmd("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let json_line = stdout_str
        .lines()
        .rev()
        .find(|l| l.trim().starts_with('{'))
        .unwrap_or(&stdout_str);

    let mut key = String::new();
    let mut key_type = "Not Detected".to_string();
    let mut edition = exact_rust_edition;
    let mut is_valid = false;

    if !json_line.is_empty() {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_line) {
            if let Some(k) = parsed["key"].as_str() {
                if !k.is_empty() {
                    key = k.to_string();
                }
            }
            if let Some(kt) = parsed["key_type"].as_str() {
                if !kt.is_empty() {
                    key_type = kt.to_string();
                }
            }
            if let Some(ed) = parsed["edition"].as_str() {
                if !ed.is_empty() && ed != "Windows 10/11" && ed != "Windows 11 / 10" {
                    edition = ed.to_string();
                }
            }
            if let Some(iv) = parsed["is_valid"].as_bool() {
                is_valid = iv;
            }
        }
    }

    Ok(WindowsKeyInfo {
        key,
        key_type,
        edition,
        is_valid,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            app.manage(ScanCancelFlag::default());
            let args: Vec<String> = std::env::args().collect();
            if args.iter().any(|arg| arg == "--silent-clean") {
                let app_handle = app.handle().clone();
                run_silent_clean(&app_handle);
                std::process::exit(0);
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_handle = app.handle().clone();

            spawn_typeperf_listener();

            tauri::async_runtime::spawn(async move {
                let mut sys = System::new_all();
                let mut components = Components::new_with_refreshed_list();
                let mut disks = Disks::new_with_refreshed_list();
                let mut networks = Networks::new_with_refreshed_list();
                let disk_cache = get_disk_details();

                loop {
                    let metrics = collect_system_metrics_internal(
                        &mut sys,
                        &mut disks,
                        &mut components,
                        &mut networks,
                        &disk_cache,
                    );

                    let _ = app_handle.emit("system-metrics", metrics);

                    std::thread::sleep(Duration::from_secs(2));
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_junk,
            clean_junk,
            cancel_scan,
            open_cleaner_audit_log,
            flush_dns,
            scan_privacy,
            sweep_privacy,
            is_admin,
            get_startup_items,
            toggle_startup_item,
            delete_startup_item,
            add_startup_item,
            clean_ram,
            apply_boost,
            restore_boost,
            set_power_plan,
            toggle_context_menu,
            update_auto_clean,
            update_auto_update,
            update_notifications,
            update_language,
            get_system_info,
            generate_diagnostics_report,
            get_diagnostics_reports,
            read_diagnostics_report,
            export_diagnostics_report,
            get_windows_key
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                cleanup_typeperf();
            }
        });
}
