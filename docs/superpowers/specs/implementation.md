# Design Specification: Rust Test Stabilization (GNU Toolchain)

This document specifies the design for fixing the `STATUS_ENTRYPOINT_NOT_FOUND (0xc0000139)` crash during `cargo test` when using the `x86_64-pc-windows-gnu` toolchain on Windows.

## 1. Problem Description

When compiling the library target (`app_lib` / `src/lib.rs`) for unit tests via `cargo test`, Cargo creates a library test runner executable (`app_lib-*.exe`) without the required Windows application manifest, application icon, and desktop subsystem linking. 

This causes the Windows loader to fail when resolving entry points for dynamic link libraries linked by Tauri (such as `WebView2Loader.dll`) during test execution, leading to a process crash before tests can start.

## 2. Proposed Changes

We will migrate all unit tests from the library target to integration tests compiled as binary targets.

### 2.1 Target Configuration

Update `src-tauri/Cargo.toml` to disable unit tests on the library target:

```toml
[lib]
name = "app_lib"
crate-type = ["rlib"]
test = false
```

### 2.2 API Visibility Updates

To allow integration test binaries to import and test the core logic functions, we will change their visibility from private (`fn`) to public (`pub fn`) in `src-tauri/src/lib.rs`:

* `pub fn get_wifi_profiles_count() -> usize`
* `pub fn get_recent_files_count() -> usize`
* `pub fn get_run_mru_count() -> usize`
* `pub fn get_search_history_count() -> usize`

### 2.3 File Structure Changes

Create a new directory `src-tauri/tests/` and add the following files:

1. **`src-tauri/tests/lib_tests.rs`**: Holds all test cases migrated from `src-tauri/src/lib.rs`.
2. **`src-tauri/tests/cleaner_tests.rs`**: Holds all test cases migrated from `src-tauri/src/cleaner.rs`.

These files will import the library public interface:
```rust
use app_lib::*;
```

## 3. Verification Plan

### 3.1 Automated Tests
* Run `cargo test` in `src-tauri` directory.
* Verify that all tests pass without any `STATUS_ENTRYPOINT_NOT_FOUND` errors.
