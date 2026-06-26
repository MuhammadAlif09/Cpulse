# Setup Installer Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Tauri NSIS installer configuration to use CPulse's custom brand icon, display the License Agreement page, support both English and Indonesian languages with a selector dialog, and allow per-user or machine-wide installations.

**Architecture:** Inject NSIS-specific bundling options under the `"bundle"."windows"` section in `tauri.conf.json`.

**Tech Stack:** Tauri v2 Bundler, JSON.

## Global Constraints
- Configuration must adhere to Tauri v2 schema.
- Icon paths must be relative to the `src-tauri` directory.
- License file path must be relative to `src-tauri` (`../LICENSE`).

---

### Task 1: Configure Custom NSIS Installer in `tauri.conf.json`

**Files:**
- Modify: `src-tauri/tauri.conf.json:34-47` (Add custom NSIS configurations inside the `bundle` block)

**Interfaces:**
- Consumes: `icons/icon.ico` and `../LICENSE`
- Produces: Customized Windows NSIS Installer setup settings.

- [ ] **Step 1: Open and modify `tauri.conf.json`**

Locate the `bundle` block and insert the custom `windows` configuration:

```json
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installerIcon": "icons/icon.ico",
        "uninstallIcon": "icons/icon.ico",
        "installMode": "both",
        "license": "../LICENSE",
        "languages": ["English", "Indonesian"],
        "displayLanguageSelector": true
      }
    },
    "android": {
      "debugApplicationIdSuffix": ".debug"
    }
  }
```

- [ ] **Step 2: Commit changes to dev**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat(installer): customize NSIS installer with CPulse brand icon, license agreement, and multilingual support"
```

---

### Task 2: Validate Build Configuration

**Files:**
- All modified files

**Interfaces:**
- Consumes: Tauri CLI validation

- [ ] **Step 1: Run Tauri dev compile (dry-run/check)**

Execute tauri build verification to ensure config parses correctly:
Run: `rtk npx -y @tauri-apps/cli@2 build --no-bundle --features ""`
Expected: Success (it compiles successfully without schema parser errors).

- [ ] **Step 2: Commit verified state**

```bash
git commit --allow-empty -m "test(installer): verify tauri configuration validity"
```
