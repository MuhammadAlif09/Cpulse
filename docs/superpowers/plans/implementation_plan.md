# Rust Test Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `STATUS_ENTRYPOINT_NOT_FOUND (0xc0000139)` crash during `cargo test` under the Windows GNU toolchain by migrating unit tests to the binary target's module structure.

**Architecture:** Disable the library test target harness to avoid compiling direct library unit test executables. Declare test modules inside `main.rs` (under `src/tests/`) so they compile as part of the `app` binary target, inheriting Tauri's MSVC manifest and resource linkage.

**Tech Stack:** Rust, Cargo, Tauri v2.

## Global Constraints

- Never commit directly to main; work on the dev branch.
- No new dependencies.
- No TODO or placeholder comments in the final code.

---

### Task 1: Configure Cargo.toml and Expose API Visibility

**Files:**
- Modify: `src-tauri/Cargo.toml:13-16`
- Modify: `src-tauri/src/lib.rs:1-16`, `212-260`
- Modify: `src-tauri/src/cleaner.rs:20-22`, `78-155`

**Interfaces:**
- Consumes: None.
- Produces: `pub mod cleaner`, `pub fn get_wifi_profiles_count() -> usize`, `pub fn get_recent_files_count() -> usize`, `pub fn get_run_mru_count() -> usize`, `pub fn get_search_history_count() -> usize`, `pub const MAX_FILES: usize`, `pub const MAX_DEPTH: usize`, `pub fn get_dir_size_and_count()`, `pub fn scan_dir()`.

- [x] **Step 1: Disable library testing in Cargo.toml**
- [x] **Step 2: Expose cleaner module and statistics functions in lib.rs**
- [x] **Step 3: Expose constants and helper functions in cleaner.rs**
- [x] **Step 4: Run cargo build to verify it compiles**
- [x] **Step 5: Commit changes**

---

### Task 2: Migrate lib.rs Unit Tests to Binary Target Modules

**Files:**
- Create: `src-tauri/src/tests/lib_tests.rs`
- Modify: `src-tauri/src/lib.rs:1595-1668` (Delete unit tests block)
- Modify: `src-tauri/src/main.rs:12-21` (Declare mod tests)

**Interfaces:**
- Consumes: `app_lib::*`
- Produces: Binary unit tests under `tests::lib_tests`.

- [ ] **Step 1: Create binary test file for lib.rs**

  Create `src-tauri/src/tests/lib_tests.rs` with the following content:
  ```rust
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
  ```

- [ ] **Step 2: Delete unit tests from lib.rs**

  Remove the `#[cfg(test)] mod tests` block from `src-tauri/src/lib.rs` (lines 1595-1668).

- [ ] **Step 3: Declare test modules in main.rs**

  Modify `src-tauri/src/main.rs` to declare:
  ```rust
  #[cfg(test)]
  mod tests {
      mod lib_tests;
      mod cleaner_tests;
  }
  ```

- [ ] **Step 4: Run cargo test --bin app to verify tests run and pass**

  Run: `cargo test --bin app` in `src-tauri/`
  Expected: PASS.

- [ ] **Step 5: Run cargo clippy -- -D warnings**

  Run: `cargo clippy -- -D warnings`
  Expected: Success.

- [ ] **Step 6: Commit changes**

  ```bash
  git add src-tauri/src/lib.rs src-tauri/src/main.rs src-tauri/src/tests/lib_tests.rs
  git commit -m "test: migrate lib.rs unit tests to binary modules under main.rs"
  ```

---

### Task 3: Migrate cleaner.rs Unit Tests to Binary Target Modules

**Files:**
- Create: `src-tauri/src/tests/cleaner_tests.rs`
- Modify: `src-tauri/src/cleaner.rs:1412-1513` (Delete unit tests block)

**Interfaces:**
- Consumes: `app_lib::cleaner::*`
- Produces: Binary unit tests under `tests::cleaner_tests`.

- [ ] **Step 1: Create binary test file for cleaner.rs**

  Create `src-tauri/src/tests/cleaner_tests.rs` with the following content:
  ```rust
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
  ```

- [ ] **Step 2: Delete unit tests from cleaner.rs**

  Remove the `#[cfg(test)] mod tests` block from `src-tauri/src/cleaner.rs` (lines 1412-1513).

- [ ] **Step 3: Run cargo test --bin app to verify all tests run and pass**

  Run: `cargo test --bin app` in `src-tauri/`
  Expected: All binary target tests pass successfully.

- [ ] **Step 4: Run cargo clippy -- -D warnings**

  Run: `cargo clippy -- -D warnings`
  Expected: Success.

- [ ] **Step 5: Commit changes**

  ```bash
  git add src-tauri/src/cleaner.rs src-tauri/src/tests/cleaner_tests.rs
  git commit -m "test: migrate cleaner.rs unit tests to binary modules under main.rs"
  ```
