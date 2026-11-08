use app_lib::cleaner::*;
use std::fs;
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
        description: "Cached web pages".to_string(),
        warning: String::new(),
        requires_admin: false,
    };

    assert!(item.warning.is_empty());
    assert!(!item.requires_admin);
}

#[test]
fn test_safeguard_max_depth_with_real_dir() {
    let temp_root = std::env::temp_dir().join("cpulse_test_max_depth");
    let _ = fs::create_dir_all(&temp_root);
    let test_file = temp_root.join("sample.tmp");
    let _ = fs::write(&test_file, b"sample test payload data");

    let mut file_count = 0;
    // When depth exceeds MAX_DEPTH, it must return (0, 0)
    let (size, count) = get_dir_size_and_count(&temp_root, None, MAX_DEPTH + 1, &mut file_count);
    assert_eq!(size, 0);
    assert_eq!(count, 0);

    let _ = fs::remove_dir_all(&temp_root);
}

#[test]
fn test_safeguard_max_files_with_real_dir() {
    let temp_root = std::env::temp_dir().join("cpulse_test_max_files");
    let _ = fs::create_dir_all(&temp_root);
    let test_file = temp_root.join("sample.tmp");
    let _ = fs::write(&test_file, b"sample test payload data");

    let mut file_count = MAX_FILES;
    let (size, count) = get_dir_size_and_count(&temp_root, None, 0, &mut file_count);
    assert_eq!(size, 0);
    assert_eq!(count, 0);

    let _ = fs::remove_dir_all(&temp_root);
}

#[test]
fn test_cancel_flag_stops_scan_on_real_files() {
    let temp_root = std::env::temp_dir().join("cpulse_test_cancel");
    let _ = fs::create_dir_all(&temp_root);
    for i in 0..5 {
        let _ = fs::write(temp_root.join(format!("file_{}.tmp", i)), b"test");
    }

    let cancel = AtomicBool::new(true);
    let mut file_count = 0;
    let (size, count) = get_dir_size_and_count(&temp_root, Some(&cancel), 0, &mut file_count);
    assert_eq!(size, 0);
    assert_eq!(count, 0);

    let _ = fs::remove_dir_all(&temp_root);
}

#[test]
fn test_real_scan_and_clear_directory() {
    let temp_root = std::env::temp_dir().join("cpulse_test_scan_clear");
    let _ = fs::create_dir_all(&temp_root);
    let file1 = temp_root.join("test1.tmp");
    let file2 = temp_root.join("test2.tmp");
    let _ = fs::write(&file1, b"12345");
    let _ = fs::write(&file2, b"67890");

    let (bytes, count) = scan_dir(&temp_root, None);
    assert_eq!(bytes, 10);
    assert_eq!(count, 2);

    let clear_res = clear_dir(&temp_root, false);
    assert!(clear_res.is_ok());
    let (cleared_bytes, cleared_count) = clear_res.unwrap();
    assert_eq!(cleared_bytes, 10);
    assert_eq!(cleared_count, 2);

    let (bytes_after, count_after) = scan_dir(&temp_root, None);
    assert_eq!(bytes_after, 0);
    assert_eq!(count_after, 0);

    let _ = fs::remove_dir_all(&temp_root);
}

#[test]
fn test_scan_dir_nonexistent_path() {
    let (size, count) = scan_dir(
        std::path::Path::new("/nonexistent_path_that_should_not_exist_cpulse_12345"),
        None,
    );
    assert_eq!(size, 0);
    assert_eq!(count, 0);
}
