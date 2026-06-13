use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use sysinfo::{System, Networks, Disks, Components};
use tauri::{Manager, Emitter};
use serde::Serialize;

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

#[tauri::command]
fn is_admin() -> bool {
    is_elevated::is_elevated()
}

#[tauri::command]
fn clean_junk(categories: Vec<String>) -> Result<String, String> {
    println!("Cleaning junk categories: {:?}", categories);
    // Real deletion logic goes here.
    // Example for temp files:
    if categories.contains(&"Windows Temp Files".to_string()) {
        let temp_dir = std::env::temp_dir();
        println!("Target temp dir: {:?}", temp_dir);
        // fs::remove_dir_all(&temp_dir).ok(); // Skipped for safety in demo
    }
    Ok("Cleaned successfully".into())
}

#[tauri::command]
fn sweep_privacy(items: Vec<String>) -> Result<String, String> {
    println!("Sweeping privacy items: {:?}", items);
    // Real deletion logic goes here.
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
    .invoke_handler(tauri::generate_handler![clean_junk, sweep_privacy, is_admin])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
