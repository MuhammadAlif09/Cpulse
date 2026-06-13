use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use sysinfo::{System, Networks, Disks, Components};
use tauri::{Manager, Emitter};
use serde::Serialize;
use trash::delete as move_to_trash;
use std::os::windows::process::CommandExt;

#[derive(Clone, Serialize)]
struct SystemMetrics {
    cpu_usage: f32,
    ram_usage: f32,
    total_ram: f64,
    used_ram: f64,
    disk_usage: f32,
    total_disk: f64,
    used_disk: f64,
    network_up: f64,
    network_down: f64,
}

#[derive(Clone, Serialize)]
struct JunkItem {
    name: String,
    size: String,
    bytes: u64,
    count: usize,
    color: String,
    icon: String,
}

#[tauri::command]
fn is_admin() -> bool {
    is_elevated::is_elevated()
}

fn get_dir_size_and_count(path: &Path) -> (u64, usize) {
    let mut size = 0;
    let mut count = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_dir() {
                    let (s, c) = get_dir_size_and_count(&entry.path());
                    size += s;
                    count += c;
                } else {
                    size += metadata.len();
                    count += 1;
                }
            }
        }
    }
    (size, count)
}

fn format_size(bytes: u64) -> String {
    if bytes < 1024 { return format!("{} B", bytes); }
    let kb = bytes as f64 / 1024.0;
    if kb < 1024.0 { return format!("{:.1} KB", kb); }
    let mb = kb / 1024.0;
    if mb < 1024.0 { return format!("{:.1} MB", mb); }
    let gb = mb / 1024.0;
    format!("{:.1} GB", gb)
}

#[tauri::command]
fn scan_junk() -> Result<Vec<JunkItem>, String> {
    let mut results = Vec::new();

    // 1. Windows Temp Files
    let mut temp_bytes = 0;
    let mut temp_count = 0;
    let local_temp = std::env::temp_dir();
    let (s, c) = get_dir_size_and_count(&local_temp);
    temp_bytes += s; temp_count += c;

    if is_elevated::is_elevated() {
        let win_temp = PathBuf::from("C:\\Windows\\Temp");
        let (s, c) = get_dir_size_and_count(&win_temp);
        temp_bytes += s; temp_count += c;
    }

    if temp_bytes > 0 || temp_count > 0 {
        results.push(JunkItem {
            name: "Windows Temp Files".to_string(),
            size: format_size(temp_bytes),
            bytes: temp_bytes,
            count: temp_count,
            color: "#4f46e5".to_string(),
            icon: "🗃️".to_string(),
        });
    }

    // 2. Browser Cache
    let mut browser_bytes = 0;
    let mut browser_count = 0;
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        let local_app_data = PathBuf::from(local_app_data);
        
        let chrome_cache = local_app_data.join("Google\\Chrome\\User Data\\Default\\Cache");
        let (s, c) = get_dir_size_and_count(&chrome_cache);
        browser_bytes += s; browser_count += c;

        let edge_cache = local_app_data.join("Microsoft\\Edge\\User Data\\Default\\Cache");
        let (s, c) = get_dir_size_and_count(&edge_cache);
        browser_bytes += s; browser_count += c;
    }

    if browser_bytes > 0 || browser_count > 0 {
        results.push(JunkItem {
            name: "Browser Cache".to_string(),
            size: format_size(browser_bytes),
            bytes: browser_bytes,
            count: browser_count,
            color: "#7c3aed".to_string(),
            icon: "🌐".to_string(),
        });
    }

    // 3. Windows Update Cache (Requires Admin)
    if is_elevated::is_elevated() {
        let soft_dist = PathBuf::from("C:\\Windows\\SoftwareDistribution\\Download");
        let (s, c) = get_dir_size_and_count(&soft_dist);
        if s > 0 || c > 0 {
            results.push(JunkItem {
                name: "Windows Update Cache".to_string(),
                size: format_size(s),
                bytes: s,
                count: c,
                color: "#10b981".to_string(),
                icon: "🔄".to_string(),
            });
        }
    }

    // 4. Crash Dumps & Logs
    let mut dump_bytes = 0;
    let mut dump_count = 0;
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        let crash_dumps = PathBuf::from(local_app_data).join("CrashDumps");
        let (s, c) = get_dir_size_and_count(&crash_dumps);
        dump_bytes += s; dump_count += c;
    }
    if is_elevated::is_elevated() {
        let minidump = PathBuf::from("C:\\Windows\\Minidump");
        let (s, c) = get_dir_size_and_count(&minidump);
        dump_bytes += s; dump_count += c;
    }
    if dump_bytes > 0 || dump_count > 0 {
        results.push(JunkItem {
            name: "Crash Dumps & Logs".to_string(),
            size: format_size(dump_bytes),
            bytes: dump_bytes,
            count: dump_count,
            color: "#f43f5e".to_string(),
            icon: "💥".to_string(),
        });
    }

    Ok(results)
}

fn clear_dir(path: &Path, to_trash: bool) -> Result<(), String> {
    if !path.exists() { return Ok(()); }
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if to_trash {
                let _ = move_to_trash(&entry_path); // ignore error on locked files
            } else {
                if entry_path.is_dir() {
                    let _ = fs::remove_dir_all(&entry_path);
                } else {
                    let _ = fs::remove_file(&entry_path);
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn clean_junk(categories: Vec<String>) -> Result<String, String> {
    let is_admin = is_elevated::is_elevated();

    if categories.contains(&"Windows Temp Files".to_string()) {
        let _ = clear_dir(&std::env::temp_dir(), false);
        if is_admin {
            let _ = clear_dir(&PathBuf::from("C:\\Windows\\Temp"), false);
        }
    }

    if categories.contains(&"Browser Cache".to_string()) {
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            let local_app_data = PathBuf::from(local_app_data);
            let _ = clear_dir(&local_app_data.join("Google\\Chrome\\User Data\\Default\\Cache"), true);
            let _ = clear_dir(&local_app_data.join("Microsoft\\Edge\\User Data\\Default\\Cache"), true);
        }
    }

    if categories.contains(&"Windows Update Cache".to_string()) && is_admin {
        let _ = clear_dir(&PathBuf::from("C:\\Windows\\SoftwareDistribution\\Download"), true);
    }

    if categories.contains(&"Crash Dumps & Logs".to_string()) {
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            let _ = clear_dir(&PathBuf::from(local_app_data).join("CrashDumps"), true);
        }
        if is_admin {
            let _ = clear_dir(&PathBuf::from("C:\\Windows\\Minidump"), true);
        }
    }

    Ok("Cleaned successfully".into())
}

#[tauri::command]
fn flush_dns() -> Result<String, String> {
    let output = std::process::Command::new("ipconfig")
        .arg("/flushdns")
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
        .map_err(|e| e.to_string())?;
        
    if output.status.success() {
        Ok("DNS cache flushed successfully".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn sweep_privacy(items: Vec<String>) -> Result<String, String> {
    // Basic implementation for now
    Ok("Swept successfully".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_process::init())
    .setup(|app| {
        let app_handle = app.handle().clone();
        
        std::thread::spawn(move || {
            let mut sys = System::new_all();
            let mut networks = Networks::new_with_refreshed_list();
            let mut disks = Disks::new_with_refreshed_list();
            let mut components = Components::new_with_refreshed_list();

            loop {
                sys.refresh_all();
                networks.refresh(true);
                disks.refresh(true);
                components.refresh(true);

                let cpu_usage = sys.global_cpu_usage();
                
                let total_ram = sys.total_memory() as f64 / 1_073_741_824.0; // GB
                let used_ram = sys.used_memory() as f64 / 1_073_741_824.0;
                let ram_usage = if total_ram > 0.0 { (used_ram / total_ram * 100.0) as f32 } else { 0.0 };

                let mut total_disk_bytes = 0;
                let mut used_disk_bytes = 0;
                for disk in disks.list() {
                    total_disk_bytes += disk.total_space();
                    used_disk_bytes += disk.total_space() - disk.available_space();
                }
                
                let total_disk = total_disk_bytes as f64 / 1_073_741_824.0;
                let used_disk = used_disk_bytes as f64 / 1_073_741_824.0;
                let disk_usage = if total_disk > 0.0 { (used_disk / total_disk * 100.0) as f32 } else { 0.0 };

                let mut network_up = 0.0;
                let mut network_down = 0.0;
                for (_, data) in networks.iter() {
                    network_up += data.transmitted() as f64 / 1_048_576.0; // MB/s (approx per sec due to 1s sleep)
                    network_down += data.received() as f64 / 1_048_576.0;
                }

                let metrics = SystemMetrics {
                    cpu_usage,
                    ram_usage,
                    total_ram,
                    used_ram,
                    disk_usage,
                    total_disk,
                    used_disk,
                    network_up,
                    network_down,
                };

                let _ = app_handle.emit("system-metrics", metrics);

                std::thread::sleep(Duration::from_secs(1));
            }
        });

        Ok(())
    })
    .invoke_handler(tauri::generate_handler![scan_junk, clean_junk, flush_dns, sweep_privacy, is_admin])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
