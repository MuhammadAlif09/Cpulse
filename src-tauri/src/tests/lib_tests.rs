use app_lib::*;
use std::path::PathBuf;

#[test]
fn test_startup_item_creation() {
    let item = StartupItem {
        name: "TestApp".to_string(),
        command: "test.exe".to_string(),
        enabled: true,
        registry_path: "Software\\Microsoft\\Windows\\CurrentVersion\\Run".to_string(),
        is_hkcu: true,
        publisher: "TestPublisher".to_string(),
        impact: "Low".to_string(),
        delay: 0.1,
    };

    assert_eq!(item.name, "TestApp");
    assert_eq!(item.command, "test.exe");
    assert!(item.enabled);
    assert!(item.is_hkcu);
    assert_eq!(item.publisher, "TestPublisher");
    assert_eq!(item.impact, "Low");
    assert_eq!(item.delay, 0.1);
}

#[test]
fn test_disk_info_creation() {
    let disk = DiskInfo {
        name: "C:".to_string(),
        used: 100.5,
        total: 500.0,
        disk_type: "SSD".to_string(),
        model: "Samsung SSD".to_string(),
    };

    assert_eq!(disk.name, "C:");
    assert!(disk.used > 0.0);
    assert!(disk.total > disk.used);
    assert_eq!(disk.disk_type, "SSD");
    assert_eq!(disk.model, "Samsung SSD");
}

#[test]
fn test_path_validation() {
    let valid_path = PathBuf::from("C:\\Windows\\Temp");
    assert!(valid_path.is_absolute());

    let relative_path = PathBuf::from("temp");
    assert!(!relative_path.is_absolute());
}

#[test]
fn test_get_wifi_profiles_count() {
    let _ = get_wifi_profiles_count();
}

#[test]
fn test_get_recent_files_count() {
    let _ = get_recent_files_count();
}

#[test]
fn test_get_run_mru_count() {
    let _ = get_run_mru_count();
}

#[test]
fn test_get_search_history_count() {
    let _ = get_search_history_count();
}
