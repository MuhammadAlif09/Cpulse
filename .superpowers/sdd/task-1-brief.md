# Task 1 Brief

## Global Constraints
- Never commit directly to main; work on the dev branch.
- No new dependencies.
- No TODO or placeholder comments in the final code.

### Task 1: Configure Cargo.toml and Expose API Visibility

**Files:**
- Modify: `src-tauri/Cargo.toml:13-16`
- Modify: `src-tauri/src/lib.rs:1-16`, `212-260`
- Modify: `src-tauri/src/cleaner.rs:20-22`, `78-155`

**Interfaces:**
- Consumes: None.
- Produces: `pub mod cleaner`, `pub fn get_wifi_profiles_count() -> usize`, `pub fn get_recent_files_count() -> usize`, `pub fn get_run_mru_count() -> usize`, `pub fn get_search_history_count() -> usize`, `pub const MAX_FILES: usize`, `pub const MAX_DEPTH: usize`, `pub fn get_dir_size_and_count()`, `pub fn scan_dir()`.

- [ ] **Step 1: Disable library testing in Cargo.toml**

  Modify `src-tauri/Cargo.toml` lines 13-16:
  ```toml
  [lib]
  name = "app_lib"
  crate-type = ["rlib"]
  test = false
  ```

- [ ] **Step 2: Expose cleaner module and statistics functions in lib.rs**

  Modify `src-tauri/src/lib.rs` to change `mod cleaner;` to `pub mod cleaner;` and prepend `pub` to the statistic helper functions:
  ```rust
  // src-tauri/src/lib.rs
  pub mod cleaner;
  ...
  pub fn get_wifi_profiles_count() -> usize { ... }
  pub fn get_recent_files_count() -> usize { ... }
  pub fn get_run_mru_count() -> usize { ... }
  pub fn get_search_history_count() -> usize { ... }
  ```

- [ ] **Step 3: Expose constants and helper functions in cleaner.rs**

  Modify `src-tauri/src/cleaner.rs` to prepend `pub` to `MAX_FILES`, `MAX_DEPTH`, `get_dir_size_and_count`, and `scan_dir`:
  ```rust
  // src-tauri/src/cleaner.rs
  pub const MAX_FILES: usize = 100_000;
  pub const MAX_DEPTH: usize = 20;
  ...
  pub fn get_dir_size_and_count(...) { ... }
  pub fn scan_dir(...) { ... }
  ```

- [ ] **Step 4: Run cargo build to verify it compiles**

  Run: `cargo build` in `src-tauri/`
  Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit changes**

  ```bash
  git add src-tauri/Cargo.toml src-tauri/src/lib.rs src-tauri/src/cleaner.rs
  git commit -m "chore: expose library functions and configure target in Cargo.toml"
  ```

---