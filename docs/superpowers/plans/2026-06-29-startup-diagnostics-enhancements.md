# Startup & Diagnostics Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the Startup tab with adding and deleting startup items, and support viewing/loading historical diagnostics reports from a folder.

**Architecture:** Expose new Rust Tauri commands `delete_startup_item`, `add_startup_item`, `get_diagnostics_reports`, and `read_diagnostics_report`. Update the React frontend tabs (`StartupTab` and `DiagnosticsTab`) to use these new commands and display them in a clean UI.

**Tech Stack:** Rust, React, Tauri v2, winreg.

## Global Constraints

- Never commit directly to main; work on the dev branch.
- No new dependencies.
- No TODO or placeholder comments in the final code.

---

### Task 1: Add Rust commands for Startup items (Add/Delete)

**Files:**
- Modify: [lib.rs](file:///c:/Projek/Cpulse_package/src-tauri/src/lib.rs)
- Modify: [lib_tests.rs](file:///c:/Projek/Cpulse_package/src-tauri/src/tests/lib_tests.rs)

**Interfaces:**
- Consumes: None
- Produces: `delete_startup_item(name: String, is_hkcu: bool)`, `add_startup_item(name: String, path: String, is_hkcu: bool)`

- [ ] **Step 1: Implement commands in lib.rs**

  Add the following functions to [lib.rs](file:///c:/Projek/Cpulse_package/src-tauri/src/lib.rs):
  ```rust
  #[tauri::command]
  fn delete_startup_item(name: String, is_hkcu: bool) -> Result<String, String> {
      if !is_hkcu && !is_elevated::is_elevated() {
          return Err("Administrator privileges required to delete HKLM startup items".into());
      }

      let root = if is_hkcu {
          RegKey::predef(HKEY_CURRENT_USER)
      } else {
          RegKey::predef(HKEY_LOCAL_MACHINE)
      };
      let run_path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
      let approved_path = "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run";

      let key = root.open_subkey_with_flags(run_path, KEY_WRITE).map_err(|e| e.to_string())?;
      let _ = key.delete_value(&name);

      if let Ok(approved_key) = root.open_subkey_with_flags(approved_path, KEY_WRITE) {
          let _ = approved_key.delete_value(&name);
      }

      Ok(format!("Deleted startup item {}", name))
  }

  #[tauri::command]
  fn add_startup_item(name: String, path: String, is_hkcu: bool) -> Result<String, String> {
      if !is_hkcu && !is_elevated::is_elevated() {
          return Err("Administrator privileges required to add HKLM startup items".into());
      }

      let root = if is_hkcu {
          RegKey::predef(HKEY_CURRENT_USER)
      } else {
          RegKey::predef(HKEY_LOCAL_MACHINE)
      };
      let run_path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";

      let key = root.open_subkey_with_flags(run_path, KEY_WRITE).map_err(|e| e.to_string())?;
      key.set_value(&name, &path).map_err(|e| e.to_string())?;

      Ok(format!("Added startup item {}", name))
  }
  ```

- [ ] **Step 2: Register commands in tauri::generate_handler!**

  Modify the handler block in [lib.rs](file:///c:/Projek/Cpulse_package/src-tauri/src/lib.rs):
  ```rust
          .invoke_handler(tauri::generate_handler![
              // ... existing commands ...
              delete_startup_item,
              add_startup_item
          ])
  ```

- [ ] **Step 3: Add integration tests in lib_tests.rs**

  Add the following test case to [lib_tests.rs](file:///c:/Projek/Cpulse_package/src-tauri/src/tests/lib_tests.rs):
  ```rust
  #[test]
  fn test_add_and_delete_startup_item() {
      let test_name = "CPulseTestAppSync".to_string();
      let test_path = "C:\\Windows\\Temp\\testapp.exe".to_string();
      
      let add_res = add_startup_item(test_name.clone(), test_path, true);
      assert!(add_res.is_ok());

      let delete_res = delete_startup_item(test_name, true);
      assert!(delete_res.is_ok());
  }
  ```

- [ ] **Step 4: Verify test passes**

  Run: `cargo test --bin app`
  Expected: PASS

- [ ] **Step 5: Commit changes**

---

### Task 2: Update StartupTab UI for Adding/Deleting items

**Files:**
- Modify: [StartupTab.tsx](file:///c:/Projek/Cpulse_package/src/app/features/StartupTab.tsx)

**Interfaces:**
- Consumes: `delete_startup_item`, `add_startup_item`
- Produces: Frontend interactive delete and add UI components.

- [ ] **Step 1: Implement Delete Handler and Add Custom Form**

  Add form state and handlers inside the `StartupTab` component in [StartupTab.tsx](file:///c:/Projek/Cpulse_package/src/app/features/StartupTab.tsx):
  ```typescript
  const [newName, setNewName] = useState("");
  const [newPath, setNewPath] = useState("");
  const [adding, setAdding] = useState(false);

  const handleDelete = async (name: string, is_hkcu: boolean) => {
    if (!confirm(t("Are you sure you want to delete this startup item?"))) return;
    try {
      await invoke("delete_startup_item", { name, isHkcu: is_hkcu });
      setItems((prev) => prev.filter((item) => item.name !== name));
      addHistoryLog({ type: "Startup Deleted", freed: "N/A", fixed: 1, duration: "0.0s", details: `Deleted:${name}` });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPath) return;
    setAdding(true);
    try {
      await invoke("add_startup_item", { name: newName, path: newPath, isHkcu: true });
      setNewName("");
      setNewPath("");
      // Refresh items list
      const res = await invoke<StartupItem[]>("get_startup_items");
      const enriched = res.map((item) => ({ ...item, icon: getIconForApp(item.name, item.publisher || "") }));
      setItems(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };
  ```

- [ ] **Step 2: Render Add Form and Delete Action Buttons**

  Render the custom add form card at the top, and a trash icon next to the toggle button for each item list entry.

- [ ] **Step 3: Verify build and component render**

  Run: `npm run build`
  Expected: PASS

- [ ] **Step 4: Commit changes**

---

### Task 3: Support Diagnostics Report History & Viewing

**Files:**
- Modify: [lib.rs](file:///c:/Projek/Cpulse_package/src-tauri/src/lib.rs)
- Modify: [DiagnosticsTab.tsx](file:///c:/Projek/Cpulse_package/src/app/features/DiagnosticsTab.tsx)

**Interfaces:**
- Consumes: None
- Produces: `get_diagnostics_reports()`, `read_diagnostics_report(filename: String)`

- [ ] **Step 1: Save reports with timestamps in lib.rs**

  Modify `generate_diagnostics_report` to save reports inside a `reports` subfolder:
  ```rust
  let reports_dir = app_data.join("reports");
  let _ = fs::create_dir_all(&reports_dir);
  let sanitized_date = date_str.replace(":", "-").replace(" ", "_");
  let report_path = reports_dir.join(format!("report_{}.md", sanitized_date));
  ```

- [ ] **Step 2: Implement get/read commands**

  Add commands to [lib.rs](file:///c:/Projek/Cpulse_package/src-tauri/src/lib.rs):
  ```rust
  #[tauri::command]
  fn get_diagnostics_reports(app: tauri::AppHandle) -> Result<Vec<String>, String> {
      let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
      let reports_dir = app_data.join("reports");
      if !reports_dir.exists() {
          return Ok(Vec::new());
      }
      let mut files = Vec::new();
      if let Ok(entries) = fs::read_dir(reports_dir) {
          for entry in entries.flatten() {
              if let Some(name) = entry.file_name().to_str() {
                  if name.starts_with("report_") && name.ends_with(".md") {
                      files.push(name.to_string());
                  }
              }
          }
      }
      files.sort_by(|a, b| b.cmp(a)); // Newest first
      Ok(files)
  }

  #[tauri::command]
  fn read_diagnostics_report(app: tauri::AppHandle, filename: String) -> Result<String, String> {
      let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
      let report_path = app_data.join("reports").join(filename);
      if !report_path.exists() {
          return Err("Report file not found".into());
      }
      fs::read_to_string(report_path).map_err(|e| e.to_string())
  }
  ```

- [ ] **Step 3: Register commands in generate_handler!**

  Add `get_diagnostics_reports` and `read_diagnostics_report` to generate_handler.

- [ ] **Step 4: Create Diagnostics History UI in DiagnosticsTab.tsx**

  Add a list showing previous report filenames. Clicking a report loads it via `read_diagnostics_report` and displays it in a scrollable details panel on the tab.

- [ ] **Step 5: Run npm run build and cargo test to verify everything compile & builds**

  Expected: PASS

- [ ] **Step 6: Commit changes**
