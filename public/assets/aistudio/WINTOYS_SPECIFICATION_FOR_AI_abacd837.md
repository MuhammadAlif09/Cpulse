# WINTOYS COMPLETE SYSTEM SPECIFICATION & IMPLEMENTATION BLUEPRINT

Dokumen ini berisi spesifikasi teknis lengkap hasil reverse engineering Wintoys v2.6.71.0.
Gunakan dokumen ini sebagai panduan implementasi fitur (Registry keys, Windows APIs, CLI commands, dan file paths).

---

## DAFTAR ISI
1. [Modul Health & Repair (Sentinel)](#1-modul-health--repair-sentinel)
2. [Modul Storage Cleaner (Junk Cleaner)](#2-modul-storage-cleaner-junk-cleaner)
3. [Modul Startup Manager](#3-modul-startup-manager)
4. [Modul Apps Uninstaller](#4-modul-apps-uninstaller)
5. [Katalog 80+ System Tweaks & Optimizations](#5-katalog-80-system-tweaks--optimizations)

---

## 1. MODUL HEALTH & REPAIR (Sentinel)

### A. System File & Disk Repair
| Tool | Scan Command (Readonly) | Repair Command | Process Encoding |
|---|---|---|---|
| **DISM** | `DISM.exe /Online /Cleanup-Image /ScanHealth` | `DISM.exe /Online /Cleanup-Image /RestoreHealth` | OEM CodePage (`PInvoke.GetOEMCP()`) |
| **SFC** | `sfc.exe /verifyonly` | `sfc.exe /scannow` | Unicode |
| **CHKDSK** | `chkdsk.exe C:` | `chkdsk.exe C: /f /r` | ANSI CodePage |

### B. Quick System Repairs & Fixes
- **Restart Graphics Driver:**
  - Command: `pnputil.exe /restart-device "<DisplayAdapterInstanceId>"`
  - Cara ambil InstanceId: via WMI/CIM query atau `SetupDiGetClassDevs`.
- **Rebuild Icon Cache:**
  1. Hentikan explorer: `taskkill /f /im explorer.exe`
  2. Hapus file: `%LOCALAPPDATA%\IconCache.db`
  3. Hapus semua file yang mengandung `iconcache` atau `thumbcache` di `%LOCALAPPDATA%\Microsoft\Windows\Explorer`
  4. Jalankan kembali explorer: `explorer.exe`
- **Clear File Explorer History:**
  1. Hapus isi folder:
     - `%APPDATA%\Microsoft\Windows\Recent`
     - `%APPDATA%\Microsoft\Windows\Recent\AutomaticDestinations`
     - `%APPDATA%\Microsoft\Windows\Recent\CustomDestinations`
  2. Hapus semua values di registry: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\TypedPaths`
- **Clear Microsoft Store Cache:**
  1. Jalankan `wsreset.exe`
  2. Hapus SubKey SID user di: `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Appx\AppxAllUserStore\<UserSID>`
- **Network Troubleshooting (Batch CLI):**
  - **Flush DNS:** `ipconfig /flushdns` (Cek dulu service `dnscache` aktif)
  - **Reset Winsock:** `netsh winsock reset`
  - **Reset TCP/IP:** `netsh int ipv4 reset` dan `netsh int ipv6 reset`
  - **Reset Proxy:** `netsh winhttp reset proxy`
  - **Reset Firewall:** `netsh advfirewall reset`
  - **Reset Network Adapters:** `netcfg -d`
  - **Renew IP:** `ipconfig /release` lalu `ipconfig /renew`
- **Delete System Restore Points:**
  - Command: `vssadmin.exe delete shadows /all /quiet`
  - Kalkulasi size restore point via WMI: `SELECT UsedSpace FROM Win32_ShadowStorage`
- **Generate Battery Report:**
  - Command: `powercfg.exe /batteryreport /output "<DesktopPath>\battery-report.html"`
- **Memory Diagnostics:**
  - Jalankan `mdsched.exe` (butuh elevation/admin)
  - Cek histori hasil diagnosa di Event Log: Query log `System`, Provider event `1101` atau `1201`, cek properti `Event/UserData/Results/CompletionType` (Pass/Fail).
- **Disable Noisy Tasks (WakeToRun):**
  - Membaca Scheduled Tasks via `Microsoft.Win32.TaskScheduler.TaskService`
  - Cari task dengan `UserId != 'SYSTEM'` dan `WakeToRun == true`
  - Set `t.Definition.Settings.WakeToRun = false` lalu `t.RegisterChanges()`

---

## 2. MODUL STORAGE CLEANER (Junk Cleaner)

Berikut path target pembersihan file sampah (scan ukuran file lalu delete):

| Kategori | Tipe Sampah | Target Folder / Files |
|---|---|---|
| **System** | Temporary Files | • `%WINDIR%\Temp` <br>• `%WINDIR%\SystemTemp`<br>• `%WINDIR%\Panther`<br>• `%WINDIR%\ServiceProfiles\NetworkService\AppData\Local\Temp`<br>• `%LOCALAPPDATA%\Temp`<br>• `%LOCALAPPDATA%\Microsoft\Windows\Temporary Internet Files`<br>• `%APPDATA%\Temp`<br>• `%USERPROFILE%\AppData\LocalLow\Temp`<br>• `%USERPROFILE%\AppData\LocalLow\Microsoft\CryptnetUrlCache` |
| **System** | Windows Updates Cache | • `%WINDIR%\SoftwareDistribution\Download`<br>• `%WINDIR%\Installer\$PatchCache$\Managed`<br>• `%WINDIR%\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache`<br>• `%WINDIR%\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Logs` |
| **System** | Log Files | • `%WINDIR%\*.log`, `%WINDIR%\debug\*.log`, `%WINDIR%\Logs\CBS\*.log`, `%WINDIR%\Logs\DISM\*.log`<br>• `%WINDIR%\SoftwareDistribution\DataStore\Logs`<br>• `%WINDIR%\System32\LogFiles`<br>• `%LOCALAPPDATA%\Microsoft\Windows\WebCache\*.log` |
| **System** | Error Dumps | • `%WINDIR%\MEMORY.DMP`<br>• `%WINDIR%\Minidump`<br>• `%WINDIR%\LiveKernelReports` |
| **System** | Error Reports (WER) | • `%PROGRAMDATA%\Microsoft\Windows\WER\ReportQueue`<br>• `%PROGRAMDATA%\Microsoft\Windows\WER\ReportArchive`<br>• `%PROGRAMDATA%\Microsoft\Windows\WER\Temp`<br>• `%LOCALAPPDATA%\CrashDumps` |
| **System** | DirectX Shader Cache | • `%LOCALAPPDATA%\D3DSCache` |
| **System** | Windows Defender Cache | • `%PROGRAMDATA%\Microsoft\Windows Defender\Scans\History\CacheManager`<br>• `%PROGRAMDATA%\Microsoft\Windows Defender\Support` |
| **System** | Prefetch | • `%WINDIR%\Prefetch` |
| **Browser** | Microsoft Edge | Process: `msedge` (kill proses dulu). Folder: `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache`, `Code Cache`, `GPUCache`, `Service Worker` |
| **Browser** | Google Chrome | Process: `chrome` (kill proses dulu). Folder: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache`, `Code Cache`, `GPUCache`, `Service Worker` |
| **Browser** | Mozilla Firefox | Process: `firefox`. Folder: `%LOCALAPPDATA%\Mozilla\Firefox\Profiles\*.default\cache2`, `thumbnails`, `startupCache` |
| **Browser** | Opera / Opera GX | Process: `opera`. Folder: `%LOCALAPPDATA%\Opera Software\Opera Stable` |
| **Browser** | Brave | Process: `brave`. Folder: `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Cache` |
| **Others** | NuGet Cache | • `%LOCALAPPDATA%\NuGet\v3-cache` |
| **Others** | Remote Desktop Cache | • `%LOCALAPPDATA%\Microsoft\Terminal Server Client\Cache` |
| **Others** | Windows Widgets Cache | • `%LOCALAPPDATA%\Packages\MicrosoftWindows.Client.WebExperience_cw5n1h2txyewy\LocalState\EBWebView\Default\Cache\Cache_Data` |

---

## 3. MODUL STARTUP MANAGER

### A. Lokasi Registry & Folder
1. **Registry Run Keys (Classic Win32):**
   - `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`
   - `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`
   - `HKLM\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Run`
2. **Startup Approved (Toggle State tanpa hapus entri):**
   - `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run`
   - `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run`
   - `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder`
   - **Binary Data format (byte[12]):**
     - Index `[0] == 2` -> **Enabled** (`02 00 00 00 00 00 00 00 00 00 00 00`)
     - Index `[0] == 3` -> **Disabled by user** (`03 00 00 00 00 00 00 00 00 00 00 00`)
3. **Startup Folder:**
   - Shortcut (.lnk) di `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` (`shell:startup`)
4. **Modern UWP / MSIX Apps:**
   - Baca `AppxManifest.xml` dari package: cari node `<StartupTask TaskId="..." Enabled="true/false" />`
   - Registry status: `HKCU\SOFTWARE\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppModel\SystemAppData\<PackageFamilyName>\<TaskId>`
     - Value `State`: `StartupTaskState.Enabled (2)` atau `StartupTaskState.DisabledByUser (1)`
5. **Boot Time (BIOS/POST duration):**
   - Registry: `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power`
   - Value: `FwPOSTTime` (DWORD/String dlm millisecond) -> ubah ke detik: `TotalSeconds = ms / 1000.0`.

---

## 4. MODUL APPS UNINSTALLER

1. **Classic Desktop Apps (Win32):**
   - Baca subkey di:
     - `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`
     - `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`
     - `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`
   - Saring key yang memiliki `SystemComponent == 1` atau tanpa `DisplayName` / tanpa `UninstallString`.
   - Jalankan `UninstallString` untuk uninstalasi.
   - Jika file executable uninstaller sudah tidak ada, hapus subkey registry tersebut untuk bersih-bersih.
2. **Modern Apps (UWP / MSIX):**
   - Gunakan Windows API `Windows.Management.Deployment.PackageManager`.
   - `pm.FindPackagesForUserWithPackageTypes(string.Empty, PackageTypes.Main)`
   - Filter out system signature (`package.SignatureKind == PackageSignatureKind.System`).
   - Uninstall via: `pm.RemovePackageAsync(package.Id.FullName)`
   - Reset data via: `ApplicationDataManager.CreateForPackageFamily(familyName).ClearAsync()`
   - Kill app via: `AppDiagnosticInfo.RequestInfoForPackageAsync(familyName)` -> dapatkan process Id -> kill process tree.

---

## 5. KATALOG 80+ SYSTEM TWEAKS & OPTIMIZATIONS

Berikut adalah detail lengkap setiap controller tweak dari Wintoys:


### Kategori: Health

| Fitur (Key) | Registry SubKey | Value / Action | Ringkasan Logika |
|---|---|---|---|
| **AppUpdates** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsStore\\WindowsUpdate<br>SOFTWARE\\Policies\\Microsoft\\WindowsStore` | `AutoDownload` | Modifies Service |
| **CoInstallers** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Device Installer` | `DisableCoInstallers` | Modifies Service |
| **DeviceMetadata** | `SOFTWARE\\Policies\\Microsoft\\Windows\\Device Metadata` | `PreventDeviceMetadataFromNetwork` | Modifies Service |
| **DriverUpdates** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DriverSearching<br>SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate` | `ExcludeWUDriversInQualityUpdate<br>SearchOrderConfig` | Modifies Service |
| **FastStartup** | `SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power` | `HiberbootEnabled` | Modifies Service, Power Management |
| **Hibernation** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service, Power Management |
| **StorageOptimization** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service |
| **StorageSense** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy` | `01` | Modifies Service |
| **SystemUpdates** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service |


### Kategori: Optimizations

| Fitur (Key) | Registry SubKey | Value / Action | Ringkasan Logika |
|---|---|---|---|
| **ActivityHistory** | `SOFTWARE\\Policies\\Microsoft\\Windows\\System` | `EnableActivityFeed<br>UploadUserActivities<br>PublishUserActivities` | Modifies Service |
| **BackgroundApps** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search<br>SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications` | `GlobalUserDisabled<br>BackgroundAppGlobalToggle` | Modifies Service |
| **DelayStartupApps** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize` | `WaitforIdleState<br>StartupDelayInMSec` | Modifies Service |
| **DeliveryOptimization** | `S-1-5-20\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Settings` | `DownloadMode` | Modifies Service |
| **GPUScheduling** | `SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers` | `HwSchMode` | Modifies Service |
| **GameMode** | `SOFTWARE\\Microsoft\\GameBar` | `AutoGameModeEnabled` | Modifies Service |
| **NetworkAdapter** | `SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters` | `DisableTaskOffload` | Modifies Service |
| **NotifyStartupApps** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\Windows.SystemToast.StartupApp` | `Enabled` | Modifies Service |
| **RecordHighlights** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\GameDVR` | `HistoricalCaptureEnabled` | Modifies Service |
| **RelaunchApps** | `SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon` | `RestartApps` | Modifies Service |
| **SearchIndexing** | `SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search` | `PreventUsingAdvancedIndexingOptions` | Modifies Service |
| **Superfetch** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service |
| **Transparency** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize` | `EnableTransparency` | Modifies Service |
| **UltimatePerformance** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service, Power Management |
| **VBS** | `SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity<br>SYSTEM\\CurrentControlSet\\Control\\DeviceGuard` | `EnableVirtualizationBasedSecurity<br>Enabled` | Modifies Service |
| **VisualEffects** | `Control Panel\\Desktop<br>SOFTWARE\\Microsoft\\Windows\\DWM<br>Control Panel\\Desktop\\WindowMetrics<br>SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced<br>SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects` | `AlwaysHibernateThumbnails<br>VisualFXSetting<br>FontSmoothing<br>DragFullWindows<br>UserPreferencesMask<br>EnableAeroPeek<br>MinAnimate<br>DisablePreviewDesktop<br>ListviewShadow<br>ListviewAlphaSelect<br>IconsOnly` | Modifies Service |
| **WindowedOptimizations** | `SOFTWARE\\Microsoft\\DirectX\\UserGpuPreferences` | `DirectXUserGlobalSettings` | Modifies Service |


### Kategori: Tweaks.Ads

| Fitur (Key) | Registry SubKey | Value / Action | Ringkasan Logika |
|---|---|---|---|
| **Advertising** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo` | `Enabled` | Modifies Service |
| **FunFacts** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager` | `SubscribedContent-338387Enabled<br>RotatingLockScreenOverlayEnabled` | Modifies Service |
| **HomeInSettings** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer` | `SettingsPageVisibility` | Modifies Service |
| **SuggestedNotifications** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\Windows.SystemToast.Suggested` | `Enabled` | Modifies Service |
| **SuggestionsInSettings** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager` | `SubscribedContent-353694Enabled<br>SubscribedContent-338393Enabled<br>SubscribedContent-353696Enabled` | Modifies Service |
| **TailoredExperiences** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Privacy` | `TailoredExperiencesWithDiagnosticDataEnabled` | Modifies Service |
| **WindowsSetup** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\UserProfileEngagement` | `ScoobeSystemSettingEnabled` | Modifies Service |
| **WindowsTips** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager` | `SubscribedContent-338389Enabled` | Modifies Service |
| **WindowsWelcome** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager` | `SubscribedContent-310093Enabled` | Modifies Service |


### Kategori: Tweaks.Desktop

| Fitur (Key) | Registry SubKey | Value / Action | Ringkasan Logika |
|---|---|---|---|
| **AeroShake** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `DisallowShaking` | Modifies Service |
| **ClassicMenu** | `SOFTWARE\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32` | `-(None/Direct)-` | Modifies Service, CLSID/Subkey tree modification |
| **DropShadows** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `ListviewShadow` | Modifies Service |
| **PeekPreview** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `DisablePreviewDesktop` | Modifies Service |
| **RecycleBin** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons<br>ClassicStartMenu<br>NewStartPanel` | `{645FF040-5081-101B-9F08-00AA002F954E}` | Modifies Service |
| **ShortcutArrow** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Icons` | `29` | Modifies Service |
| **ShowDesktop** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `TaskbarSd` | Modifies Service |
| **ThisPC** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons<br>ClassicStartMenu<br>NewStartPanel` | `{20D04FE0-3AEA-1069-A2D8-08002B30309D}` | Modifies Service |
| **WallpaperQuality** | `Control Panel\\Desktop` | `JPEGImportQuality` | Modifies Service |
| **Widgets** | `SOFTWARE\\Policies\\Microsoft\\Dsh<br>SOFTWARE\\Microsoft\\PolicyManager\\default\\NewsAndInterests\\AllowNewsAndInterests` | `Value<br>AllowNewsAndInterests` | Modifies Service |


### Kategori: Tweaks.FileExplorer

| Fitur (Key) | Registry SubKey | Value / Action | Ringkasan Logika |
|---|---|---|---|
| **Checkboxes** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `AutoCheckSelect` | Modifies Service |
| **ClassicInterface** | `SOFTWARE\\Classes\\CLSID\\{6480100b-5a83-4d1e-9f69-8ae5a88e9a33}<br>SOFTWARE\\Microsoft\\Internet Explorer\\Toolbar\\ShellBrowser<br>SOFTWARE\\Classes\\CLSID\\{2aa9162e-c906-4dd9-ad0b-3d24a8eef5a0}<br>InProcServer32` | `ITBar7Layout<br>ThreadingModel` | Modifies Service, CLSID/Subkey tree modification |
| **Extensions** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service |
| **HiddenItems** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service |
| **NavigationPaneGallery** | `SOFTWARE\\Classes\\CLSID\\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}` | `System.IsPinnedToNameSpaceTree` | Modifies Service |
| **NavigationPaneHome** | `SOFTWARE\\Classes\\CLSID\\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}` | `System.IsPinnedToNameSpaceTree` | Modifies Service |
| **NavigationPaneRecycleBin** | `SOFTWARE\\Classes\\CLSID\\{645FF040-5081-101B-9F08-00AA002F954E}` | `System.IsPinnedToNameSpaceTree` | Modifies Service |
| **OpenTo** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `LaunchTo` | Modifies Service |
| **PreviewPane** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Modules\\GlobalSettings\\Sizer<br>SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Modules\\GlobalSettings\\DetailsContainer` | `DetailsContainer<br>DetailsContainerSizer` | Modifies Service |
| **ShowFilesAfterExtraction** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ExtractionWizard` | `ShowFiles` | Modifies Service |
| **SyncProviderNotifications** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `ShowSyncProviderNotifications` | Modifies Service |


### Kategori: Tweaks.Privacy

| Fitur (Key) | Registry SubKey | Value / Action | Ringkasan Logika |
|---|---|---|---|
| **AppTelemetry** | `SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat` | `AITEnable` | Modifies Service |
| **AppTracking** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `Start_TrackProgs` | Modifies Service |
| **CEIP** | `SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows` | `CEIPEnable` | Modifies Service |
| **CameraIndicator** | `SOFTWARE\\Microsoft\\OEM\\Device\\Capture` | `NoPhysicalCameraLED` | Modifies Service |
| **CameraOnLockscreen** | `SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization` | `NoLockScreenCamera` | Modifies Service |
| **ErrorReporting** | `SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting` | `Disabled` | Modifies Service |
| **InkingTypingImprove** | `SOFTWARE\\Microsoft\\Input\\TIPC` | `Enabled` | Modifies Service |
| **InkingTypingPersonalize** | `SOFTWARE\\Microsoft\\InputPersonalization<br>SOFTWARE\\Microsoft\\Personalization\\Settings<br>SOFTWARE\\Microsoft\\InputPersonalization\\TrainedDataStore<br>SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CPSS\\Store\\InkingAndTypingPersonalization` | `HarvestContacts<br>Value<br>AcceptedPrivacyPolicy<br>RestrictImplicitTextCollection<br>RestrictImplicitInkCollection` | Modifies Service |
| **Location** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location` | `Value` | Modifies Service |
| **SpeechRecognition** | `SOFTWARE\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy` | `HasAccepted` | Modifies Service |
| **Telemetry** | `SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection<br>SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection\\Users\\` | `AllowTelemetry` | Modifies Service |


### Kategori: Tweaks.StartMenu

| Fitur (Key) | Registry SubKey | Value / Action | Ringkasan Logika |
|---|---|---|---|
| **AccountNotifications** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `Start_AccountNotifications` | Modifies Service |
| **AutoinstallSuggestions** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager<br>SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent` | `PreInstalledAppsEverEnabled<br>PreInstalledAppsEnabled<br>SilentInstalledAppsEnabled<br>OemPreInstalledAppsEnabled<br>DisableWindowsConsumerFeatures` | Modifies Service |
| **RecentItemsTracking** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `Start_TrackDocs` | Modifies Service |
| **Recommendations** | `SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer` | `HideRecommendedSection` | Modifies Service |
| **SearchWebResults** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search` | `BingSearchEnabled` | Modifies Service |
| **ShowHibernate** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FlyoutMenuSettings` | `ShowHibernateOption` | Modifies Service |
| **ShowSuggestions** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager` | `SubscribedContent-338388Enabled` | Modifies Service |


### Kategori: Tweaks.Superuser

| Fitur (Key) | Registry SubKey | Value / Action | Ringkasan Logika |
|---|---|---|---|
| **DeveloperMode** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppModelUnlock` | `AllowDevelopmentWithoutDevLicense` | Modifies Service |
| **GodMode** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service |
| **UAC** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System` | `EnableLUA<br>ConsentPromptBehaviorAdmin<br>PromptOnSecureDesktop` | Modifies Service |
| **UCPD** | `SYSTEM\\CurrentControlSet\\Services\\UCPD` | `Start` | Modifies Service |


### Kategori: Tweaks.System

| Fitur (Key) | Registry SubKey | Value / Action | Ringkasan Logika |
|---|---|---|---|
| **-DigitalMarketsActController-FCB02297EFFB7B065F5DEBF246B84CFB3EFD0D80F99777D7626ABE0019B17C106__Conditions.cs** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service |
| **-DigitalMarketsActController-FCB02297EFFB7B065F5DEBF246B84CFB3EFD0D80F99777D7626ABE0019B17C106__Policy.cs** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service |
| **-DigitalMarketsActController-FCB02297EFFB7B065F5DEBF246B84CFB3EFD0D80F99777D7626ABE0019B17C106__PolicySet.cs** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service |
| **-DigitalMarketsActController-FCB02297EFFB7B065F5DEBF246B84CFB3EFD0D80F99777D7626ABE0019B17C106__Region.cs** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service |
| **-DigitalMarketsActController-FCB02297EFFB7B065F5DEBF246B84CFB3EFD0D80F99777D7626ABE0019B17C106__SingleLineListConverter.cs** | `-(Custom/Service/WMI)-` | `-(None/Direct)-` | Modifies Service |
| **AltTab** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `MultiTaskingAltTabFilter` | Modifies Service |
| **Clipboard** | `SOFTWARE\\Microsoft\\Clipboard` | `EnableClipboardHistory` | Modifies Service |
| **ClockWithSeconds** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced` | `ShowSecondsInSystemClock` | Modifies Service |
| **DMA** | `SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Microsoft Edge` | `NoRemove` | Modifies Service |
| **EndTask** | `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings` | `TaskbarEndTask` | Modifies Service |
| **FeedbackNotify** | `SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection` | `DoNotShowFeedbackNotifications` | Modifies Service |
| **MouseAcceleration** | `Control Panel\\Mouse` | `MouseThreshold1<br>MouseThreshold2<br>MouseSpeed` | Modifies Service |
| **Numlock** | `.DEFAULT\\Control Panel\\Keyboard` | `InitialKeyboardIndicators` | Modifies Service |
| **SnippingKey** | `Control Panel\\Keyboard` | `PrintScreenKeyForSnippingEnabled` | Modifies Service |
