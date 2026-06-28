use app_lib::cleaner::*;
use std::path::Path;
use std::sync::atomic::AtomicBool;

#[test]
fn test_format_size_bytes() {
    assert_eq!(format_size(512), "512 B");
}

#[test]
fn test_format_size_kb() {
    assert_eq!(format_size(1536), "1.5 KB");
}

#[test]
fn test_format_size_mb() {
    assert_eq!(format_size(5242880), "5.0 MB");
}

#[test]
fn test_format_size_gb() {
    assert_eq!(format_size(2147483648), "2.0 GB");
}

#[test]
fn test_junk_item_creation_with_new_fields() {
    let item = JunkItem {
        name: "Test Cache".to_string(),
        size: "1.5 MB".to_string(),
        bytes: 1572864,
        count: 10,
        color: "#4f46e5".to_string(),
        icon: "🗑️".to_string(),
        description: "Test description".to_string(),
        warning: "Test warning".to_string(),
        requires_admin: true,
    };

    assert_eq!(item.name, "Test Cache");
    assert_eq!(item.bytes, 1572864);
    assert_eq!(item.count, 10);
    assert_eq!(item.description, "Test description");
    assert_eq!(item.warning, "Test warning");
    assert!(item.requires_admin);
}

#[test]
fn test_junk_item_safe_category() {
    let item = JunkItem {
        name: "Browser Cache".to_string(),
        size: "500 MB".to_string(),
        bytes: 524288000,
        count: 100,
        color: "#7c3aed".to_string(),
        icon: "🌐".to_string(),
        description: "Cached web pages".to_string(),
        warning: String::new(),
        requires_admin: false,
    };

    assert!(item.warning.is_empty());
    assert!(!item.requires_admin);
}

#[test]
fn test_safeguard_max_depth() {
    let path = Path::new("C:\\Windows\\Temp");
    let mut file_count = 0;
    let (size, count) = get_dir_size_and_count(path, None, MAX_DEPTH + 1, &mut file_count);
    assert_eq!(size, 0);
    assert_eq!(count, 0);
}

#[test]
fn test_safeguard_max_files() {
    let path = Path::new("C:\\Windows\\Temp");
    let mut file_count = MAX_FILES;
    let (size, count) = get_dir_size_and_count(path, None, 0, &mut file_count);
    assert_eq!(size, 0);
    assert_eq!(count, 0);
}

#[test]
fn test_cancel_flag_stops_scan() {
    let cancel = AtomicBool::new(true);
    let path = Path::new("C:\\Windows\\Temp");
    let mut file_count = 0;
    let (size, count) = get_dir_size_and_count(path, Some(&cancel), 0, &mut file_count);
    assert_eq!(size, 0);
    assert_eq!(count, 0);
}

#[test]
fn test_scan_dir_nonexistent_path() {
    let (size, count) = scan_dir(Path::new("C:\\NonexistentPathThatShouldNotExist12345"), None);
    assert_eq!(size, 0);
    assert_eq!(count, 0);
}
