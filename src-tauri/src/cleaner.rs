// cleaner.rs — Modularized junk scan & clean logic for CPulse
//
// Extracted from lib.rs to keep each feature domain in its own file.
// Contains: JunkItem struct, scan/clean functions, cancel mechanism,
// safeguard limits, audit logging, and all scan categories.

use serde::Serialize;
use std::fs;
use std::io::{BufWriter, Write};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::{Emitter, Manager};
use trash::delete as move_to_trash;

// ─── Safeguard Constants ──────────────────────────────────────────────
// Prevents OOM/stack overflow on abnormal folder structures (junction loops,
// deeply nested symbolic links, or folders with millions of tiny files).
pub const MAX_FILES: usize = 100_000;
pub const MAX_DEPTH: usize = 20;
const MAX_PATH_LEN: usize = 4096;

// ─── Cancel Scan State ────────────────────────────────────────────────
// Stored in Tauri managed state via `app.manage()`. This avoids global
// mutable statics and race conditions when user spams the scan button.
pub struct ScanCancelFlag(pub Arc<AtomicBool>);

impl Default for ScanCancelFlag {
    fn default() -> Self {
        ScanCancelFlag(Arc::new(AtomicBool::new(false)))
    }
}

// ─── Data Structures ──────────────────────────────────────────────────

#[derive(Clone, Serialize)]
pub struct JunkItem {
    pub name: String,
    pub size: String,
    pub bytes: u64,
    pub count: usize,
    pub color: String,
    pub icon: String,
    /// Human-readable explanation of what this category contains
    pub description: String,
    /// Warning text for sensitive categories (empty string = safe to clean)
    pub warning: String,
    /// Whether this category requires administrator privileges
    pub requires_admin: bool,
}

// ─── Utility Functions ────────────────────────────────────────────────

pub fn format_size(bytes: u64) -> String {
    if bytes < 1024 {
        return format!("{} B", bytes);
    }
    let kb = bytes as f64 / 1024.0;
    if kb < 1024.0 {
        return format!("{:.1} KB", kb);
    }
    let mb = kb / 1024.0;
    if mb < 1024.0 {
        return format!("{:.1} MB", mb);
    }
    let gb = mb / 1024.0;
    format!("{:.1} GB", gb)
}

/// Recursively calculates the total size and file count of a directory.
///
/// Safeguards enforced:
/// - MAX_FILES: stops counting after 100,000 files
/// - MAX_DEPTH: stops recursing deeper than 20 levels
/// - MAX_PATH_LEN: skips paths longer than 4096 characters
/// - Cancel flag: checked per-iteration so user can abort mid-scan
pub fn get_dir_size_and_count(
    path: &Path,
    cancel_flag: Option<&AtomicBool>,
    depth: usize,
    file_count: &mut usize,
) -> (u64, usize) {
    // Safeguard: max recursion depth to prevent stack overflow on junction loops
    if depth > MAX_DEPTH {
        return (0, 0);
    }

    // Safeguard: max file count to prevent OOM
    if *file_count >= MAX_FILES {
        return (0, 0);
    }

    // Cancel check: user pressed "Cancel Scan"
    if let Some(flag) = cancel_flag {
        if flag.load(Ordering::Relaxed) {
            return (0, 0);
        }
    }

    let mut size = 0u64;
    let mut count = 0usize;

    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return (0, 0), // graceful: skip inaccessible dirs (PermissionDenied etc.)
    };

    for entry in entries.flatten() {
        // Safeguard: check cancel flag periodically (every entry)
        if let Some(flag) = cancel_flag {
            if flag.load(Ordering::Relaxed) {
                return (size, count);
            }
        }

        // Safeguard: max file count reached
        if *file_count >= MAX_FILES {
            return (size, count);
        }

        let entry_path = entry.path();

        // Safeguard: skip paths that are too long
        if entry_path.to_string_lossy().len() > MAX_PATH_LEN {
            continue;
        }

        if let Ok(metadata) = entry.metadata() {
            if metadata.is_dir() {
                let (s, c) = get_dir_size_and_count(
                    &entry_path,
                    cancel_flag,
                    depth + 1,
                    file_count,
                );
                size += s;
                count += c;
            } else {
                size += metadata.len();
                count += 1;
                *file_count += 1;
            }
        }
    }

    (size, count)
}

/// Convenience wrapper that starts at depth 0 and creates a file counter.
pub fn scan_dir(path: &Path, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    let mut file_count = 0usize;
    get_dir_size_and_count(path, cancel_flag, 0, &mut file_count)
}

/// Scans multiple subdirectories matching a glob-like pattern within a base dir.
/// Used for Firefox-style profile directories and thumbcache files.
fn scan_matching_children(
    base: &Path,
    name_contains: &str,
    cancel_flag: Option<&AtomicBool>,
) -> (u64, usize) {
    let mut total_bytes = 0u64;
    let mut total_count = 0usize;

    if let Ok(entries) = fs::read_dir(base) {
        for entry in entries.flatten() {
            let entry_name = entry.file_name().to_string_lossy().to_lowercase();
            if entry_name.contains(name_contains) {
                let path = entry.path();
                if path.is_dir() {
                    let (s, c) = scan_dir(&path, cancel_flag);
                    total_bytes += s;
                    total_count += c;
                } else if path.is_file() {
                    if let Ok(meta) = fs::metadata(&path) {
                        total_bytes += meta.len();
                        total_count += 1;
                    }
                }
            }
        }
    }

    (total_bytes, total_count)
}

/// Gets the total Recycle Bin size across all drives using PowerShell.
/// Returns (bytes, approximate_item_count).
fn get_recycle_bin_size() -> (u64, usize) {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "$shell = New-Object -ComObject Shell.Application; \
             $rb = $shell.NameSpace(0x0A); \
             $items = $rb.Items(); \
             $totalSize = 0; $count = $items.Count; \
             foreach($item in $items) { $totalSize += $item.ExtendedProperty('System.Size') }; \
             Write-Output \"$totalSize|$count\""
        ])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output();

    if let Ok(out) = output {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let parts: Vec<&str> = text.split('|').collect();
            if parts.len() >= 2 {
                let bytes = parts[0].parse::<u64>().unwrap_or(0);
                let count = parts[1].parse::<usize>().unwrap_or(0);
                return (bytes, count);
            }
        }
    }

    (0, 0)
}

// ─── Scan Logic ───────────────────────────────────────────────────────

pub fn scan_junk_internal(
    app: Option<&tauri::AppHandle>,
    cancel_flag: Option<&AtomicBool>,
) -> Result<Vec<JunkItem>, String> {
    let is_admin = is_elevated::is_elevated();
    let completed_steps = &AtomicUsize::new(0);
    let total_steps = 13.0f32;

    let is_cancelled = || -> bool {
        cancel_flag.is_some_and(|f| f.load(Ordering::Relaxed))
    };

    let mut results = Vec::new();

    std::thread::scope(|s| {
        // ── 1. Windows Temp Files ─────────────────────────────────────────
        let t1 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut temp_bytes = 0u64;
            let mut temp_count = 0usize;
            let local_temp = std::env::temp_dir();
            let (s, c) = scan_dir(&local_temp, cancel_flag);
            temp_bytes += s;
            temp_count += c;

            if is_admin {
                let win_temp = PathBuf::from("C:\\Windows\\Temp");
                let (s, c) = scan_dir(&win_temp, cancel_flag);
                temp_bytes += s;
                temp_count += c;
            }

            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }

            if temp_bytes > 0 || temp_count > 0 {
                Some(JunkItem {
                    name: "Windows Temp Files".to_string(),
                    size: format_size(temp_bytes),
                    bytes: temp_bytes,
                    count: temp_count,
                    color: "#4f46e5".to_string(),
                    icon: "🗑️".to_string(),
                    description: "Temporary files created by Windows and applications during normal operation. Safe to remove.".to_string(),
                    warning: String::new(),
                    requires_admin: false,
                })
            } else {
                None
            }
        });

        // ── 2. Browser Cache (Chrome + Edge + Brave) ──────────────────────
        let t2 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut browser_bytes = 0u64;
            let mut browser_count = 0usize;
            if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
                let local_app_data = PathBuf::from(local_app_data);

                // Chrome cache directories
                let chrome_cache = local_app_data.join("Google\\Chrome\\User Data\\Default\\Cache");
                let (s, c) = scan_dir(&chrome_cache, cancel_flag);
                browser_bytes += s;
                browser_count += c;

                let chrome_code_cache = local_app_data.join("Google\\Chrome\\User Data\\Default\\Code Cache");
                let (s, c) = scan_dir(&chrome_code_cache, cancel_flag);
                browser_bytes += s;
                browser_count += c;

                // Edge cache directories
                let edge_cache = local_app_data.join("Microsoft\\Edge\\User Data\\Default\\Cache");
                let (s, c) = scan_dir(&edge_cache, cancel_flag);
                browser_bytes += s;
                browser_count += c;

                let edge_code_cache = local_app_data.join("Microsoft\\Edge\\User Data\\Default\\Code Cache");
                let (s, c) = scan_dir(&edge_code_cache, cancel_flag);
                browser_bytes += s;
                browser_count += c;

                // Brave cache
                let brave_cache = local_app_data.join("BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache");
                let (s, c) = scan_dir(&brave_cache, cancel_flag);
                browser_bytes += s;
                browser_count += c;

                let brave_code_cache = local_app_data.join("BraveSoftware\\Brave-Browser\\User Data\\Default\\Code Cache");
                let (s, c) = scan_dir(&brave_code_cache, cancel_flag);
                browser_bytes += s;
                browser_count += c;
            }

            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }

            if browser_bytes > 0 || browser_count > 0 {
                Some(JunkItem {
                    name: "Browser Cache".to_string(),
                    size: format_size(browser_bytes),
                    bytes: browser_bytes,
                    count: browser_count,
                    color: "#7c3aed".to_string(),
                    icon: "🌐".to_string(),
                    description: "Cached web pages, images, and scripts from Chrome, Edge, and Brave. Browsers will rebuild this cache as needed.".to_string(),
                    warning: String::new(),
                    requires_admin: false,
                })
            } else {
                None
            }
        });

        // ── 3. Windows Update Cache (Admin) ───────────────────────────────
        let t3 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut item = None;
            if is_admin {
                let soft_dist = PathBuf::from("C:\\Windows\\SoftwareDistribution\\Download");
                let (s, c) = scan_dir(&soft_dist, cancel_flag);
                if s > 0 || c > 0 {
                    item = Some(JunkItem {
                        name: "Windows Update Cache".to_string(),
                        size: format_size(s),
                        bytes: s,
                        count: c,
                        color: "#10b981".to_string(),
                        icon: "🔄".to_string(),
                        description: "Downloaded update packages that Windows no longer needs after successful installation.".to_string(),
                        warning: "Removing may cause Windows to re-download updates if they haven't been applied yet.".to_string(),
                        requires_admin: true,
                    });
                }
            }
            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }
            item
        });

        // ── 4. Crash Dumps & Logs ─────────────────────────────────────────
        let t4 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut dump_bytes = 0u64;
            let mut dump_count = 0usize;
            if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
                let crash_dumps = PathBuf::from(local_app_data).join("CrashDumps");
                let (s, c) = scan_dir(&crash_dumps, cancel_flag);
                dump_bytes += s;
                dump_count += c;
            }
            if is_admin {
                let minidump = PathBuf::from("C:\\Windows\\Minidump");
                let (s, c) = scan_dir(&minidump, cancel_flag);
                dump_bytes += s;
                dump_count += c;
            }

            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }

            if dump_bytes > 0 || dump_count > 0 {
                Some(JunkItem {
                    name: "Crash Dumps & Logs".to_string(),
                    size: format_size(dump_bytes),
                    bytes: dump_bytes,
                    count: dump_count,
                    color: "#f43f5e".to_string(),
                    icon: "🪵".to_string(),
                    description: "Memory dump files generated when applications or Windows crash. Only needed for debugging.".to_string(),
                    warning: String::new(),
                    requires_admin: false,
                })
            } else {
                None
            }
        });

        // ── 5. Recycle Bin ────────────────────────────────────────────────
        let t5 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let (rb_bytes, rb_count) = get_recycle_bin_size();
            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }
            if rb_bytes > 0 || rb_count > 0 {
                Some(JunkItem {
                    name: "Recycle Bin".to_string(),
                    size: format_size(rb_bytes),
                    bytes: rb_bytes,
                    count: rb_count,
                    color: "#64748b".to_string(),
                    icon: "♻️".to_string(),
                    description: "Files you've previously deleted that are sitting in the Recycle Bin across all drives.".to_string(),
                    warning: "This action is irreversible. Files will be permanently deleted and cannot be recovered.".to_string(),
                    requires_admin: false,
                })
            } else {
                None
            }
        });

        // ── 6. Windows Prefetch (Admin) ───────────────────────────────────
        let t6 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut item = None;
            if is_admin {
                let prefetch = PathBuf::from("C:\\Windows\\Prefetch");
                let (s, c) = scan_dir(&prefetch, cancel_flag);
                if s > 0 || c > 0 {
                    item = Some(JunkItem {
                        name: "Windows Prefetch".to_string(),
                        size: format_size(s),
                        bytes: s,
                        count: c,
                        color: "#0ea5e9".to_string(),
                        icon: "⚡".to_string(),
                        description: "Application launch optimization data. Windows will rebuild this automatically.".to_string(),
                        warning: "First app launches after cleaning may be slightly slower while Windows rebuilds the prefetch data.".to_string(),
                        requires_admin: true,
                    });
                }
            }
            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }
            item
        });

        // ── 7. Thumbnail Cache ────────────────────────────────────────────
        let t7 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut item = None;
            if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
                let explorer_dir = PathBuf::from(&local_app_data)
                    .join("Microsoft\\Windows\\Explorer");
                let (s, c) = scan_matching_children(&explorer_dir, "thumbcache", cancel_flag);
                if s > 0 || c > 0 {
                    item = Some(JunkItem {
                        name: "Thumbnail Cache".to_string(),
                        size: format_size(s),
                        bytes: s,
                        count: c,
                        color: "#ec4899".to_string(),
                        icon: "🖼️".to_string(),
                        description: "Cached thumbnail images for File Explorer. Windows will regenerate them as needed.".to_string(),
                        warning: "Some files may be locked by Explorer and will be skipped.".to_string(),
                        requires_admin: false,
                    });
                }
            }
            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }
            item
        });

        // ── 8. Windows Log Files (Admin) ──────────────────────────────────
        let t8 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut item = None;
            if is_admin {
                let logs_dir = PathBuf::from("C:\\Windows\\Logs");
                let (s, c) = scan_dir(&logs_dir, cancel_flag);
                if s > 0 || c > 0 {
                    item = Some(JunkItem {
                        name: "Windows Log Files".to_string(),
                        size: format_size(s),
                        bytes: s,
                        count: c,
                        color: "#f59e0b".to_string(),
                        icon: "📋".to_string(),
                        description: "System log files including CBS, DISM, and setup logs. Safe to remove old entries.".to_string(),
                        warning: "Removing may make it harder to diagnose recent system issues.".to_string(),
                        requires_admin: true,
                    });
                }
            }
            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }
            item
        });

        // ── 9. Font Cache ─────────────────────────────────────────────────
        let t9 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut item = None;
            if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
                let font_cache_dir = PathBuf::from(&local_app_data);
                let (s, c) = scan_matching_children(&font_cache_dir, "fontcache", cancel_flag);
                if s > 0 || c > 0 {
                    item = Some(JunkItem {
                        name: "Font Cache".to_string(),
                        size: format_size(s),
                        bytes: s,
                        count: c,
                        color: "#8b5cf6".to_string(),
                        icon: "🔤".to_string(),
                        description: "Cached font rendering data. Windows will rebuild this on next restart.".to_string(),
                        warning: String::new(),
                        requires_admin: false,
                    });
                }
            }
            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }
            item
        });

        // ── 10. DirectX Shader Cache ──────────────────────────────────────
        let t10 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut item = None;
            if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
                let shader_cache = PathBuf::from(&local_app_data).join("D3DSCache");
                let (s, c) = scan_dir(&shader_cache, cancel_flag);
                if s > 0 || c > 0 {
                    item = Some(JunkItem {
                        name: "DirectX Shader Cache".to_string(),
                        size: format_size(s),
                        bytes: s,
                        count: c,
                        color: "#06b6d4".to_string(),
                        icon: "🎮".to_string(),
                        description: "Compiled shader programs cached by DirectX. Games and apps will recompile them as needed.".to_string(),
                        warning: String::new(),
                        requires_admin: false,
                    });
                }
            }
            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }
            item
        });

        // ── 11. Windows Error Reports ─────────────────────────────────────
        let t11 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut item = None;
            if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
                let wer_dir = PathBuf::from(&local_app_data)
                    .join("Microsoft\\Windows\\WER");
                let (s, c) = scan_dir(&wer_dir, cancel_flag);
                if s > 0 || c > 0 {
                    item = Some(JunkItem {
                        name: "Windows Error Reports".to_string(),
                        size: format_size(s),
                        bytes: s,
                        count: c,
                        color: "#ef4444".to_string(),
                        icon: "⚠️".to_string(),
                        description: "Error reports generated by Windows Error Reporting. Safe to remove if issues are resolved.".to_string(),
                        warning: String::new(),
                        requires_admin: false,
                    });
                }
            }
            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }
            item
        });

        // ── 12. Delivery Optimization Cache (Admin) ───────────────────────
        let t12 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut item = None;
            if is_admin {
                let delivery_opt = PathBuf::from("C:\\Windows\\SoftwareDistribution\\DeliveryOptimization");
                let (s, c) = scan_dir(&delivery_opt, cancel_flag);
                if s > 0 || c > 0 {
                    item = Some(JunkItem {
                        name: "Delivery Optimization".to_string(),
                        size: format_size(s),
                        bytes: s,
                        count: c,
                        color: "#14b8a6".to_string(),
                        icon: "📦".to_string(),
                        description: "Cached files used by Windows to share updates with other PCs on your network.".to_string(),
                        warning: "Removing may cause Windows to re-download update data for peer sharing.".to_string(),
                        requires_admin: true,
                    });
                }
            }
            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }
            item
        });

        // ── 13. Application Cache (Discord, Teams, Steam, Riot) ───────────
        let t13 = s.spawn(|| {
            if is_cancelled() {
                let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
                if let Some(h) = app {
                    let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
                }
                return None;
            }
            let mut app_bytes = 0u64;
            let mut app_count = 0usize;

            if let Some(appdata) = std::env::var_os("APPDATA") {
                let appdata = PathBuf::from(appdata);

                // Discord cache
                let discord_cache = appdata.join("discord\\Cache");
                let (s, c) = scan_dir(&discord_cache, cancel_flag);
                app_bytes += s;
                app_count += c;

                let discord_code_cache = appdata.join("discord\\Code Cache");
                let (s, c) = scan_dir(&discord_code_cache, cancel_flag);
                app_bytes += s;
                app_count += c;

                // Microsoft Teams cache
                let teams_cache = appdata.join("Microsoft\\Teams\\Cache");
                let (s, c) = scan_dir(&teams_cache, cancel_flag);
                app_bytes += s;
                app_count += c;

                let teams_code_cache = appdata.join("Microsoft\\Teams\\Code Cache");
                let (s, c) = scan_dir(&teams_code_cache, cancel_flag);
                app_bytes += s;
                app_count += c;
            }

            if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
                let local_app_data = PathBuf::from(local_app_data);

                // Steam appcache
                let steam_cache = local_app_data.join("Steam\\htmlcache");
                let (s, c) = scan_dir(&steam_cache, cancel_flag);
                app_bytes += s;
                app_count += c;

                // Riot Games
                let riot_cache = local_app_data.join("Riot Games");
                if riot_cache.exists() {
                    let riot_logs = riot_cache.join("Riot Client\\Logs");
                    let (s, c) = scan_dir(&riot_logs, cancel_flag);
                    app_bytes += s;
                    app_count += c;

                    let riot_data = riot_cache.join("Riot Client\\Data");
                    let (s, c) = scan_dir(&riot_data, cancel_flag);
                    app_bytes += s;
                    app_count += c;
                }
            }

            let val = completed_steps.fetch_add(1, Ordering::SeqCst) + 1;
            if let Some(h) = app {
                let _ = h.emit("scan_progress", ((val as f32 / total_steps) * 100.0) as u8);
            }

            if app_bytes > 0 || app_count > 0 {
                Some(JunkItem {
                    name: "Application Cache".to_string(),
                    size: format_size(app_bytes),
                    bytes: app_bytes,
                    count: app_count,
                    color: "#a855f7".to_string(),
                    icon: "📱".to_string(),
                    description: "Cache files from Discord, Teams, Steam, and Riot Games. Apps will rebuild their cache on next launch.".to_string(),
                    warning: String::new(),
                    requires_admin: false,
                })
            } else {
                None
            }
        });

        // Collect results
        if let Some(item) = t1.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t2.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t3.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t4.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t5.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t6.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t7.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t8.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t9.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t10.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t11.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t12.join().unwrap_or(None) { results.push(item); }
        if let Some(item) = t13.join().unwrap_or(None) { results.push(item); }
    });

    Ok(results)
}


// ─── Tauri Commands ───────────────────────────────────────────────────

#[tauri::command]
pub async fn scan_junk(app: tauri::AppHandle) -> Result<Vec<JunkItem>, String> {
    // Reset the cancel flag before starting a new scan
    let cancel_state = app.state::<ScanCancelFlag>();
    cancel_state.0.store(false, Ordering::SeqCst);

    let cancel_flag = cancel_state.0.clone();
    let app_clone = app.clone();

    tauri::async_runtime::spawn_blocking(move || {
        scan_junk_internal(Some(&app_clone), Some(&cancel_flag))
    })
    .await
    .map_err(|e| format!("Scan junk thread panicked: {}", e))?
}

#[tauri::command]
pub fn cancel_scan(app: tauri::AppHandle) -> Result<String, String> {
    let cancel_state = app.state::<ScanCancelFlag>();
    cancel_state.0.store(true, Ordering::SeqCst);
    Ok("Scan cancelled".into())
}

// ─── Clean Logic ──────────────────────────────────────────────────────

pub fn clear_dir_internal(
    writer: &mut Option<BufWriter<fs::File>>,
    path: &Path,
    category: &str,
    to_trash: bool,
    time_str: &str,
    is_root: bool,
) -> (u64, usize) {
    if !path.exists() {
        return (0, 0);
    }

    let mut bytes_freed = 0u64;
    let mut files_cleaned = 0usize;

    if path.is_file() {
        let size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        let path_str = path.to_string_lossy();

        let result = if to_trash {
            move_to_trash(path).map_err(|e| e.to_string())
        } else {
            fs::remove_file(path).map_err(|e| e.to_string())
        };

        if result.is_ok() {
            bytes_freed += size;
            files_cleaned += 1;
        }

        if let Some(w) = writer.as_mut() {
            match result {
                Ok(_) => {
                    let status = if to_trash { "TRASHED" } else { "CLEANED" };
                    let _ = writeln!(
                        w,
                        "{} | {} | {} | {} | {} |",
                        time_str, status, category, format_size(size), path_str
                    );
                }
                Err(e) => {
                    let status = if e.contains("Access is denied") || e.contains("permission") {
                        "FAILED_LOCKED"
                    } else {
                        "FAILED_ERROR"
                    };
                    let _ = writeln!(
                        w,
                        "{} | {} | {} | {} | {} | {}",
                        time_str, status, category, format_size(size), path_str, e
                    );
                }
            }
        }
    } else if path.is_dir() {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let (b, f) = clear_dir_internal(writer, &entry.path(), category, to_trash, time_str, false);
                bytes_freed += b;
                files_cleaned += f;
            }
        }

        if !is_root {
            let path_str = path.to_string_lossy();
            let result = if to_trash {
                move_to_trash(path).map_err(|e| e.to_string())
            } else {
                fs::remove_dir(path).map_err(|e| e.to_string())
            };

            if let Some(w) = writer.as_mut() {
                match result {
                    Ok(_) => {
                        let status = if to_trash { "TRASHED" } else { "CLEANED" };
                        let _ = writeln!(
                            w,
                            "{} | {} | {} | 0 B | {} |",
                            time_str, status, category, path_str
                        );
                    }
                    Err(e) => {
                        let status = if e.contains("Access is denied") || e.contains("permission")
                        {
                            "FAILED_LOCKED"
                        } else {
                            "FAILED_ERROR"
                        };
                        let _ = writeln!(
                            w,
                            "{} | {} | {} | 0 B | {} | {}",
                            time_str, status, category, path_str, e
                        );
                    }
                }
            }
        }
    }

    (bytes_freed, files_cleaned)
}

pub fn clear_dir(path: &Path, to_trash: bool) -> Result<(u64, usize), String> {
    let mut dummy: Option<BufWriter<fs::File>> = None;
    let res = clear_dir_internal(&mut dummy, path, "", to_trash, "", true);
    Ok(res)
}

/// Clears all files matching a name pattern inside a parent directory.
/// Used for thumbcache_*, FontCache* files that live alongside other files.
fn clear_matching_children(
    writer: &mut Option<BufWriter<fs::File>>,
    base: &Path,
    name_contains: &str,
    category: &str,
    to_trash: bool,
    time_str: &str,
) -> (u64, usize) {
    let mut bytes_freed = 0u64;
    let mut files_cleaned = 0usize;

    if let Ok(entries) = fs::read_dir(base) {
        for entry in entries.flatten() {
            let entry_name = entry.file_name().to_string_lossy().to_lowercase();
            if entry_name.contains(name_contains) {
                let path = entry.path();
                if path.is_dir() {
                    let (b, f) = clear_dir_internal(writer, &path, category, to_trash, time_str, true);
                    bytes_freed += b;
                    files_cleaned += f;
                } else if path.is_file() {
                    let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                    let path_str = path.to_string_lossy();

                    let result = if to_trash {
                        move_to_trash(&path).map_err(|e| e.to_string())
                    } else {
                        fs::remove_file(&path).map_err(|e| e.to_string())
                    };

                    if result.is_ok() {
                        bytes_freed += size;
                        files_cleaned += 1;
                    }

                    if let Some(w) = writer.as_mut() {
                        match result {
                            Ok(_) => {
                                let status = if to_trash { "TRASHED" } else { "CLEANED" };
                                let _ = writeln!(
                                    w,
                                    "{} | {} | {} | {} | {} |",
                                    time_str, status, category, format_size(size), path_str
                                );
                            }
                            Err(e) => {
                                // Graceful: thumbcache files are often locked by Explorer.exe
                                let status = if e.contains("Access is denied")
                                    || e.contains("permission")
                                    || e.contains("being used")
                                {
                                    "FAILED_LOCKED"
                                } else {
                                    "FAILED_ERROR"
                                };
                                let _ = writeln!(
                                    w,
                                    "{} | {} | {} | {} | {} | {}",
                                    time_str, status, category, format_size(size), path_str, e
                                );
                            }
                        }
                    }
                }
            }
        }
    }
    (bytes_freed, files_cleaned)
}

/// Empties the Recycle Bin across all drives using PowerShell.
/// This operation is irreversible — caller must confirm with user first.
fn empty_recycle_bin(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
) -> (u64, usize) {
    let (rb_bytes, rb_count) = get_recycle_bin_size();
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Clear-RecycleBin -Force -ErrorAction SilentlyContinue",
        ])
        .creation_flags(0x08000000)
        .output();

    let success = match &output {
        Ok(out) => out.status.success(),
        Err(_) => false,
    };

    if let Some(w) = writer.as_mut() {
        match output {
            Ok(out) if out.status.success() => {
                let _ = writeln!(
                    w,
                    "{} | CLEANED | Recycle Bin | all drives | Emptied successfully |",
                    time_str
                );
            }
            Ok(out) => {
                let stderr = String::from_utf8_lossy(&out.stderr);
                let _ = writeln!(
                    w,
                    "{} | FAILED_ERROR | Recycle Bin | all drives | {} |",
                    time_str,
                    stderr.trim()
                );
            }
            Err(e) => {
                let _ = writeln!(
                    w,
                    "{} | FAILED_ERROR | Recycle Bin | all drives | {} |",
                    time_str, e
                );
            }
        }
    }

    if success {
        (rb_bytes, rb_count)
    } else {
        (0, 0)
    }
}

#[derive(Clone, Serialize)]
pub struct CleanResult {
    pub bytes_freed: u64,
    pub files_cleaned: usize,
}

pub fn clean_junk_internal(
    app: &tauri::AppHandle,
    categories: Vec<String>,
    emit_progress: bool,
) -> Result<CleanResult, String> {
    let is_admin = is_elevated::is_elevated();

    let mut total_bytes_freed = 0u64;
    let mut total_files_cleaned = 0usize;

    let mut writer: Option<BufWriter<fs::File>> = None;
    let mut time_str = String::new();

    if let Ok(app_data) = app.path().app_data_dir() {
        let _ = fs::create_dir_all(&app_data);
        let log_path = app_data.join("cleaner_audit.log");
        if let Ok(file) = fs::OpenOptions::new().create(true).append(true).open(&log_path) {
            writer = Some(BufWriter::new(file));
        }
    }

    if writer.is_some() {
        time_str = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    }

    // Return early if there's nothing to clean
    if categories.is_empty() {
        if emit_progress {
            let _ = app.emit("clean_progress", 100u8);
        }
        return Ok(CleanResult {
            bytes_freed: 0,
            files_cleaned: 0,
        });
    }

    let total_steps = categories.len() as f32;
    let mut current_step = 0.0f32;

    // ── Clean: Windows Temp Files ──────────────────────────────────────
    if categories.contains(&"Windows Temp Files".to_string()) {
        let (b, f) = clear_dir_internal(
            &mut writer,
            &std::env::temp_dir(),
            "Windows Temp Files",
            false,
            &time_str,
            true,
        );
        total_bytes_freed += b;
        total_files_cleaned += f;

        if is_admin {
            let (b, f) = clear_dir_internal(
                &mut writer,
                &PathBuf::from("C:\\Windows\\Temp"),
                "Windows Temp Files",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: Browser Cache ──────────────────────────────────────────
    if categories.contains(&"Browser Cache".to_string()) {
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            let local_app_data = PathBuf::from(local_app_data);
            // Chrome
            let (b, f) = clear_dir_internal(
                &mut writer,
                &local_app_data.join("Google\\Chrome\\User Data\\Default\\Cache"),
                "Browser Cache",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;

            let (b, f) = clear_dir_internal(
                &mut writer,
                &local_app_data.join("Google\\Chrome\\User Data\\Default\\Code Cache"),
                "Browser Cache",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;

            // Edge
            let (b, f) = clear_dir_internal(
                &mut writer,
                &local_app_data.join("Microsoft\\Edge\\User Data\\Default\\Cache"),
                "Browser Cache",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;

            let (b, f) = clear_dir_internal(
                &mut writer,
                &local_app_data.join("Microsoft\\Edge\\User Data\\Default\\Code Cache"),
                "Browser Cache",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;

            // Brave
            let (b, f) = clear_dir_internal(
                &mut writer,
                &local_app_data.join("BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache"),
                "Browser Cache",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;

            let (b, f) = clear_dir_internal(
                &mut writer,
                &local_app_data.join("BraveSoftware\\Brave-Browser\\User Data\\Default\\Code Cache"),
                "Browser Cache",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: Windows Update Cache ───────────────────────────────────
    if categories.contains(&"Windows Update Cache".to_string()) {
        if is_admin {
            let (b, f) = clear_dir_internal(
                &mut writer,
                &PathBuf::from("C:\\Windows\\SoftwareDistribution\\Download"),
                "Windows Update Cache",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: Crash Dumps & Logs ─────────────────────────────────────
    if categories.contains(&"Crash Dumps & Logs".to_string()) {
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            let (b, f) = clear_dir_internal(
                &mut writer,
                &PathBuf::from(local_app_data).join("CrashDumps"),
                "Crash Dumps & Logs",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        if is_admin {
            let (b, f) = clear_dir_internal(
                &mut writer,
                &PathBuf::from("C:\\Windows\\Minidump"),
                "Crash Dumps & Logs",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: Recycle Bin ─────────────────────────────────────────────
    if categories.contains(&"Recycle Bin".to_string()) {
        let (b, f) = empty_recycle_bin(&mut writer, &time_str);
        total_bytes_freed += b;
        total_files_cleaned += f;
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: Windows Prefetch ───────────────────────────────────────
    if categories.contains(&"Windows Prefetch".to_string()) {
        if is_admin {
            let (b, f) = clear_dir_internal(
                &mut writer,
                &PathBuf::from("C:\\Windows\\Prefetch"),
                "Windows Prefetch",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: Thumbnail Cache ────────────────────────────────────────
    if categories.contains(&"Thumbnail Cache".to_string()) {
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            let explorer_dir = PathBuf::from(&local_app_data).join("Microsoft\\Windows\\Explorer");
            let (b, f) = clear_matching_children(
                &mut writer,
                &explorer_dir,
                "thumbcache",
                "Thumbnail Cache",
                false,
                &time_str,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: Windows Log Files ──────────────────────────────────────
    if categories.contains(&"Windows Log Files".to_string()) {
        if is_admin {
            let (b, f) = clear_dir_internal(
                &mut writer,
                &PathBuf::from("C:\\Windows\\Logs"),
                "Windows Log Files",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: Font Cache ─────────────────────────────────────────────
    if categories.contains(&"Font Cache".to_string()) {
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            let font_cache_dir = PathBuf::from(&local_app_data);
            let (b, f) = clear_matching_children(
                &mut writer,
                &font_cache_dir,
                "fontcache",
                "Font Cache",
                false,
                &time_str,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: DirectX Shader Cache ───────────────────────────────────
    if categories.contains(&"DirectX Shader Cache".to_string()) {
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            let (b, f) = clear_dir_internal(
                &mut writer,
                &PathBuf::from(local_app_data).join("D3DSCache"),
                "DirectX Shader Cache",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: Windows Error Reports ──────────────────────────────────
    if categories.contains(&"Windows Error Reports".to_string()) {
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            let (b, f) = clear_dir_internal(
                &mut writer,
                &PathBuf::from(local_app_data).join("Microsoft\\Windows\\WER"),
                "Windows Error Reports",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: Delivery Optimization ──────────────────────────────────
    if categories.contains(&"Delivery Optimization".to_string()) {
        if is_admin {
            let (b, f) = clear_dir_internal(
                &mut writer,
                &PathBuf::from("C:\\Windows\\SoftwareDistribution\\DeliveryOptimization"),
                "Delivery Optimization",
                false,
                &time_str,
                true,
            );
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    // ── Clean: Application Cache ──────────────────────────────────────
    if categories.contains(&"Application Cache".to_string()) {
        if let Some(appdata) = std::env::var_os("APPDATA") {
            let appdata = PathBuf::from(appdata);
            let (b, f) = clear_dir_internal(&mut writer, &appdata.join("discord\\Cache"), "Application Cache", false, &time_str, true);
            total_bytes_freed += b;
            total_files_cleaned += f;

            let (b, f) = clear_dir_internal(&mut writer, &appdata.join("discord\\Code Cache"), "Application Cache", false, &time_str, true);
            total_bytes_freed += b;
            total_files_cleaned += f;

            let (b, f) = clear_dir_internal(&mut writer, &appdata.join("Microsoft\\Teams\\Cache"), "Application Cache", false, &time_str, true);
            total_bytes_freed += b;
            total_files_cleaned += f;

            let (b, f) = clear_dir_internal(&mut writer, &appdata.join("Microsoft\\Teams\\Code Cache"), "Application Cache", false, &time_str, true);
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            let local_app_data = PathBuf::from(local_app_data);
            let (b, f) = clear_dir_internal(&mut writer, &local_app_data.join("Steam\\htmlcache"), "Application Cache", false, &time_str, true);
            total_bytes_freed += b;
            total_files_cleaned += f;

            let (b, f) = clear_dir_internal(&mut writer, &local_app_data.join("Riot Games\\Riot Client\\Logs"), "Application Cache", false, &time_str, true);
            total_bytes_freed += b;
            total_files_cleaned += f;

            let (b, f) = clear_dir_internal(&mut writer, &local_app_data.join("Riot Games\\Riot Client\\Data"), "Application Cache", false, &time_str, true);
            total_bytes_freed += b;
            total_files_cleaned += f;
        }
        current_step += 1.0;
        if emit_progress && total_steps > 0.0 {
            let _ = app.emit("clean_progress", ((current_step / total_steps) * 100.0) as u8);
        }
    }

    if let Some(mut w) = writer {
        let _ = w.flush();
    }

    Ok(CleanResult {
        bytes_freed: total_bytes_freed,
        files_cleaned: total_files_cleaned,
    })
}

#[tauri::command]
pub async fn clean_junk(
    app: tauri::AppHandle,
    categories: Vec<String>,
) -> Result<CleanResult, String> {
    let app_clone = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        clean_junk_internal(&app_clone, categories, true)
    })
    .await
    .map_err(|e| format!("Clean junk thread panicked: {}", e))?
}

#[tauri::command]
pub fn open_cleaner_audit_log(app: tauri::AppHandle) -> Result<String, String> {
    if let Ok(app_data) = app.path().app_data_dir() {
        let log_path = app_data.join("cleaner_audit.log");
        if log_path.exists() {
            std::process::Command::new("notepad.exe")
                .arg(log_path)
                .spawn()
                .map_err(|e| e.to_string())?;
            return Ok("Opened cleaner_audit.log".into());
        }
    }
    Err("Audit log file does not exist yet. Run a cleanup first.".into())
}

// ─── Silent Clean (for --silent-clean CLI) ────────────────────────────

pub fn run_silent_clean(app_handle: &tauri::AppHandle) {
    let start_time = std::time::Instant::now();

    // 1. Scan first to find how much space can be freed (no cancel for silent mode)
    let scan_results = scan_junk_internal(None, None).unwrap_or_default();

    let categories: Vec<String> = scan_results.iter().map(|item| item.name.clone()).collect();

    // 2. Perform the clean
    let clean_res = clean_junk_internal(app_handle, categories, false)
        .unwrap_or(CleanResult { bytes_freed: 0, files_cleaned: 0 });

    let duration = start_time.elapsed().as_secs_f64();
    let duration_str = format!("{:.1}s", duration);

    let freed_str = if clean_res.bytes_freed > 1073741824 {
        format!("{:.2} GB", clean_res.bytes_freed as f64 / 1073741824.0)
    } else {
        format!("{:.1} MB", clean_res.bytes_freed as f64 / 1048576.0)
    };

    // 3. Write log to history.json
    if let Ok(app_data) = app_handle.path().app_data_dir() {
        let history_path = app_data.join("history.json");

        let _ = fs::create_dir_all(&app_data);

        let mut logs: Vec<serde_json::Value> = Vec::new();
        if let Ok(file_content) = fs::read_to_string(&history_path) {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&file_content) {
                if let Some(existing_logs) = parsed.get("logs").and_then(|l| l.as_array()) {
                    logs = existing_logs.clone();
                }
            }
        }

        let time_str = chrono::Local::now().format("%b %d, %Y, %I:%M %p").to_string();

        let new_log = serde_json::json!({
            "date": time_str,
            "freed": freed_str,
            "fixed": clean_res.files_cleaned,
            "duration": duration_str,
            "type": "Auto Clean"
        });

        logs.insert(0, new_log);

        let output_json = serde_json::json!({
            "logs": logs
        });

        if let Ok(serialized) = serde_json::to_string_pretty(&output_json) {
            let _ = fs::write(&history_path, serialized);
        }
    }

    println!(
        "Silent Clean Completed. Freed {} across {} files in {:.1}s.",
        freed_str, clean_res.files_cleaned, duration
    );
}

// ─── Unit Tests ───────────────────────────────────────────────────────

