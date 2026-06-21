import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is one level up from scripts/
const rootDir = path.join(__dirname, "..");

// 1. Get current version from package.json
const pkgPath = path.join(rootDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const newVersion = pkg.version;

console.log(`Syncing version to v${newVersion}...`);

// 2. Update tauri.conf.json
const tauriConfPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
  tauriConf.version = newVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n", "utf8");
  console.log("✓ tauri.conf.json updated");
}

// 3. Update fallback version in App.tsx
const appTsxPath = path.join(rootDir, "src", "app", "App.tsx");
if (fs.existsSync(appTsxPath)) {
  let appTsx = fs.readFileSync(appTsxPath, "utf8");
  const versionRegex = /(const\s+\[appVersion,\s+setAppVersion\]\s*=\s*useState\()"[^"]+"(\);)/;
  if (versionRegex.test(appTsx)) {
    appTsx = appTsx.replace(versionRegex, `$1"${newVersion}"$2`);
    fs.writeFileSync(appTsxPath, appTsx, "utf8");
    console.log("✓ App.tsx fallback version updated");
  }
}
