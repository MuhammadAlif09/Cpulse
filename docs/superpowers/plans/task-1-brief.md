# Task 1 Brief: Configure Custom NSIS Installer in `tauri.conf.json`

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
