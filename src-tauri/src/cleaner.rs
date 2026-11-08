// cleaner.rs — Modularized junk scan & clean logic for CPulse
//
// Single source of truth for all 13 junk categories. Both scan and clean
// operate on the unified CATEGORIES registry to eliminate duplicate definitions,
// divergent category names, and repeated progress emission boilerplate.

use serde::Serialize;
use std::fs;
use std::io::{BufWriter, Write};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{Emitter, Manager};
use trash::delete as move_to_trash;

// ─── Safeguard Constants ──────────────────────────────────────────────
pub const MAX_FILES: usize = 100_000;
pub const MAX_DEPTH: usize = 20;
const MAX_PATH_LEN: usize = 4096;
const CREATE_NO_WINDOW: u32 = 0x08000000;

// ─── Cancel Scan State ────────────────────────────────────────────────
pub struct ScanCancelFlag(pub Arc<AtomicBool>);

impl Default for ScanCancelFlag {
    fn default() -> Self {
        ScanCancelFlag(Arc::new(AtomicBool::new(false)))
    }
}

// ─── Data Structures ──────────────────────────────────────────────────

#[derive(Clone, Serialize, Debug, PartialEq)]
pub struct JunkItem {
    pub name: String,
    pub size: String,
    pub bytes: u64,
    pub count: usize,
    pub description: String,
    pub warning: String,
    pub requires_admin: bool,
}

#[derive(Clone, Serialize, Debug, Default)]
pub struct CleanResult {
    pub bytes_freed: u64,
    pub files_cleaned: usize,
}

// ─── Size Formatter ───────────────────────────────────────────────────

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

// ─── Directory Walking & Safeguards ───────────────────────────────────

pub fn get_dir_size_and_count(
    path: &Path,
    cancel_flag: Option<&AtomicBool>,
    depth: usize,
    file_count: &mut usize,
) -> (u64, usize) {
    if depth > MAX_DEPTH || *file_count >= MAX_FILES {
        return (0, 0);
    }

    if let Some(flag) = cancel_flag {
        if flag.load(Ordering::Relaxed) {
            return (0, 0);
        }
    }

    let mut size = 0u64;
    let mut count = 0usize;

    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return (0, 0),
    };

    for entry in entries.flatten() {
        if let Some(flag) = cancel_flag {
            if flag.load(Ordering::Relaxed) {
                return (size, count);
            }
        }

        if *file_count >= MAX_FILES {
            return (size, count);
        }

        let entry_path = entry.path();
        if entry_path.to_string_lossy().len() > MAX_PATH_LEN {
            continue;
        }

        if let Ok(metadata) = entry.metadata() {
            if metadata.is_dir() {
                let (s, c) =
                    get_dir_size_and_count(&entry_path, cancel_flag, depth + 1, file_count);
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

pub fn scan_dir(path: &Path, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    let mut file_count = 0usize;
    get_dir_size_and_count(path, cancel_flag, 0, &mut file_count)
}

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
             Write-Output \"$totalSize|$count\"",
        ])
        .creation_flags(CREATE_NO_WINDOW)
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

// ─── File Deletion and Audit Logging ─────────────────────────────────

pub fn classify_audit_error(err_str: &str) -> &'static str {
    let lower = err_str.to_lowercase();
    if lower.contains("access is denied")
        || lower.contains("permission")
        || lower.contains("being used")
        || lower.contains("used by another process")
        || lower.contains("sharing violation")
        || lower.contains("locked")
    {
        "FAILED_LOCKED"
    } else {
        "FAILED_ERROR"
    }
}

fn delete_file_and_log(
    writer: &mut Option<BufWriter<fs::File>>,
    path: &Path,
    category: &str,
    to_trash: bool,
    time_str: &str,
) -> (u64, usize) {
    let size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    let path_str = path.to_string_lossy();

    let result = if to_trash {
        move_to_trash(path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())
    };

    let mut freed = 0;
    let mut cleaned = 0;
    if result.is_ok() {
        freed = size;
        cleaned = 1;
    }

    if let Some(w) = writer.as_mut() {
        match result {
            Ok(_) => {
                let status = if to_trash { "TRASHED" } else { "CLEANED" };
                let _ = writeln!(
                    w,
                    "{} | {} | {} | {} | {} |",
                    time_str,
                    status,
                    category,
                    format_size(size),
                    path_str
                );
            }
            Err(e) => {
                let status = classify_audit_error(&e);
                let _ = writeln!(
                    w,
                    "{} | {} | {} | {} | {} | {}",
                    time_str,
                    status,
                    category,
                    format_size(size),
                    path_str,
                    e
                );
            }
        }
    }

    (freed, cleaned)
}

pub fn clear_dir_internal(
    writer: &mut Option<BufWriter<fs::File>>,
    path: &Path,
    category: &str,
    to_trash: bool,
    time_str: &str,
    is_root: bool,
) -> (u64, usize) {
    let mut bytes_freed = 0u64;
    let mut files_cleaned = 0usize;

    if path.is_file() {
        return delete_file_and_log(writer, path, category, to_trash, time_str);
    } else if path.is_dir() {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let (b, f) =
                    clear_dir_internal(writer, &entry.path(), category, to_trash, time_str, false);
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
                        let status = classify_audit_error(&e);
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
                    let (b, f) =
                        clear_dir_internal(writer, &path, category, to_trash, time_str, true);
                    bytes_freed += b;
                    files_cleaned += f;
                } else if path.is_file() {
                    let (b, f) = delete_file_and_log(writer, &path, category, to_trash, time_str);
                    bytes_freed += b;
                    files_cleaned += f;
                }
            }
        }
    }

    (bytes_freed, files_cleaned)
}

fn empty_recycle_bin(writer: &mut Option<BufWriter<fs::File>>, time_str: &str) -> (u64, usize) {
    let (before_bytes, before_count) = get_recycle_bin_size();
    if before_bytes == 0 && before_count == 0 {
        return (0, 0);
    }

    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "try { Clear-RecycleBin -Force -ErrorAction Stop; Write-Output 'SUCCESS' } catch { Write-Error $_; exit 1 }",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    let success = match &output {
        Ok(out) => out.status.success() && String::from_utf8_lossy(&out.stdout).contains("SUCCESS"),
        Err(_) => false,
    };

    let (after_bytes, after_count) = get_recycle_bin_size();
    let freed_bytes = before_bytes.saturating_sub(after_bytes);
    let freed_count = before_count.saturating_sub(after_count);

    if let Some(w) = writer.as_mut() {
        match output {
            Ok(out) if out.status.success() => {
                let _ = writeln!(
                    w,
                    "{} | CLEANED | Recycle Bin | {} | Emptied successfully (freed {}) |",
                    time_str,
                    format_size(freed_bytes),
                    format_size(freed_bytes)
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
        let actual_freed_b = if after_bytes == 0 { before_bytes } else { freed_bytes };
        let actual_freed_c = if after_count == 0 { before_count } else { freed_count };
        (actual_freed_b, actual_freed_c)
    } else {
        (0, 0)
    }
}

// ─── Unified Category Definitions (Single Source of Truth) ───────────

pub struct CategoryDef {
    pub name: &'static str,
    pub description: &'static str,
    pub warning: &'static str,
    pub requires_admin: bool,
    pub scan: fn(is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize),
    pub clean: fn(
        writer: &mut Option<BufWriter<fs::File>>,
        time_str: &str,
        is_admin: bool,
    ) -> (u64, usize),
}

// 1. Windows Temp Files
fn scan_win_temp(is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    let mut bytes = 0;
    let mut count = 0;
    let (s, c) = scan_dir(&std::env::temp_dir(), cancel_flag);
    bytes += s;
    count += c;
    if is_admin {
        let (s, c) = scan_dir(&PathBuf::from("C:\\Windows\\Temp"), cancel_flag);
        bytes += s;
        count += c;
    }
    (bytes, count)
}

fn clean_win_temp(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    is_admin: bool,
) -> (u64, usize) {
    let mut bytes = 0;
    let mut count = 0;
    let (b, f) = clear_dir_internal(
        writer,
        &std::env::temp_dir(),
        "Windows Temp Files",
        false,
        time_str,
        true,
    );
    bytes += b;
    count += f;
    if is_admin {
        let (b, f) = clear_dir_internal(
            writer,
            &PathBuf::from("C:\\Windows\\Temp"),
            "Windows Temp Files",
            false,
            time_str,
            true,
        );
        bytes += b;
        count += f;
    }
    (bytes, count)
}

// 2. Browser Cache
fn get_browser_cache_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        let lad = PathBuf::from(local_app_data);
        paths.push(lad.join("Google\\Chrome\\User Data\\Default\\Cache"));
        paths.push(lad.join("Google\\Chrome\\User Data\\Default\\Code Cache"));
        paths.push(lad.join("Microsoft\\Edge\\User Data\\Default\\Cache"));
        paths.push(lad.join("Microsoft\\Edge\\User Data\\Default\\Code Cache"));
        paths.push(lad.join("BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache"));
        paths.push(lad.join("BraveSoftware\\Brave-Browser\\User Data\\Default\\Code Cache"));
    }
    paths
}

fn scan_browser_cache(_is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    let mut bytes = 0;
    let mut count = 0;
    for p in get_browser_cache_paths() {
        let (s, c) = scan_dir(&p, cancel_flag);
        bytes += s;
        count += c;
    }
    (bytes, count)
}

fn clean_browser_cache(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    _is_admin: bool,
) -> (u64, usize) {
    let mut bytes = 0;
    let mut count = 0;
    for p in get_browser_cache_paths() {
        let (b, f) = clear_dir_internal(writer, &p, "Browser Cache", false, time_str, true);
        bytes += b;
        count += f;
    }
    (bytes, count)
}

// 3. Windows Update Cache
fn scan_win_update(is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    scan_dir(
        &PathBuf::from("C:\\Windows\\SoftwareDistribution\\Download"),
        cancel_flag,
    )
}

fn clean_win_update(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    is_admin: bool,
) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    clear_dir_internal(
        writer,
        &PathBuf::from("C:\\Windows\\SoftwareDistribution\\Download"),
        "Windows Update Cache",
        false,
        time_str,
        true,
    )
}

// 4. System Log Files
fn scan_system_logs(is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    scan_dir(&PathBuf::from("C:\\Windows\\Logs"), cancel_flag)
}

fn clean_system_logs(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    is_admin: bool,
) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    clear_dir_internal(
        writer,
        &PathBuf::from("C:\\Windows\\Logs"),
        "System Log Files",
        false,
        time_str,
        true,
    )
}

// 5. Thumbnail Cache
fn get_thumbcache_dir() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA")
        .map(|lad| PathBuf::from(lad).join("Microsoft\\Windows\\Explorer"))
}

fn scan_thumbcache(_is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    if let Some(dir) = get_thumbcache_dir() {
        scan_matching_children(&dir, "thumbcache_", cancel_flag)
    } else {
        (0, 0)
    }
}

fn clean_thumbcache(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    _is_admin: bool,
) -> (u64, usize) {
    if let Some(dir) = get_thumbcache_dir() {
        clear_matching_children(
            writer,
            &dir,
            "thumbcache_",
            "Thumbnail Cache",
            false,
            time_str,
        )
    } else {
        (0, 0)
    }
}

// 6. Windows Error Reports
fn scan_wer(is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    let mut bytes = 0;
    let mut count = 0;
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        let p = PathBuf::from(local_app_data).join("Microsoft\\Windows\\WER");
        let (s, c) = scan_dir(&p, cancel_flag);
        bytes += s;
        count += c;
    }
    if is_admin {
        let p = PathBuf::from("C:\\ProgramData\\Microsoft\\Windows\\WER");
        let (s, c) = scan_dir(&p, cancel_flag);
        bytes += s;
        count += c;
    }
    (bytes, count)
}

fn clean_wer(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    is_admin: bool,
) -> (u64, usize) {
    let mut bytes = 0;
    let mut count = 0;
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        let p = PathBuf::from(local_app_data).join("Microsoft\\Windows\\WER");
        let (b, f) = clear_dir_internal(writer, &p, "Windows Error Reports", false, time_str, true);
        bytes += b;
        count += f;
    }
    if is_admin {
        let p = PathBuf::from("C:\\ProgramData\\Microsoft\\Windows\\WER");
        let (b, f) = clear_dir_internal(writer, &p, "Windows Error Reports", false, time_str, true);
        bytes += b;
        count += f;
    }
    (bytes, count)
}

// 7. Delivery Optimization Files
fn scan_delivery_opt(is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    scan_dir(
        &PathBuf::from("C:\\Windows\\SoftwareDistribution\\DeliveryOptimization"),
        cancel_flag,
    )
}

fn clean_delivery_opt(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    is_admin: bool,
) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    clear_dir_internal(
        writer,
        &PathBuf::from("C:\\Windows\\SoftwareDistribution\\DeliveryOptimization"),
        "Delivery Optimization Files",
        false,
        time_str,
        true,
    )
}

// 8. Temporary Setup Files
fn scan_setup_files(is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    let mut bytes = 0;
    let mut count = 0;
    for p in ["C:\\$WINDOWS.~BT", "C:\\Windows\\Panther"] {
        let (s, c) = scan_dir(&PathBuf::from(p), cancel_flag);
        bytes += s;
        count += c;
    }
    (bytes, count)
}

fn clean_setup_files(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    is_admin: bool,
) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    let mut bytes = 0;
    let mut count = 0;
    for p in ["C:\\$WINDOWS.~BT", "C:\\Windows\\Panther"] {
        let (b, f) = clear_dir_internal(
            writer,
            &PathBuf::from(p),
            "Temporary Setup Files",
            false,
            time_str,
            true,
        );
        bytes += b;
        count += f;
    }
    (bytes, count)
}

// 9. Prefetch Cache
fn scan_prefetch(is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    scan_dir(&PathBuf::from("C:\\Windows\\Prefetch"), cancel_flag)
}

fn clean_prefetch(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    is_admin: bool,
) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    clear_dir_internal(
        writer,
        &PathBuf::from("C:\\Windows\\Prefetch"),
        "Prefetch Cache",
        false,
        time_str,
        true,
    )
}

// 10. DirectX Shader Cache
fn scan_shader_cache(_is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        scan_dir(
            &PathBuf::from(local_app_data).join("D3DSCache"),
            cancel_flag,
        )
    } else {
        (0, 0)
    }
}

fn clean_shader_cache(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    _is_admin: bool,
) -> (u64, usize) {
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        clear_dir_internal(
            writer,
            &PathBuf::from(local_app_data).join("D3DSCache"),
            "DirectX Shader Cache",
            false,
            time_str,
            true,
        )
    } else {
        (0, 0)
    }
}

// 11. Recycle Bin
fn scan_recycle_bin(_is_admin: bool, _cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    get_recycle_bin_size()
}

fn clean_recycle_bin(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    _is_admin: bool,
) -> (u64, usize) {
    empty_recycle_bin(writer, time_str)
}

// 12. Memory Dumps
fn scan_memory_dumps(is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    let mut bytes = 0;
    let mut count = 0;
    let (s, c) = scan_dir(&PathBuf::from("C:\\Windows\\Minidump"), cancel_flag);
    bytes += s;
    count += c;
    let dump_file = PathBuf::from("C:\\Windows\\MEMORY.DMP");
    if dump_file.is_file() {
        if let Ok(meta) = fs::metadata(&dump_file) {
            bytes += meta.len();
            count += 1;
        }
    }
    (bytes, count)
}

fn clean_memory_dumps(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    is_admin: bool,
) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    let mut bytes = 0;
    let mut count = 0;
    let (b, f) = clear_dir_internal(
        writer,
        &PathBuf::from("C:\\Windows\\Minidump"),
        "Memory Dumps",
        false,
        time_str,
        true,
    );
    bytes += b;
    count += f;
    let (b, f) = delete_file_and_log(
        writer,
        &PathBuf::from("C:\\Windows\\MEMORY.DMP"),
        "Memory Dumps",
        false,
        time_str,
    );
    bytes += b;
    count += f;
    (bytes, count)
}

// 13. Font Cache
fn scan_font_cache(is_admin: bool, cancel_flag: Option<&AtomicBool>) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    let mut bytes = 0;
    let mut count = 0;
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        let (s, c) = scan_dir(&PathBuf::from(local_app_data).join("FontCache"), cancel_flag);
        bytes += s;
        count += c;
    }
    let p = PathBuf::from("C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Local\\FontCache");
    let (s, c) = scan_dir(&p, cancel_flag);
    bytes += s;
    count += c;
    (bytes, count)
}

fn clean_font_cache(
    writer: &mut Option<BufWriter<fs::File>>,
    time_str: &str,
    is_admin: bool,
) -> (u64, usize) {
    if !is_admin {
        return (0, 0);
    }
    let mut bytes = 0;
    let mut count = 0;
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        let (b, f) = clear_dir_internal(
            writer,
            &PathBuf::from(local_app_data).join("FontCache"),
            "Font Cache",
            false,
            time_str,
            true,
        );
        bytes += b;
        count += f;
    }
    let p = PathBuf::from("C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Local\\FontCache");
    let (b, f) = clear_dir_internal(writer, &p, "Font Cache", false, time_str, true);
    bytes += b;
    count += f;
    (bytes, count)
}

pub static CATEGORIES: &[CategoryDef] = &[
    CategoryDef {
        name: "Windows Temp Files",
        description: "Temporary files created by Windows and applications during normal operation.",
        warning: "",
        requires_admin: false,
        scan: scan_win_temp,
        clean: clean_win_temp,
    },
    CategoryDef {
        name: "Browser Cache",
        description: "Cached web pages, images, and script files from Chrome, Edge, and Brave.",
        warning: "",
        requires_admin: false,
        scan: scan_browser_cache,
        clean: clean_browser_cache,
    },
    CategoryDef {
        name: "Windows Update Cache",
        description: "Downloaded update packages and installer caches.",
        warning: "Clearing may delay installation of pending updates",
        requires_admin: true,
        scan: scan_win_update,
        clean: clean_win_update,
    },
    CategoryDef {
        name: "System Log Files",
        description: "System and setup event log files.",
        warning: "",
        requires_admin: true,
        scan: scan_system_logs,
        clean: clean_system_logs,
    },
    CategoryDef {
        name: "Thumbnail Cache",
        description: "Explorer thumbnail cache databases.",
        warning: "",
        requires_admin: false,
        scan: scan_thumbcache,
        clean: clean_thumbcache,
    },
    CategoryDef {
        name: "Windows Error Reports",
        description: "Crash and error reports generated by Windows Error Reporting.",
        warning: "",
        requires_admin: false,
        scan: scan_wer,
        clean: clean_wer,
    },
    CategoryDef {
        name: "Delivery Optimization Files",
        description: "Peer-to-peer Windows Update delivery cache.",
        warning: "",
        requires_admin: true,
        scan: scan_delivery_opt,
        clean: clean_delivery_opt,
    },
    CategoryDef {
        name: "Temporary Setup Files",
        description: "Installation and driver setup leftover files.",
        warning: "",
        requires_admin: true,
        scan: scan_setup_files,
        clean: clean_setup_files,
    },
    CategoryDef {
        name: "Prefetch Cache",
        description: "System prefetch files used to speed up initial app launch.",
        warning: "May temporarily slow down initial launch of some apps",
        requires_admin: true,
        scan: scan_prefetch,
        clean: clean_prefetch,
    },
    CategoryDef {
        name: "DirectX Shader Cache",
        description: "Compiled graphics shaders to reduce stutter in games.",
        warning: "",
        requires_admin: false,
        scan: scan_shader_cache,
        clean: clean_shader_cache,
    },
    CategoryDef {
        name: "Recycle Bin",
        description: "Files moved to Recycle Bin awaiting permanent deletion.",
        warning: "Permanently deletes all items in Recycle Bin",
        requires_admin: false,
        scan: scan_recycle_bin,
        clean: clean_recycle_bin,
    },
    CategoryDef {
        name: "Memory Dumps",
        description: "Crash dump memory files from BSODs.",
        warning: "",
        requires_admin: true,
        scan: scan_memory_dumps,
        clean: clean_memory_dumps,
    },
    CategoryDef {
        name: "Font Cache",
        description: "Windows font rendering cache files.",
        warning: "",
        requires_admin: true,
        scan: scan_font_cache,
        clean: clean_font_cache,
    },
];

// ─── Scan Logic ───────────────────────────────────────────────────────

pub fn scan_junk_internal(
    app: Option<&tauri::AppHandle>,
    cancel_flag: Option<&AtomicBool>,
) -> Result<Vec<JunkItem>, String> {
    let is_admin = is_elevated::is_elevated();
    let total_steps = CATEGORIES.len() as f32;
    let mut results = Vec::new();

    for (index, cat) in CATEGORIES.iter().enumerate() {
        if let Some(flag) = cancel_flag {
            if flag.load(Ordering::Relaxed) {
                break;
            }
        }

        let (bytes, count) = (cat.scan)(is_admin, cancel_flag);

        if bytes > 0 || count > 0 {
            results.push(JunkItem {
                name: cat.name.to_string(),
                size: format_size(bytes),
                bytes,
                count,
                description: cat.description.to_string(),
                warning: cat.warning.to_string(),
                requires_admin: cat.requires_admin,
            });
        }

        if let Some(h) = app {
            let pct = (((index + 1) as f32 / total_steps) * 100.0).clamp(0.0, 100.0) as u8;
            let _ = h.emit("scan_progress", pct);
        }
    }

    Ok(results)
}

// ─── Clean Logic ──────────────────────────────────────────────────────

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
        if let Ok(file) = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
        {
            writer = Some(BufWriter::new(file));
        }
    }

    if writer.is_some() {
        time_str = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    }

    if categories.is_empty() {
        if emit_progress {
            let _ = app.emit("clean_progress", 100u8);
        }
        return Ok(CleanResult {
            bytes_freed: 0,
            files_cleaned: 0,
        });
    }

    // Filter categories that match our registry
    let target_categories: Vec<&CategoryDef> = CATEGORIES
        .iter()
        .filter(|cat| categories.iter().any(|c| c == cat.name))
        .collect();

    let total_steps = target_categories.len() as f32;

    for (index, cat) in target_categories.iter().enumerate() {
        let (freed_b, freed_f) = (cat.clean)(&mut writer, &time_str, is_admin);
        total_bytes_freed += freed_b;
        total_files_cleaned += freed_f;

        if emit_progress && total_steps > 0.0 {
            let pct = (((index + 1) as f32 / total_steps) * 100.0).clamp(0.0, 100.0) as u8;
            let _ = app.emit("clean_progress", pct);
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

// ─── Tauri Command Handlers ──────────────────────────────────────────

#[tauri::command]
pub async fn scan_junk(
    app: tauri::AppHandle,
    state: tauri::State<'_, ScanCancelFlag>,
) -> Result<Vec<JunkItem>, String> {
    state.0.store(false, Ordering::Relaxed);
    let cancel = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || scan_junk_internal(Some(&app), Some(&cancel)))
        .await
        .map_err(|e| format!("Scan failed: {}", e))?
}

#[tauri::command]
pub async fn clean_junk(
    app: tauri::AppHandle,
    categories: Vec<String>,
) -> Result<CleanResult, String> {
    tauri::async_runtime::spawn_blocking(move || clean_junk_internal(&app, categories, true))
        .await
        .map_err(|e| format!("Cleanup failed: {}", e))?
}

#[tauri::command]
pub fn cancel_scan(state: tauri::State<'_, ScanCancelFlag>) -> Result<(), String> {
    state.0.store(true, Ordering::Relaxed);
    Ok(())
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

// ─── Silent Clean (CLI) ──────────────────────────────────────────────

pub fn run_silent_clean(app_handle: &tauri::AppHandle) {
    let start_time = std::time::Instant::now();

    let scan_results = match scan_junk_internal(None, None) {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Silent Clean Scan Error: {}", e);
            return;
        }
    };

    let categories: Vec<String> = scan_results.iter().map(|item| item.name.clone()).collect();
    let clean_res = match clean_junk_internal(app_handle, categories, false) {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Silent Clean Execution Error: {}", e);
            return;
        }
    };

    let duration = start_time.elapsed().as_secs_f64();
    let duration_str = format!("{:.1}s", duration);
    let freed_str = format_size(clean_res.bytes_freed);

    // Write log to history.json
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

        let time_str = chrono::Local::now()
            .format("%b %d, %Y, %I:%M %p")
            .to_string();

        let new_log = serde_json::json!({
            "date": time_str,
            "freed": freed_str,
            "fixed": clean_res.files_cleaned,
            "duration": duration_str,
            "type": "Auto Clean"
        });

        logs.insert(0, new_log);

        let output_json = serde_json::json!({ "logs": logs });
        if let Ok(serialized) = serde_json::to_string_pretty(&output_json) {
            if let Err(e) = fs::write(&history_path, serialized) {
                eprintln!("Failed to write silent clean history log: {}", e);
            }
        }
    }

    println!(
        "Silent Clean Completed. Freed {} across {} files in {:.1}s.",
        freed_str, clean_res.files_cleaned, duration
    );
}
