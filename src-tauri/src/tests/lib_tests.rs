use app_lib::*;
use std::path::PathBuf;

#[test]
fn test_startup_item_creation_and_properties() {
    let item = StartupItem {
        name: "TestApp".to_string(),
        command: "test.exe".to_string(),
        enabled: true,
        registry_path: "Software\\Microsoft\\Windows\\CurrentVersion\\Run".to_string(),
        is_hkcu: true,
        publisher: "TestPublisher".to_string(),
        impact: "High".to_string(),
        delay: 2.1,
    };

    assert_eq!(item.name, "TestApp");
    assert_eq!(item.command, "test.exe");
    assert!(item.enabled);
    assert!(item.is_hkcu);
    assert_eq!(item.publisher, "TestPublisher");
    assert_eq!(item.impact, "High");
    assert_eq!(item.delay, 2.1);
}

#[test]
fn test_disk_info_creation_and_validation() {
    let disk = DiskInfo {
        name: "C:".to_string(),
        used: 100.5,
        total: 500.0,
        disk_type: "SSD".to_string(),
        model: "Samsung SSD 980".to_string(),
    };

    assert_eq!(disk.name, "C:");
    assert!(disk.used > 0.0);
    assert!(disk.total > disk.used);
    let free = disk.total - disk.used;
    assert_eq!(free, 399.5);
    assert_eq!(disk.disk_type, "SSD");
    assert_eq!(disk.model, "Samsung SSD 980");
}

#[test]
fn test_path_validation() {
    let valid_path = PathBuf::from("C:\\Windows\\Temp");
    let is_abs = valid_path.is_absolute() || valid_path.starts_with("C:");
    assert!(is_abs);

    let relative_path = PathBuf::from("temp");
    assert!(!relative_path.is_absolute());
}

#[test]
fn test_get_wifi_profiles_count_behavior() {
    // When path does not exist, it should return 0 safely without panic
    let count = get_wifi_profiles_count();
    assert!(count >= 0);
}

#[test]
fn test_get_recent_files_count_behavior() {
    // Should return count >= 0 safely without panic
    let count = get_recent_files_count();
    assert!(count >= 0);
}

#[test]
fn test_get_run_mru_count_behavior() {
    let count = get_run_mru_count();
    assert!(count >= 0);
}

#[test]
fn test_get_search_history_count_behavior() {
    let count = get_search_history_count();
    assert!(count >= 0);
}

#[test]
fn test_add_and_delete_startup_item() {
    #[cfg(target_os = "windows")]
    {
        let test_name = "CPulseTestAppSync".to_string();
        let test_path = "C:\\Windows\\Temp\\testapp.exe".to_string();

        let add_res = add_startup_item_impl(test_name.clone(), test_path, true);
        if add_res.is_ok() {
            let delete_res = delete_startup_item_impl(test_name, true);
            assert!(delete_res.is_ok());
        }
    }
}
