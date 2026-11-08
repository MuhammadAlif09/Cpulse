// main.rs — CPulse Pure-Rust GPU-Rendered Desktop UI powered by `anomalyco/rune`
//
// Eliminates `msedgewebview2.exe` completely by rendering all 8 tabs, live hardware
// telemetry waveforms, radial gauges, virtualized tables, dialogs, system tray,
// and native Windows notifications directly through Rune's wgpu DX12 pipeline.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod backend;
pub mod charts;
pub mod cleaner;
pub mod i18n;
pub mod icons;
pub mod tweaks;

use backend::{
    add_startup_item_sync, apply_boost_sync, clean_ram_sync, cleanup_typeperf,
    collect_system_metrics, delete_startup_item_sync, flush_dns_sync,
    generate_diagnostics_report_sync, get_disk_details, get_startup_items_sync,
    get_windows_key_sync, list_diagnostics_reports, restore_boost_sync, scan_privacy_sync,
    set_power_plan_sync, spawn_typeperf_listener, sweep_privacy_sync, toggle_autostart_sync,
    toggle_context_menu_sync, toggle_startup_item_sync, update_auto_clean_sync, PrivacyItemState,
    StartupItem, SystemMetrics, WindowsKeyInfo,
};
use cleaner::{
    clean_junk_with_progress, format_size, open_audit_log, scan_junk_with_progress, JunkItem,
};
use i18n::{build_catalog, tr};
use rune::dirs::AppDirs;
use rune::prefs::Prefs;
use rune::tray::{Tray, TrayEvent, TrayIcon, TrayItem, TraySpec};
use rune::*;
use rune_i18n::Catalog;
use rune_kit::shell::{PaneState, Sidebar, SidebarRow, SidebarSection, SplitView, Toolbar};
use rune_kit::*;
use rune_notify::{Identity, Notification, Urgency};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::Duration;
use sysinfo::{Components, Disks, Networks, System};

static GLOBAL_HANDLE: OnceLock<AppHandle<CpulseApp>> = OnceLock::new();

fn app_handle() -> Option<AppHandle<CpulseApp>> {
    GLOBAL_HANDLE.get().cloned()
}

// ─── Navigation Tabs ──────────────────────────────────────────────────

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub enum Tab {
    Dashboard,
    Cleaner,
    Booster,
    Startup,
    Privacy,
    Diagnostics,
    History,
    Settings,
}

impl Tab {
    pub const ALL: [Tab; 8] = [
        Tab::Dashboard,
        Tab::Cleaner,
        Tab::Booster,
        Tab::Startup,
        Tab::Privacy,
        Tab::Diagnostics,
        Tab::History,
        Tab::Settings,
    ];

    pub fn i18n_key(self) -> &'static str {
        match self {
            Tab::Dashboard => "dashboard",
            Tab::Cleaner => "cleaner",
            Tab::Booster => "booster",
            Tab::Startup => "startup",
            Tab::Privacy => "privacy",
            Tab::Diagnostics => "diagnostics",
            Tab::History => "history",
            Tab::Settings => "settings",
        }
    }

    pub fn icon(self) -> &'static Icon {
        match self {
            Tab::Dashboard => &icons::DASHBOARD,
            Tab::Cleaner => &icons::TRASH,
            Tab::Booster => &icons::BOLT,
            Tab::Startup => &icons::ROCKET,
            Tab::Privacy => &icons::SHIELD,
            Tab::Diagnostics => &icons::ACTIVITY,
            Tab::History => &icons::CLOCK,
            Tab::Settings => &icons::SETTINGS,
        }
    }
}

// ─── Persisted User Settings & History ────────────────────────────────

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct UserSettings {
    pub theme: String, // "dark" | "light" | "auto"
    pub language: String, // "en" | "id"
    pub auto_clean: bool,
    pub start_on_boot: bool,
    pub real_time_monitor: bool,
    pub notifications: bool,
    pub sound_effects: bool,
    pub context_menu: bool,
    pub auto_update: bool,
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            theme: "dark".into(),
            language: "en".into(),
            auto_clean: false,
            start_on_boot: false,
            real_time_monitor: true,
            notifications: true,
            sound_effects: true,
            context_menu: false,
            auto_update: true,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct HistoryEntry {
    pub date: String,
    pub freed: String,
    pub freed_bytes: u64,
    pub fixed: usize,
    pub duration: String,
    pub kind: String,
}

#[derive(Clone, Debug)]
pub struct BoostOption {
    pub id: &'static str,
    pub title: &'static str,
    pub desc: &'static str,
    pub impact: &'static str,
    pub requires_admin: bool,
    pub active: bool,
    pub busy: bool,
}

#[derive(Clone, Debug)]
pub struct ToastItem {
    pub id: u64,
    pub title: String,
    pub description: String,
}

// ─── Main Application State ───────────────────────────────────────────

pub struct CpulseApp {
    pub active_tab: Tab,
    pub sidebar: PaneState,
    pub settings: UserSettings,
    pub catalog: Catalog,
    pub is_admin: bool,
    pub clock_text: String,

    // Real-time Hardware Telemetry (60-sample rolling buffers)
    pub metrics: SystemMetrics,
    pub cpu_history: VecDeque<f32>,
    pub ram_history: VecDeque<f32>,
    pub disk_read_history: VecDeque<f32>,
    pub disk_write_history: VecDeque<f32>,
    pub net_down_history: VecDeque<f32>,
    pub net_up_history: VecDeque<f32>,

    // Cleaner State
    pub junk_items: Vec<JunkItem>,
    pub is_scanning: bool,
    pub is_cleaning: bool,
    pub cleaner_progress: u8,
    pub scan_cancel: Arc<AtomicBool>,
    pub confirm_sensitive_open: bool,

    // Booster State
    pub power_profile_idx: usize, // 0 = Balanced, 1 = Performance, 2 = Gaming
    pub boosts: Vec<BoostOption>,
    pub ram_cleaning: bool,

    // Startup Manager State
    pub startup_items: Vec<StartupItem>,
    pub startup_table: TableState,
    pub startup_search: TextEdit,
    pub new_startup_name: TextEdit,
    pub new_startup_path: TextEdit,
    pub add_startup_open: bool,

    // Privacy Care State
    pub privacy_items: Vec<PrivacyItemState>,
    pub is_scanning_privacy: bool,
    pub is_sweeping_privacy: bool,

    // Diagnostics State
    pub reports: Vec<String>,
    pub active_report_name: String,
    pub active_report_body: String,
    pub is_generating_report: bool,

    // History State
    pub history_logs: Vec<HistoryEntry>,
    pub history_table: TableState,

    // Settings / License Key State
    pub win_key: WindowsKeyInfo,
    pub reveal_win_key: bool,

    // Notifications & Toasts
    pub notif_popover_open: bool,
    pub toasts: Vec<ToastItem>,
    pub next_toast_id: u64,
}

impl CpulseApp {
    pub fn init() -> Self {
        let mut settings = UserSettings::default();
        let mut history_logs = Vec::new();

        if let Ok(prefs) = Prefs::open("com.cpulse.app") {
            if let Some(saved_settings) = prefs.get::<UserSettings>("user-settings") {
                settings = saved_settings;
            }
            if let Some(saved_history) = prefs.get::<Vec<HistoryEntry>>("cleaning-history") {
                history_logs = saved_history;
            }
        }

        let startup_items = get_startup_items_sync().unwrap_or_default();
        let privacy_items = scan_privacy_sync();
        let reports_dir = AppDirs::new("com.cpulse.app")
            .map(|d| d.data().join("reports"))
            .unwrap_or_else(|| std::env::temp_dir().join("cpulse_reports"));
        let reports = list_diagnostics_reports(&reports_dir);

        let mut cpu_history = VecDeque::with_capacity(60);
        let mut ram_history = VecDeque::with_capacity(60);
        let mut disk_read_history = VecDeque::with_capacity(60);
        let mut disk_write_history = VecDeque::with_capacity(60);
        let mut net_down_history = VecDeque::with_capacity(60);
        let mut net_up_history = VecDeque::with_capacity(60);
        for _ in 0..30 {
            cpu_history.push_back(0.0);
            ram_history.push_back(0.0);
            disk_read_history.push_back(0.0);
            disk_write_history.push_back(0.0);
            net_down_history.push_back(0.0);
            net_up_history.push_back(0.0);
        }

        Self {
            active_tab: Tab::Dashboard,
            sidebar: PaneState::new(236.0).range(190.0, 310.0),
            settings,
            catalog: build_catalog(),
            is_admin: is_elevated::is_elevated(),
            clock_text: chrono::Local::now().format("%H:%M:%S").to_string(),
            metrics: SystemMetrics::default(),
            cpu_history,
            ram_history,
            disk_read_history,
            disk_write_history,
            net_down_history,
            net_up_history,
            junk_items: Vec::new(),
            is_scanning: false,
            is_cleaning: false,
            cleaner_progress: 0,
            scan_cancel: Arc::new(AtomicBool::new(false)),
            confirm_sensitive_open: false,
            power_profile_idx: 0,
            boosts: default_boost_options(),
            ram_cleaning: false,
            startup_items,
            startup_table: TableState::new(),
            startup_search: TextEdit::new(),
            new_startup_name: TextEdit::new(),
            new_startup_path: TextEdit::new(),
            add_startup_open: false,
            privacy_items,
            is_scanning_privacy: false,
            is_sweeping_privacy: false,
            reports,
            active_report_name: String::new(),
            active_report_body: String::new(),
            is_generating_report: false,
            history_logs,
            history_table: TableState::new(),
            win_key: WindowsKeyInfo {
                key: String::new(),
                key_type: "Checking...".into(),
                edition: "Windows 11".into(),
                is_valid: false,
            },
            reveal_win_key: false,
            notif_popover_open: false,
            toasts: Vec::new(),
            next_toast_id: 1,
        }
    }

    pub fn push_toast(&mut self, title: impl Into<String>, desc: impl Into<String>) {
        let title_str = title.into();
        let desc_str = desc.into();
        let id = self.next_toast_id;
        self.next_toast_id += 1;
        self.toasts.push(ToastItem {
            id,
            title: title_str.clone(),
            description: desc_str.clone(),
        });
        if self.toasts.len() > 4 {
            self.toasts.remove(0);
        }

        if self.settings.notifications {
            let _ = rune_notify::post(
                Notification::new(format!("cpulse-{}", id), title_str)
                    .body(desc_str)
                    .urgency(Urgency::Normal),
            );
        }
    }

    pub fn save_prefs(&self) {
        if let Ok(mut prefs) = Prefs::open("com.cpulse.app") {
            prefs.set("user-settings", &self.settings);
            prefs.set("cleaning-history", &self.history_logs);
            let _ = prefs.save();
        }
    }

    pub fn record_history(
        &mut self,
        freed_bytes: u64,
        fixed: usize,
        duration_secs: f64,
        kind: &str,
    ) {
        let entry = HistoryEntry {
            date: chrono::Local::now()
                .format("%b %d, %Y, %I:%M %p")
                .to_string(),
            freed: format_size(freed_bytes),
            freed_bytes,
            fixed,
            duration: format!("{:.1}s", duration_secs),
            kind: kind.to_string(),
        };
        self.history_logs.insert(0, entry);
        self.save_prefs();
    }

    pub fn health_score(&self) -> u32 {
        let mut score = 100i32;
        if self.metrics.cpu_usage > 85.0 {
            score -= 15;
        } else if self.metrics.cpu_usage > 65.0 {
            score -= 7;
        }
        if self.metrics.ram_usage > 85.0 {
            score -= 15;
        } else if self.metrics.ram_usage > 70.0 {
            score -= 8;
        }
        let junk_bytes: u64 = self.junk_items.iter().map(|i| i.bytes).sum();
        if junk_bytes > 2_000_000_000 {
            score -= 15;
        } else if junk_bytes > 500_000_000 {
            score -= 8;
        }
        let high_startup = self
            .startup_items
            .iter()
            .filter(|i| i.enabled && i.impact == "High")
            .count();
        score -= (high_startup as i32 * 3).min(12);
        score.clamp(35, 100) as u32
    }

    pub fn kit(&self, cx: &ViewCx) -> Kit {
        // Centralized Soft Dark Palette (matching theme.css & tokens.ts):
        // bg:     #14181C -> rgb(20, 24, 28)
        // card:   #1B2127 -> rgb(27, 33, 39)
        // border: #2A323A -> rgb(42, 50, 58)
        // fg:     #E4E8EB -> rgb(228, 232, 235)
        // muted:  #8E99A3 -> rgb(142, 153, 163)
        // accent: #7FB5A3 -> rgb(127, 181, 163)
        // good:   #8FBF9F -> rgb(143, 191, 159)
        // warn:   #D9B26F -> rgb(217, 178, 111)
        // bad:    #D98880 -> rgb(217, 136, 128)
        let dark = match self.settings.theme.as_str() {
            "light" => false,
            "auto" => cx.theme() != ThemeMode::Light,
            _ => true,
        };
        let seed = if dark {
            PaletteSeed {
                bg: rgb(20, 24, 28),      // #14181C
                fg: rgb(228, 232, 235),   // #E4E8EB
                accent: rgb(127, 181, 163), // #7FB5A3
            }
        } else {
            PaletteSeed {
                bg: rgb(248, 250, 252),
                fg: rgb(20, 24, 28),
                accent: rgb(127, 181, 163),
            }
        };
        let mut kit = Kit::from_palette(seed).with_spring(Spring::snappy());
        if dark {
            kit.neutral.bg = rgb(20, 24, 28);            // #14181C
            kit.neutral.bg_subtle = rgb(27, 33, 39);     // #1B2127
            kit.neutral.border = rgb(42, 50, 58);        // #2A323A
            kit.neutral.border_subtle = rgb(42, 50, 58); // #2A323A
            kit.neutral.text = rgb(228, 232, 235);       // #E4E8EB
            kit.neutral.text_subtle = rgb(142, 153, 163);// #8E99A3
            kit.accent.solid = rgb(127, 181, 163);       // #7FB5A3
            kit.accent.text = rgb(127, 181, 163);        // #7FB5A3
            kit.accent.soft = rgba(127, 181, 163, 0.14); // #7FB5A3 soft
            kit.danger.solid = rgb(217, 136, 128);       // #D98880
            kit.danger.text = rgb(217, 136, 128);        // #D98880
        }
        kit
    }

    pub fn on_key(&mut self, key: KeyEvent, tx: &mut Tx) {
        if key.modifiers.ctrl {
            match key.key {
                Key::Char('1') => self.active_tab = Tab::Dashboard,
                Key::Char('2') => self.active_tab = Tab::Cleaner,
                Key::Char('3') => self.active_tab = Tab::Booster,
                Key::Char('4') => self.active_tab = Tab::Startup,
                Key::Char('5') => self.active_tab = Tab::Privacy,
                Key::Char('6') => self.active_tab = Tab::Diagnostics,
                Key::Char('7') => self.active_tab = Tab::History,
                Key::Char('8') => self.active_tab = Tab::Settings,
                Key::Char('b') | Key::Char('B') => {
                    self.sidebar.toggle();
                    tx.redraw();
                }
                _ => {}
            }
        }
    }

    pub fn scenes() -> Vec<SceneSpec<Self>> {
        vec![
            SceneSpec {
                name: "dashboard",
                prepare: |s| s.active_tab = Tab::Dashboard,
            },
            SceneSpec {
                name: "cleaner",
                prepare: |s| s.active_tab = Tab::Cleaner,
            },
            SceneSpec {
                name: "booster",
                prepare: |s| s.active_tab = Tab::Booster,
            },
            SceneSpec {
                name: "startup",
                prepare: |s| s.active_tab = Tab::Startup,
            },
            SceneSpec {
                name: "privacy",
                prepare: |s| s.active_tab = Tab::Privacy,
            },
            SceneSpec {
                name: "diagnostics",
                prepare: |s| s.active_tab = Tab::Diagnostics,
            },
            SceneSpec {
                name: "history",
                prepare: |s| s.active_tab = Tab::History,
            },
            SceneSpec {
                name: "settings",
                prepare: |s| s.active_tab = Tab::Settings,
            },
        ]
    }

    // ─── Asynchronous Background Workers (Zero IPC) ───────────────────

    pub fn trigger_junk_scan(&mut self) {
        if self.is_scanning || self.is_cleaning {
            return;
        }
        self.is_scanning = true;
        self.cleaner_progress = 0;
        self.scan_cancel.store(false, Ordering::Relaxed);
        let cancel = self.scan_cancel.clone();

        if let Some(handle) = app_handle() {
            std::thread::spawn(move || {
                let h_prog = handle.clone();
                let res = scan_junk_with_progress(Some(&cancel), move |pct| {
                    h_prog.update(move |s, _| {
                        s.cleaner_progress = pct;
                    });
                });
                handle.update(move |s, _| {
                    s.is_scanning = false;
                    s.cleaner_progress = 100;
                    match res {
                        Ok(items) => {
                            let total_b: u64 = items.iter().map(|i| i.bytes).sum();
                            let count = items.len();
                            s.junk_items = items;
                            s.push_toast(
                                "Junk Scan Complete",
                                format!(
                                    "Found {} across {} categories.",
                                    format_size(total_b),
                                    count
                                ),
                            );
                        }
                        Err(e) => {
                            s.push_toast("Scan Failed", e);
                        }
                    }
                });
            });
        }
    }

    pub fn trigger_junk_clean(&mut self, force_confirmed: bool) {
        if self.is_scanning || self.is_cleaning {
            return;
        }
        let selected_cats: Vec<String> = self
            .junk_items
            .iter()
            .filter(|i| i.selected)
            .map(|i| i.name.clone())
            .collect();

        if selected_cats.is_empty() {
            self.push_toast("No Categories Selected", "Select at least one category to clean.");
            return;
        }

        let has_sensitive = self
            .junk_items
            .iter()
            .any(|i| i.selected && !i.warning.is_empty());

        if has_sensitive && !force_confirmed {
            self.confirm_sensitive_open = true;
            return;
        }

        self.confirm_sensitive_open = false;
        self.is_cleaning = true;
        self.cleaner_progress = 0;

        let log_dir = AppDirs::new("com.cpulse.app")
            .map(|d| d.logs().to_path_buf())
            .unwrap_or_else(std::env::temp_dir);

        if let Some(handle) = app_handle() {
            std::thread::spawn(move || {
                let start = std::time::Instant::now();
                let h_prog = handle.clone();
                let res = clean_junk_with_progress(&selected_cats, &log_dir, move |pct| {
                    h_prog.update(move |s, _| {
                        s.cleaner_progress = pct;
                    });
                });
                let elapsed = start.elapsed().as_secs_f64();
                handle.update(move |s, _| {
                    s.is_cleaning = false;
                    s.cleaner_progress = 100;
                    match res {
                        Ok(clean_res) => {
                            s.junk_items.retain(|item| !selected_cats.contains(&item.name));
                            s.record_history(
                                clean_res.bytes_freed,
                                clean_res.files_cleaned,
                                elapsed,
                                "System Clean",
                            );
                            s.push_toast(
                                "Cleanup Complete",
                                format!(
                                    "Freed {} ({} files) in {:.1}s.",
                                    format_size(clean_res.bytes_freed),
                                    clean_res.files_cleaned,
                                    elapsed
                                ),
                            );
                        }
                        Err(e) => {
                            s.push_toast("Cleanup Error", e);
                        }
                    }
                });
            });
        }
    }

    pub fn trigger_quick_clean(&mut self) {
        if self.is_scanning || self.is_cleaning {
            return;
        }
        self.is_cleaning = true;
        self.cleaner_progress = 0;
        let log_dir = AppDirs::new("com.cpulse.app")
            .map(|d| d.logs().to_path_buf())
            .unwrap_or_else(std::env::temp_dir);

        if let Some(handle) = app_handle() {
            std::thread::spawn(move || {
                let start = std::time::Instant::now();
                let h_prog = handle.clone();
                let scanned = scan_junk_with_progress(None, move |pct| {
                    h_prog.update(move |s, _| {
                        s.cleaner_progress = pct / 2;
                    });
                })
                .unwrap_or_default();

                let safe_cats: Vec<String> = scanned
                    .iter()
                    .filter(|i| i.warning.is_empty())
                    .map(|i| i.name.clone())
                    .collect();

                let h_prog2 = handle.clone();
                let cleaned = clean_junk_with_progress(&safe_cats, &log_dir, move |pct| {
                    h_prog2.update(move |s, _| {
                        s.cleaner_progress = 50 + pct / 2;
                    });
                });

                let elapsed = start.elapsed().as_secs_f64();
                handle.update(move |s, _| {
                    s.is_cleaning = false;
                    s.cleaner_progress = 100;
                    if let Ok(res) = cleaned {
                        s.junk_items = scanned
                            .into_iter()
                            .filter(|i| !safe_cats.contains(&i.name))
                            .collect();
                        s.record_history(
                            res.bytes_freed,
                            res.files_cleaned,
                            elapsed,
                            "Quick Clean",
                        );
                        s.push_toast(
                            "Quick Clean Finished",
                            format!(
                                "Freed {} across {} safe files.",
                                format_size(res.bytes_freed),
                                res.files_cleaned
                            ),
                        );
                    }
                });
            });
        }
    }

    pub fn trigger_ram_boost(&mut self) {
        if self.ram_cleaning {
            return;
        }
        self.ram_cleaning = true;
        if let Some(handle) = app_handle() {
            std::thread::spawn(move || {
                let start = std::time::Instant::now();
                let res = clean_ram_sync();
                let elapsed = start.elapsed().as_secs_f64();
                handle.update(move |s, _| {
                    s.ram_cleaning = false;
                    match res {
                        Ok(freed) => {
                            s.record_history(freed, 1, elapsed, "RAM Boost");
                            s.push_toast(
                                "RAM Trimmed",
                                format!("Working sets emptied: freed {}.", format_size(freed)),
                            );
                        }
                        Err(e) => s.push_toast("RAM Boost Failed", e),
                    }
                });
            });
        }
    }

    // ─── Main View Tree (`rune::El<Self>`) ────────────────────────────

    pub fn view(&self, cx: &ViewCx) -> El<Self> {
        let k = self.kit(cx);
        let mut layer: Vec<El<Self>> = Vec::new();

        let junk_badge = self.junk_items.len() as u32;
        let high_startup_badge = self
            .startup_items
            .iter()
            .filter(|i| i.enabled && i.impact == "High")
            .count() as u32;
        let privacy_badge = self.privacy_items.iter().filter(|i| i.found).count() as u32;

        // 1. Sidebar Navigation
        let mut nav_rows = Vec::with_capacity(Tab::ALL.len());
        for tab in Tab::ALL {
            let label = tr(&self.catalog, &self.settings.language, tab.i18n_key());
            let mut r = SidebarRow::new(label)
                .icon(tab.icon())
                .selected(self.active_tab == tab)
                .on_select(move |s: &mut Self| {
                    s.active_tab = tab;
                });

            match tab {
                Tab::Cleaner if junk_badge > 0 => r = r.badge(junk_badge),
                Tab::Startup if high_startup_badge > 0 => r = r.badge(high_startup_badge),
                Tab::Privacy if privacy_badge > 0 => r = r.badge(privacy_badge),
                _ => {}
            }
            nav_rows.push(r);
        }

        let score = self.health_score();
        let sidebar_header = row![
            col![text("⚡").size(16.0).color(k.accent.text)]
                .size(30.0)
                .rounded(8.0)
                .bg(k.accent.soft)
                .items_center()
                .justify_center(),
            col![
                text("CPulse").size(15.0).bold().color(k.neutral.text),
                text("Pure Rust • Rune GPU")
                    .size(10.5)
                    .color(k.neutral.text_subtle),
            ]
            .gap(1.0),
        ]
        .gap(10.0)
        .items_center()
        .px(8.0)
        .py(6.0);

        let sidebar_footer = col![
            row![
                ProgressCircle::new(score as f32 / 100.0)
                    .size(38.0)
                    .label("Health Score")
                    .build(&k),
                col![
                    text(format!("Health: {}%", score))
                        .size(12.5)
                        .medium()
                        .color(k.neutral.text),
                    text(if self.is_admin {
                        "Administrator (UAC)"
                    } else {
                        "Standard User"
                    })
                    .size(11.0)
                    .color(k.neutral.text_subtle),
                ]
                .gap(2.0),
            ]
            .gap(10.0)
            .items_center(),
        ]
        .p(10.0)
        .rounded(8.0)
        .bg(k.neutral.bg_subtle)
        .border(1.0, k.neutral.border_subtle);

        let sidebar = Sidebar::new()
            .header(sidebar_header)
            .section(SidebarSection::new("MODULES").rows(nav_rows))
            .footer(sidebar_footer)
            .build(&k);

        // 2. Top Toolbar
        let active_title = tr(
            &self.catalog,
            &self.settings.language,
            self.active_tab.i18n_key(),
        );
        let admin_badge = Badge::new(if self.is_admin {
            tr(&self.catalog, &self.settings.language, "admin_mode")
        } else {
            tr(&self.catalog, &self.settings.language, "standard_mode")
        })
        .variant(if self.is_admin {
            BadgeVariant::Accent
        } else {
            BadgeVariant::Neutral
        })
        .standard()
        .build(&k);

        let theme_icon = if self.settings.theme == "light" {
            &icons::SUN
        } else {
            &icons::MOON
        };
        let theme_btn = IconButton::new(theme_icon, "Toggle Theme")
            .variant(IconButtonVariant::Ghost)
            .on_press(|s: &mut Self| {
                s.settings.theme = if s.settings.theme == "light" {
                    "dark".into()
                } else {
                    "light".into()
                };
                s.save_prefs();
            })
            .build(&k);

        let notif_trigger = IconButton::new(&icons::BELL, "Notifications")
            .variant(IconButtonVariant::Ghost)
            .on_press(|s: &mut Self| {
                s.notif_popover_open = !s.notif_popover_open;
            })
            .build(&k);

        let notif_popover_content = col![
            row![
                text("System Alerts & Activity")
                    .size(13.0)
                    .semibold()
                    .color(k.neutral.text),
                spacer(),
                Badge::new(format!("{} recent", self.history_logs.len()))
                    .variant(BadgeVariant::Subtle)
                    .build(&k),
            ]
            .items_center(),
            Divider::horizontal().build(&k),
            if self.history_logs.is_empty() {
                text("No recent optimization events.")
                    .size(12.0)
                    .color(k.neutral.text_subtle)
            } else {
                col(self
                    .history_logs
                    .iter()
                    .take(4)
                    .map(|h| {
                        row![
                            col![
                                text(h.kind.clone())
                                    .size(12.0)
                                    .medium()
                                    .color(k.neutral.text),
                                text(h.date.clone())
                                    .size(10.5)
                                    .color(k.neutral.text_subtle),
                            ]
                            .gap(2.0),
                            spacer(),
                            Badge::new(h.freed.clone())
                                .variant(BadgeVariant::Accent)
                                .build(&k),
                        ]
                        .items_center()
                        .py(4.0)
                    })
                    .collect())
                .gap(4.0)
            },
        ]
        .w(280.0)
        .gap(8.0);

        let notif_anchor = Popover::new(notif_trigger, notif_popover_content)
            .open(self.notif_popover_open)
            .on_close(|s: &mut Self| s.notif_popover_open = false)
            .build(&k, &mut layer);

        let clock_badge = text(self.clock_text.clone())
            .size(12.0)
            .mono()
            .color(k.neutral.text_subtle);

        let toolbar = Toolbar::new()
            .title(active_title)
            .trailing(clock_badge)
            .trailing(admin_badge)
            .trailing(theme_btn)
            .trailing(notif_anchor);

        // 3. Active Tab Content
        let tab_body = match self.active_tab {
            Tab::Dashboard => self.view_dashboard(&k),
            Tab::Cleaner => self.view_cleaner(&k, &mut layer),
            Tab::Booster => self.view_booster(&k),
            Tab::Startup => self.view_startup(&k, &mut layer),
            Tab::Privacy => self.view_privacy(&k),
            Tab::Diagnostics => self.view_diagnostics(&k),
            Tab::History => self.view_history(&k),
            Tab::Settings => self.view_settings(&k),
        };

        let main_pane = col![tab_body]
            .flex_1()
            .w_full()
            .h_full()
            .overflow_y_scroll()
            .p(20.0);

        let shell = SplitView::new(main_pane)
            .sidebar(&self.sidebar, |s: &mut Self| &mut s.sidebar, sidebar)
            .toolbar(toolbar)
            .titlebar_inset(cx.titlebar_inset())
            .build(&k);

        // 4. Toast Notification Region
        if !self.toasts.is_empty() {
            let mut region = ToastRegion::new();
            for item in &self.toasts {
                let id_Num = item.id;
                let toast_el = Toast::new(format!("toast-{}", id_Num), item.title.clone())
                    .description(item.description.clone())
                    .on_close(move |s: &mut Self| {
                        s.toasts.retain(|t| t.id != id_Num);
                    })
                    .build(&k);
                region = region.toast(toast_el);
            }
            layer.push(region.build(&k));
        }

        rune_kit::root(shell, layer)
    }

    // ─── Tab 1: Dashboard ─────────────────────────────────────────────

    fn view_dashboard(&self, k: &Kit) -> El<Self> {
        let score = self.health_score();
        let junk_bytes: u64 = self.junk_items.iter().map(|i| i.bytes).sum();
        let cpu_samples: Vec<f32> = self.cpu_history.iter().copied().collect();
        let ram_samples: Vec<f32> = self.ram_history.iter().copied().collect();

        // Top Row: Radial Health Score Card + Quick Actions
        let health_card = Card::new()
            .accent(k.accent.solid)
            .title("System Health Overview", Some(&icons::ACTIVITY))
            .description("Real-time telemetry & optimization readiness")
            .child(
                row![
                    stack![
                        charts::health_radial_gauge(
                            score,
                            116.0,
                            k.neutral.border_subtle,
                            k.accent.solid,
                        ),
                        col![
                            text(format!("{}", score))
                                .size(26.0)
                                .bold()
                                .color(k.neutral.text),
                            text("/ 100").size(11.0).color(k.neutral.text_subtle),
                        ]
                        .items_center()
                        .justify_center()
                        .size(116.0),
                    ]
                    .size(116.0),
                    col![
                        text(if score >= 85 {
                            "System is running optimally"
                        } else if score >= 70 {
                            "Good condition — minor cleanup recommended"
                        } else {
                            "Attention needed — high load or junk buildup"
                        })
                        .size(14.0)
                        .semibold()
                        .color(k.neutral.text),
                        text(format!(
                            "CPU: {} • {:.1} / {:.1} GB RAM • {} processes",
                            self.metrics.cpu_name,
                            self.metrics.used_ram,
                            self.metrics.total_ram,
                            self.metrics.process_count
                        ))
                        .size(12.0)
                        .color(k.neutral.text_subtle),
                        row![
                            Button::new(if self.is_cleaning {
                                "Cleaning..."
                            } else {
                                "Quick Clean"
                            })
                            .variant(ButtonVariant::Contrast)
                            .leading_icon(&icons::TRASH)
                            .rolling("dash-quick-clean")
                            .disabled(self.is_cleaning || self.is_scanning)
                            .on_press(|s: &mut Self| s.trigger_quick_clean())
                            .build(k),
                            Button::new(if self.ram_cleaning {
                                "Trimming RAM..."
                            } else {
                                "Boost RAM"
                            })
                            .variant(ButtonVariant::Outline)
                            .leading_icon(&icons::BOLT)
                            .rolling("dash-ram-boost")
                            .disabled(self.ram_cleaning)
                            .on_press(|s: &mut Self| s.trigger_ram_boost())
                            .build(k),
                            Button::new("Scan Junk")
                                .variant(ButtonVariant::Ghost)
                                .leading_icon(&icons::REFRESH)
                                .on_press(|s: &mut Self| {
                                    s.active_tab = Tab::Cleaner;
                                    s.trigger_junk_scan();
                                })
                                .build(k),
                        ]
                        .gap(8.0)
                        .pt(4.0),
                    ]
                    .gap(6.0)
                    .flex_1(),
                ]
                .gap(20.0)
                .items_center(),
            )
            .build(k);

        // 4 KPI Metric Cards
        let kpi_row = row![
            Card::new()
                .title("CPU Load", Some(&icons::CPU))
                .description(format!(
                    "{} cores • {:.0}°C",
                    self.metrics.cpu_cores.len(),
                    self.metrics.cpu_temp
                ))
                .child(
                    text(format!("{:.1}%", self.metrics.cpu_usage))
                        .size(22.0)
                        .bold()
                        .mono()
                        .color(k.neutral.text),
                )
                .build(k)
                .flex_1(),
            Card::new()
                .title("Memory Usage", Some(&icons::MEMORY))
                .description(format!(
                    "{:.1} GB / {:.1} GB",
                    self.metrics.used_ram, self.metrics.total_ram
                ))
                .child(
                    text(format!("{:.1}%", self.metrics.ram_usage))
                        .size(22.0)
                        .bold()
                        .mono()
                        .color(k.neutral.text),
                )
                .build(k)
                .flex_1(),
            Card::new()
                .title("Junk Detected", Some(&icons::TRASH))
                .description(format!("{} categories found", self.junk_items.len()))
                .child(
                    text(format_size(junk_bytes))
                        .size(22.0)
                        .bold()
                        .mono()
                        .color(k.accent.text),
                )
                .build(k)
                .flex_1(),
            Card::new()
                .title("Network I/O", Some(&icons::WIFI))
                .description(format!("Up {:.2} MB", self.metrics.network_up))
                .child(
                    text(format!("↓ {:.2} MB", self.metrics.network_down))
                        .size(22.0)
                        .bold()
                        .mono()
                        .color(k.neutral.text),
                )
                .build(k)
                .flex_1(),
        ]
        .gap(12.0)
        .w_full();

        // Live GPU Vector Waveform Charts (CPU & RAM)
        let charts_row = row![
            Card::new()
                .title("Real-Time CPU Telemetry (60s)", Some(&icons::CPU))
                .description(self.metrics.cpu_name.clone())
                .child(charts::area_chart(
                    &cpu_samples,
                    100.0,
                    440.0,
                    130.0,
                    k.accent.solid,
                    k.accent.soft,
                    k.neutral.border_subtle,
                ))
                .build(k)
                .flex_1(),
            Card::new()
                .title("Real-Time Memory Telemetry (60s)", Some(&icons::MEMORY))
                .description(format!(
                    "Available: {:.2} GB",
                    (self.metrics.total_ram - self.metrics.used_ram).max(0.0)
                ))
                .child(charts::area_chart(
                    &ram_samples,
                    100.0,
                    440.0,
                    130.0,
                    k.accent.solid,
                    k.accent.soft,
                    k.neutral.border_subtle,
                ))
                .build(k)
                .flex_1(),
        ]
        .gap(12.0)
        .w_full();

        // Storage Drives Overview
        let disks_children: Vec<El<Self>> = self
            .metrics
            .disks
            .iter()
            .map(|d| {
                let ratio = if d.total > 0.0 {
                    (d.used / d.total).clamp(0.0, 1.0) as f32
                } else {
                    0.0
                };
                col![
                    row![
                        text(format!("{} ({})", d.name, d.model))
                            .size(13.0)
                            .medium()
                            .color(k.neutral.text),
                        Badge::new(d.disk_type.clone())
                            .variant(BadgeVariant::Subtle)
                            .build(k),
                        spacer(),
                        text(format!("{:.1} GB / {:.1} GB", d.used, d.total))
                            .size(12.0)
                            .mono()
                            .color(k.neutral.text_subtle),
                    ]
                    .gap(8.0)
                    .items_center(),
                    Progress::new(Some(ratio)).show_value().build(k),
                ]
                .gap(6.0)
            })
            .collect();

        let storage_card = Card::new()
            .title("Storage Volumes", Some(&icons::HARD_DRIVE))
            .description(format!(
                "Read {:.2} MB/s • Write {:.2} MB/s",
                self.metrics.disk_read_speed, self.metrics.disk_write_speed
            ))
            .child(col(disks_children).gap(12.0).w_full())
            .build(k);

        col![health_card, kpi_row, charts_row, storage_card]
            .gap(14.0)
            .w_full()
    }

    // ─── Tab 2: Smart Junk Cleaner ────────────────────────────────────

    fn view_cleaner(&self, k: &Kit, layer: &mut Vec<El<Self>>) -> El<Self> {
        let total_selected_bytes: u64 = self
            .junk_items
            .iter()
            .filter(|i| i.selected)
            .map(|i| i.bytes)
            .sum();
        let selected_count = self.junk_items.iter().filter(|i| i.selected).count();

        let header_card = Card::new()
            .accent(k.accent.solid)
            .title("Smart Junk Cleaner (13 Categories)", Some(&icons::TRASH))
            .description(format!(
                "Selected: {} across {} categories",
                format_size(total_selected_bytes),
                selected_count
            ))
            .action(
                row![
                    Button::new("View Audit Log")
                        .variant(ButtonVariant::Ghost)
                        .control_size(ControlSize::Small)
                        .on_press(|s: &mut Self| {
                            let log_dir = AppDirs::new("com.cpulse.app")
                                .map(|d| d.logs().to_path_buf())
                                .unwrap_or_else(std::env::temp_dir);
                            match open_audit_log(&log_dir) {
                                Ok(msg) => s.push_toast("Audit Log", msg),
                                Err(e) => s.push_toast("Audit Log", e),
                            }
                        })
                        .build(k),
                    Button::new("Safe Only")
                        .variant(ButtonVariant::Outline)
                        .control_size(ControlSize::Small)
                        .on_press(|s: &mut Self| {
                            for item in &mut s.junk_items {
                                item.selected = item.warning.is_empty();
                            }
                        })
                        .build(k),
                    Button::new("Select All")
                        .variant(ButtonVariant::Outline)
                        .control_size(ControlSize::Small)
                        .on_press(|s: &mut Self| {
                            for item in &mut s.junk_items {
                                item.selected = true;
                            }
                        })
                        .build(k),
                    Button::new(if self.is_scanning {
                        "Scanning..."
                    } else {
                        "Scan System"
                    })
                    .variant(ButtonVariant::Neutral)
                    .leading_icon(&icons::REFRESH)
                    .rolling("cleaner-scan-btn")
                    .disabled(self.is_scanning || self.is_cleaning)
                    .on_press(|s: &mut Self| s.trigger_junk_scan())
                    .build(k),
                    Button::new(if self.is_cleaning {
                        "Cleaning..."
                    } else {
                        "Clean Selected"
                    })
                    .variant(ButtonVariant::Contrast)
                    .leading_icon(&icons::TRASH)
                    .rolling("cleaner-clean-btn")
                    .disabled(self.is_scanning || self.is_cleaning || selected_count == 0)
                    .on_press(|s: &mut Self| s.trigger_junk_clean(false))
                    .build(k),
                ]
                .gap(8.0)
                .items_center(),
            )
            .child(when(self.is_scanning || self.is_cleaning, || {
                Progress::new(Some(self.cleaner_progress as f32 / 100.0))
                    .label(if self.is_scanning {
                        "Scanning junk directories..."
                    } else {
                        "Purging selected junk categories..."
                    })
                    .show_value()
                    .build(k)
            }))
            .build(k);

        let list_body = if self.junk_items.is_empty() {
            Card::new()
                .title("Ready to Scan", None)
                .description(
                    "Click 'Scan System' to inspect temporary folders, browser caches, shader caches, crash dumps, and Recycle Bin.",
                )
                .build(k)
        } else {
            let mut rows = Vec::with_capacity(self.junk_items.len());
            for (idx, item) in self.junk_items.iter().enumerate() {
                let row_card = row![
                    Checkbox::new(item.selected)
                        .label(item.name.clone())
                        .description(item.description.clone())
                        .on_toggle(move |s: &mut Self, checked| {
                            if let Some(target) = s.junk_items.get_mut(idx) {
                                target.selected = checked;
                            }
                        })
                        .build(k),
                    spacer(),
                    when(item.requires_admin, || {
                        Badge::new("Admin")
                            .variant(BadgeVariant::Subtle)
                            .build(k)
                    }),
                    when(!item.warning.is_empty(), || {
                        Badge::new(item.warning.clone())
                            .variant(BadgeVariant::Accent)
                            .build(k)
                    }),
                    Badge::new(format!("{} files", item.count))
                        .variant(BadgeVariant::Neutral)
                        .build(k),
                    text(item.size.clone())
                        .size(13.5)
                        .semibold()
                        .mono()
                        .color(k.accent.text),
                ]
                .gap(10.0)
                .items_center()
                .p(12.0)
                .rounded(8.0)
                .bg(k.neutral.bg_subtle)
                .border(1.0, k.neutral.border_subtle);

                rows.push(row_card);
            }
            col(rows).gap(8.0).w_full()
        };

        // Sensitive Confirmation Dialog (`rune_kit::Dialog`)
        Dialog::new("confirm-sensitive-clean", "Confirm Sensitive Cleanup")
            .open(self.confirm_sensitive_open)
            .fit()
            .description(
                "One or more selected categories (such as Recycle Bin, Windows Update Cache, or Prefetch Cache) permanently remove cached items.",
            )
            .child(
                row![
                    spacer(),
                    Button::new("Cancel")
                        .variant(ButtonVariant::Ghost)
                        .on_press(|s: &mut Self| s.confirm_sensitive_open = false)
                        .build(k),
                    Button::new("Confirm & Clean")
                        .variant(ButtonVariant::Danger)
                        .on_press(|s: &mut Self| s.trigger_junk_clean(true))
                        .build(k),
                ]
                .gap(8.0),
            )
            .on_close(|s: &mut Self| s.confirm_sensitive_open = false)
            .build(k, layer);

        col![header_card, list_body].gap(14.0).w_full()
    }

    // ─── Tab 3: Performance Booster ───────────────────────────────────

    fn view_booster(&self, k: &Kit) -> El<Self> {
        let profile_card = Card::new()
            .accent(k.accent.solid)
            .title("Windows Power & Performance Profile", Some(&icons::BOLT))
            .description(
                "Switch active Windows power scheme via powercfg and tune system responsiveness",
            )
            .action(
                SegmentedControl::new(
                    &["Balanced", "High Performance", "Gaming Mode"],
                    Some(self.power_profile_idx),
                )
                .fit()
                .on_pick(|s: &mut Self, idx| {
                    s.power_profile_idx = idx;
                    let plan = match idx {
                        1 => "performance",
                        2 => "gaming",
                        _ => "balanced",
                    };
                    match set_power_plan_sync(plan) {
                        Ok(msg) => s.push_toast("Power Profile Updated", msg),
                        Err(e) => s.push_toast("Power Profile Error", e),
                    }
                })
                .build(k),
            )
            .build(k);

        let mut boost_cards = Vec::with_capacity(self.boosts.len());
        for (idx, b) in self.boosts.iter().enumerate() {
            let id_str = b.id;
            let card = Card::new()
                .title(b.title, Some(&icons::BOLT))
                .description(b.desc)
                .action(
                    row![
                        Badge::new(b.impact)
                            .variant(BadgeVariant::Subtle)
                            .build(k),
                        Switch::new(b.active)
                            .on_toggle(move |s: &mut Self, enable| {
                                let profile = match s.power_profile_idx {
                                    1 => "performance",
                                    2 => "gaming",
                                    _ => "balanced",
                                };
                                let res = if enable {
                                    apply_boost_sync(id_str, profile)
                                } else {
                                    restore_boost_sync(id_str)
                                };
                                match res {
                                    Ok(msg) => {
                                        if let Some(item) = s.boosts.get_mut(idx) {
                                            item.active = enable;
                                        }
                                        s.push_toast("Booster", msg);
                                    }
                                    Err(e) => {
                                        s.push_toast("Booster Error", e);
                                    }
                                }
                            })
                            .build(k),
                    ]
                    .gap(8.0)
                    .items_center(),
                )
                .build(k);
            boost_cards.push(card);
        }

        col![profile_card, col(boost_cards).gap(10.0).w_full()]
            .gap(14.0)
            .w_full()
    }

    // ─── Tab 4: Startup Manager (Virtualized `rune_kit::Table`) ───────

    fn view_startup(&self, k: &Kit, layer: &mut Vec<El<Self>>) -> El<Self> {
        let query = self.startup_search.text.to_lowercase();
        let filtered: Vec<(usize, &StartupItem)> = self
            .startup_items
            .iter()
            .enumerate()
            .filter(|(_, item)| {
                query.is_empty()
                    || item.name.to_lowercase().contains(&query)
                    || item.publisher.to_lowercase().contains(&query)
                    || item.command.to_lowercase().contains(&query)
            })
            .collect();

        let top_bar = Card::new()
            .title(
                format!("Windows Startup Applications ({})", filtered.len()),
                Some(&icons::ROCKET),
            )
            .description("Manage HKCU & HKLM Run registry entries and StartupApproved state")
            .action(
                row![
                    TextInput::new(&self.startup_search)
                        .placeholder("Search startup apps...")
                        .leading_icon(&glyphs::SEARCH)
                        .clear_button()
                        .w(220.0)
                        .on_edit(|s: &mut Self, e| s.startup_search = e)
                        .build(k),
                    Button::new("Add Item")
                        .variant(ButtonVariant::Outline)
                        .leading_icon(&icons::PLUS)
                        .on_press(|s: &mut Self| s.add_startup_open = true)
                        .build(k),
                    Button::new("Disable High Impact")
                        .variant(ButtonVariant::Contrast)
                        .on_press(|s: &mut Self| {
                            let mut disabled_count = 0usize;
                            for item in &mut s.startup_items {
                                if item.enabled && item.impact == "High" {
                                    if toggle_startup_item_sync(&item.name, item.is_hkcu, false)
                                        .is_ok()
                                    {
                                        item.enabled = false;
                                        item.impact = "None".into();
                                        item.delay = 0.0;
                                        disabled_count += 1;
                                    }
                                }
                            }
                            s.push_toast(
                                "Startup Optimized",
                                format!("Disabled {} high-impact startup apps.", disabled_count),
                            );
                        })
                        .build(k),
                ]
                .gap(8.0)
                .items_center(),
            )
            .build(k);

        let row_count = filtered.len();
        let table = Table::new(
            &self.startup_table,
            |s: &mut Self| &mut s.startup_table,
            row_count,
        )
        .row_height(42.0)
        .column(
            TableColumn::new("Application")
                .flex(1.4)
                .min_width(150.0)
                .sortable(),
        )
        .column(TableColumn::new("Publisher").flex(1.1).min_width(130.0))
        .column(TableColumn::new("Impact").width(100.0).sortable())
        .column(TableColumn::new("Boot Delay").width(100.0))
        .column(TableColumn::new("Registry").width(90.0))
        .column(TableColumn::new("Enabled").width(90.0))
        .on_sort(|s: &mut Self, col_idx, dir| {
            s.startup_items.sort_by(|a, b| {
                let cmp = match col_idx {
                    0 => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                    2 => a.impact.cmp(&b.impact),
                    _ => std::cmp::Ordering::Equal,
                };
                if dir == SortDir::Desc {
                    cmp.reverse()
                } else {
                    cmp
                }
            });
        })
        .cell(|s: &Self, k: &Kit, r_idx, c_idx| -> Cell<Self> {
            let q = s.startup_search.text.to_lowercase();
            let current_filtered: Vec<(usize, &StartupItem)> = s
                .startup_items
                .iter()
                .enumerate()
                .filter(|(_, item)| {
                    q.is_empty()
                        || item.name.to_lowercase().contains(&q)
                        || item.publisher.to_lowercase().contains(&q)
                        || item.command.to_lowercase().contains(&q)
                })
                .collect();

            let Some(&(orig_idx, item)) = current_filtered.get(r_idx) else {
                return Cell::text("");
            };

            match c_idx {
                0 => Cell::text(item.name.clone()).primary(),
                1 => Cell::text(item.publisher.clone()),
                2 => Cell::el(
                    Badge::new(item.impact.clone())
                        .variant(if item.impact == "High" {
                            BadgeVariant::Accent
                        } else {
                            BadgeVariant::Subtle
                        })
                        .build(k),
                ),
                3 => Cell::text(format!("{:.1}s", item.delay)).mono(),
                4 => Cell::text(if item.is_hkcu { "HKCU" } else { "HKLM" }).mono(),
                5 => {
                    let enabled = item.enabled;
                    Cell::el(
                        Switch::new(enabled)
                            .on_toggle(move |app: &mut Self, next_en| {
                                if let Some(st) = app.startup_items.get_mut(orig_idx) {
                                    let name = st.name.clone();
                                    let is_hkcu = st.is_hkcu;
                                    match toggle_startup_item_sync(&name, is_hkcu, next_en) {
                                        Ok(_) => {
                                            st.enabled = next_en;
                                        }
                                        Err(e) => {
                                            app.push_toast("Startup Error", e);
                                        }
                                    }
                                }
                            })
                            .build(k),
                    )
                }
                _ => Cell::text(""),
            }
        })
        .build(self, k)
        .h(420.0);

        // Add Startup Item Dialog
        Dialog::new("add-startup-dialog", "Add Startup Program")
            .open(self.add_startup_open)
            .fit()
            .description("Register a new application in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run")
            .child(
                col![
                    TextInput::new(&self.new_startup_name)
                        .placeholder("Program Name (e.g. MyTool)")
                        .on_edit(|s: &mut Self, e| s.new_startup_name = e)
                        .build(k),
                    TextInput::new(&self.new_startup_path)
                        .placeholder("Executable Path (e.g. C:\\Tools\\MyTool.exe)")
                        .on_edit(|s: &mut Self, e| s.new_startup_path = e)
                        .build(k),
                    row![
                        spacer(),
                        Button::new("Cancel")
                            .variant(ButtonVariant::Ghost)
                            .on_press(|s: &mut Self| s.add_startup_open = false)
                            .build(k),
                        Button::new("Add to Startup")
                            .variant(ButtonVariant::Contrast)
                            .on_press(|s: &mut Self| {
                                let name = s.new_startup_name.text.trim().to_string();
                                let path = s.new_startup_path.text.trim().to_string();
                                if !name.is_empty() && !path.is_empty() {
                                    match add_startup_item_sync(&name, &path, true) {
                                        Ok(msg) => {
                                            s.startup_items =
                                                get_startup_items_sync().unwrap_or_default();
                                            s.add_startup_open = false;
                                            s.new_startup_name = TextEdit::new();
                                            s.new_startup_path = TextEdit::new();
                                            s.push_toast("Startup Item Added", msg);
                                        }
                                        Err(e) => s.push_toast("Error", e),
                                    }
                                }
                            })
                            .build(k),
                    ]
                    .gap(8.0),
                ]
                .gap(10.0)
                .w(360.0),
            )
            .on_close(|s: &mut Self| s.add_startup_open = false)
            .build(k, layer);

        col![top_bar, table].gap(14.0).w_full()
    }

    // ─── Tab 5: Privacy Care ──────────────────────────────────────────

    fn view_privacy(&self, k: &Kit) -> El<Self> {
        let selected_ids: Vec<String> = self
            .privacy_items
            .iter()
            .filter(|i| i.selected)
            .map(|i| i.id.to_string())
            .collect();

        let header = Card::new()
            .accent(k.accent.solid)
            .title("Privacy Trace Sweeper", Some(&icons::SHIELD))
            .description("Remove browser history, tracking cookies, recent file lists, RunMRU, and clipboard buffers")
            .action(
                row![
                    Button::new("Rescan Traces")
                        .variant(ButtonVariant::Outline)
                        .leading_icon(&icons::REFRESH)
                        .on_press(|s: &mut Self| {
                            s.privacy_items = scan_privacy_sync();
                            s.push_toast("Privacy Scan", "Privacy traces refreshed.");
                        })
                        .build(k),
                    Button::new(format!("Sweep Selected ({})", selected_ids.len()))
                        .variant(ButtonVariant::Contrast)
                        .leading_icon(&icons::SHIELD)
                        .disabled(selected_ids.is_empty())
                        .on_press(|s: &mut Self| {
                            let ids: Vec<String> = s
                                .privacy_items
                                .iter()
                                .filter(|i| i.selected)
                                .map(|i| i.id.to_string())
                                .collect();
                            let start = std::time::Instant::now();
                            match sweep_privacy_sync(&ids) {
                                Ok(msg) => {
                                    let elapsed = start.elapsed().as_secs_f64();
                                    s.record_history(0, ids.len(), elapsed, "Privacy Sweep");
                                    s.privacy_items = scan_privacy_sync();
                                    s.push_toast("Privacy Sweep Complete", msg);
                                }
                                Err(e) => s.push_toast("Privacy Sweep Failed", e),
                            }
                        })
                        .build(k),
                ]
                .gap(8.0),
            )
            .build(k);

        let mut rows = Vec::with_capacity(self.privacy_items.len());
        for (idx, item) in self.privacy_items.iter().enumerate() {
            let r = row![
                Checkbox::new(item.selected)
                    .label(item.name)
                    .description(item.desc.clone())
                    .on_toggle(move |s: &mut Self, checked| {
                        if let Some(p) = s.privacy_items.get_mut(idx) {
                            p.selected = checked;
                        }
                    })
                    .build(k),
                spacer(),
                Badge::new(if item.found {
                    format!("{} traces", item.count)
                } else {
                    "Clean".into()
                })
                .variant(if item.found {
                    BadgeVariant::Accent
                } else {
                    BadgeVariant::Subtle
                })
                .build(k),
            ]
            .p(12.0)
            .rounded(8.0)
            .bg(k.neutral.bg_subtle)
            .border(1.0, k.neutral.border_subtle)
            .items_center();

            rows.push(r);
        }

        col![header, col(rows).gap(8.0).w_full()].gap(14.0).w_full()
    }

    // ─── Tab 6: Hardware Diagnostics ──────────────────────────────────

    fn view_diagnostics(&self, k: &Kit) -> El<Self> {
        let disk_read: Vec<f32> = self.disk_read_history.iter().copied().collect();
        let disk_write: Vec<f32> = self.disk_write_history.iter().copied().collect();
        let net_down: Vec<f32> = self.net_down_history.iter().copied().collect();
        let net_up: Vec<f32> = self.net_up_history.iter().copied().collect();

        let top_bar = Card::new()
            .accent(k.accent.solid)
            .title("Hardware Diagnostics & Telemetry Report", Some(&icons::ACTIVITY))
            .description(format!(
                "Processor: {} ({} Logical Cores) • Total RAM: {:.2} GB",
                self.metrics.cpu_name,
                self.metrics.cpu_cores.len(),
                self.metrics.total_ram
            ))
            .action(
                row![
                    Button::new("Generate Report")
                        .variant(ButtonVariant::Contrast)
                        .leading_icon(&icons::ACTIVITY)
                        .on_press(|s: &mut Self| {
                            let reports_dir = AppDirs::new("com.cpulse.app")
                                .map(|d| d.data().join("reports"))
                                .unwrap_or_else(|| std::env::temp_dir().join("cpulse_reports"));
                            match generate_diagnostics_report_sync(&reports_dir) {
                                Ok((fname, body)) => {
                                    s.active_report_name = fname.clone();
                                    s.active_report_body = body;
                                    s.reports = list_diagnostics_reports(&reports_dir);
                                    s.push_toast(
                                        "Diagnostics Report Created",
                                        format!("Saved {}", fname),
                                    );
                                }
                                Err(e) => s.push_toast("Report Failed", e),
                            }
                        })
                        .build(k),
                    when(!self.active_report_body.is_empty(), || {
                        Button::new("Export Report (.txt)")
                            .variant(ButtonVariant::Outline)
                            .leading_icon(&icons::DOWNLOAD)
                            .on_press_tx(|s: &mut Self, tx: &mut Tx| {
                                let body = s.active_report_body.clone();
                                let default_name = if s.active_report_name.is_empty() {
                                    "CPulse_Diagnostics_Report.txt".to_string()
                                } else {
                                    s.active_report_name.clone()
                                };
                                tx.save_file(
                                    SaveFileSpec::new()
                                        .title("Export CPulse Diagnostics Report")
                                        .file_name(default_name)
                                        .filter("Text Report", &["txt", "md"]),
                                    move |app: &mut Self, path_opt| {
                                        if let Some(dest) = path_opt {
                                            if std::fs::write(&dest, &body).is_ok() {
                                                app.push_toast(
                                                    "Report Exported",
                                                    format!(
                                                        "Saved to {}",
                                                        dest.to_string_lossy()
                                                    ),
                                                );
                                            }
                                        }
                                    },
                                );
                            })
                            .build(k)
                    }),
                ]
                .gap(8.0),
            )
            .build(k);

        let io_charts = row![
            Card::new()
                .title("Live Disk Read / Write Speed (MB/s)", Some(&icons::HARD_DRIVE))
                .description(format!(
                    "Read {:.2} MB/s • Write {:.2} MB/s",
                    self.metrics.disk_read_speed, self.metrics.disk_write_speed
                ))
                .child(charts::dual_area_chart(
                    &disk_read,
                    &disk_write,
                    50.0,
                    440.0,
                    120.0,
                    k.accent.solid,
                    k.accent.soft,
                    k.neutral.text_subtle,
                    k.neutral.border_subtle,
                ))
                .build(k)
                .flex_1(),
            Card::new()
                .title("Live Network Throughput (MB)", Some(&icons::WIFI))
                .description(format!(
                    "Down {:.2} MB • Up {:.2} MB",
                    self.metrics.network_down, self.metrics.network_up
                ))
                .child(charts::dual_area_chart(
                    &net_down,
                    &net_up,
                    25.0,
                    440.0,
                    120.0,
                    k.accent.solid,
                    k.accent.soft,
                    k.neutral.text_subtle,
                    k.neutral.border_subtle,
                ))
                .build(k)
                .flex_1(),
        ]
        .gap(12.0)
        .w_full();

        // Per-core CPU bars
        let core_bars: Vec<El<Self>> = self
            .metrics
            .cpu_cores
            .iter()
            .enumerate()
            .take(16)
            .map(|(idx, &load)| {
                Progress::new(Some((load / 100.0).clamp(0.0, 1.0)))
                    .label(format!("Core #{}", idx))
                    .show_value()
                    .build(k)
            })
            .collect();

        let cores_card = Card::new()
            .title("Processor Per-Core Utilization", Some(&icons::CPU))
            .child(col(core_bars).gap(8.0).w_full())
            .build(k);

        col![top_bar, io_charts, cores_card].gap(14.0).w_full()
    }

    // ─── Tab 7: Activity History ──────────────────────────────────────

    fn view_history(&self, k: &Kit) -> El<Self> {
        let mut monthly_mb = [0.0f32; 12];
        for (i, entry) in self.history_logs.iter().enumerate() {
            let bucket = (11usize).saturating_sub(i % 12);
            monthly_mb[bucket] += (entry.freed_bytes as f32) / (1024.0 * 1024.0);
        }

        let chart_card = Card::new()
            .accent(k.accent.solid)
            .title("Optimization & Freed Space History", Some(&icons::CLOCK))
            .description(format!(
                "{} total recorded maintenance sessions in Prefs store",
                self.history_logs.len()
            ))
            .action(
                Button::new("Clear History")
                    .variant(ButtonVariant::Ghost)
                    .control_size(ControlSize::Small)
                    .on_press(|s: &mut Self| {
                        s.history_logs.clear();
                        s.save_prefs();
                        s.push_toast("History Cleared", "All activity records removed.");
                    })
                    .build(k),
            )
            .child(charts::monthly_bar_chart(
                &monthly_mb,
                820.0,
                110.0,
                k.accent.solid,
                k.neutral.border_subtle,
            ))
            .build(k);

        let count = self.history_logs.len();
        let table = Table::new(&self.history_table, |s: &mut Self| &mut s.history_table, count)
            .row_height(38.0)
            .column(TableColumn::new("Timestamp").flex(1.4).min_width(160.0))
            .column(TableColumn::new("Operation").flex(1.0).min_width(120.0))
            .column(TableColumn::new("Space Freed").width(120.0))
            .column(TableColumn::new("Items Fixed").width(110.0))
            .column(TableColumn::new("Duration").width(100.0))
            .cell(|s: &Self, k: &Kit, r_idx, c_idx| -> Cell<Self> {
                let Some(entry) = s.history_logs.get(r_idx) else {
                    return Cell::text("");
                };
                match c_idx {
                    0 => Cell::text(entry.date.clone()).primary(),
                    1 => Cell::el(
                        Badge::new(entry.kind.clone())
                            .variant(BadgeVariant::Accent)
                            .build(k),
                    ),
                    2 => Cell::text(entry.freed.clone()).mono(),
                    3 => Cell::text(format!("{}", entry.fixed)).mono(),
                    4 => Cell::text(entry.duration.clone()).mono(),
                    _ => Cell::text(""),
                }
            })
            .build(self, k)
            .h(340.0);

        col![chart_card, table].gap(14.0).w_full()
    }

    // ─── Tab 8: Settings & Windows Product Key ────────────────────────

    fn view_settings(&self, k: &Kit) -> El<Self> {
        let theme_idx = match self.settings.theme.as_str() {
            "light" => 1,
            "auto" => 2,
            _ => 0,
        };

        let lang_options = [
            SelectOption::new("en", "English (US)"),
            SelectOption::new("id", "Bahasa Indonesia"),
        ];

        let appearance_card = Card::new()
            .title("Appearance & Localization", Some(&icons::SETTINGS))
            .description("Customize Rune GPU theme mode and interface language")
            .child(
                col![
                    row![
                        col![
                            text("Color Theme").size(13.0).medium().color(k.neutral.text),
                            text("Select Dark, Light, or OS Automatic palette")
                                .size(11.5)
                                .color(k.neutral.text_subtle),
                        ]
                        .gap(2.0),
                        spacer(),
                        SegmentedControl::new(&["Dark", "Light", "Auto"], Some(theme_idx))
                            .fit()
                            .on_pick(|s: &mut Self, idx| {
                                s.settings.theme = match idx {
                                    1 => "light".into(),
                                    2 => "auto".into(),
                                    _ => "dark".into(),
                                };
                                s.save_prefs();
                            })
                            .build(k),
                    ]
                    .items_center(),
                    Divider::horizontal().build(k),
                    row![
                        col![
                            text("Display Language")
                                .size(13.0)
                                .medium()
                                .color(k.neutral.text),
                            text("Powered natively by rune-i18n Catalog")
                                .size(11.5)
                                .color(k.neutral.text_subtle),
                        ]
                        .gap(2.0),
                        spacer(),
                        Select::new(&lang_options, Some(self.settings.language.as_str()))
                            .w(200.0)
                            .on_pick(|s: &mut Self, val| {
                                s.settings.language = val.to_string();
                                s.save_prefs();
                            })
                            .build(k),
                    ]
                    .items_center(),
                ]
                .gap(12.0),
            )
            .build(k);

        let system_toggles = Card::new()
            .title("System Integration & Automation", Some(&icons::BOLT))
            .description("Configure Windows Registry autostart, Explorer context menu, and weekly Task Scheduler cleanup")
            .child(
                col![
                    Switch::new(self.settings.start_on_boot)
                        .label("Launch CPulse at Windows Startup")
                        .description("Registers CPulse --minimized in HKCU Run registry")
                        .on_toggle(|s: &mut Self, en| {
                            match toggle_autostart_sync(en) {
                                Ok(msg) => {
                                    s.settings.start_on_boot = en;
                                    s.save_prefs();
                                    s.push_toast("Startup Updated", msg);
                                }
                                Err(e) => s.push_toast("Autostart Error", e),
                            }
                        })
                        .build(k),
                    Switch::new(self.settings.auto_clean)
                        .label("Weekly Scheduled Auto-Clean")
                        .description("Runs silent junk cleanup via Windows Task Scheduler")
                        .on_toggle(|s: &mut Self, en| {
                            match update_auto_clean_sync(en) {
                                Ok(msg) => {
                                    s.settings.auto_clean = en;
                                    s.save_prefs();
                                    s.push_toast("Auto-Clean", msg);
                                }
                                Err(e) => s.push_toast("Scheduler Error", e),
                            }
                        })
                        .build(k),
                    Switch::new(self.settings.context_menu)
                        .label("Windows Desktop Context Menu ('Clean with CPulse')")
                        .description("Requires Administrator privileges (HKCR\\Directory\\Background\\shell)")
                        .on_toggle(|s: &mut Self, en| {
                            match toggle_context_menu_sync(en) {
                                Ok(msg) => {
                                    s.settings.context_menu = en;
                                    s.save_prefs();
                                    s.push_toast("Context Menu", msg);
                                }
                                Err(e) => s.push_toast("Context Menu Error", e),
                            }
                        })
                        .build(k),
                    Switch::new(self.settings.notifications)
                        .label("Native Windows Toast Notifications (rune-notify)")
                        .description("Display native OS alerts when cleanups or health warnings occur")
                        .on_toggle(|s: &mut Self, en| {
                            s.settings.notifications = en;
                            s.save_prefs();
                        })
                        .build(k),
                ]
                .gap(12.0),
            )
            .build(k);

        // Windows License Key Card
        let displayed_key = if !self.win_key.is_valid || self.win_key.key.is_empty() {
            "No OEM / Retail Product Key Detected".to_string()
        } else if self.reveal_win_key {
            self.win_key.key.clone()
        } else {
            "*****-*****-*****-*****-*****".to_string()
        };

        let key_card = Card::new()
            .accent(k.accent.solid)
            .title("Windows OEM / BIOS Product Key", Some(&icons::KEY))
            .description(format!(
                "Edition: {} • Type: {}",
                self.win_key.edition, self.win_key.key_type
            ))
            .action(
                row![
                    IconButton::new(
                        if self.reveal_win_key {
                            &glyphs::EYE_OFF
                        } else {
                            &glyphs::EYE
                        },
                        "Reveal Product Key",
                    )
                    .variant(IconButtonVariant::Outline)
                    .on_press(|s: &mut Self| {
                        s.reveal_win_key = !s.reveal_win_key;
                    })
                    .build(k),
                    Button::new("Copy Key")
                        .variant(ButtonVariant::Contrast)
                        .leading_icon(&glyphs::COPY)
                        .disabled(!self.win_key.is_valid || self.win_key.key.is_empty())
                        .on_press_tx(|s: &mut Self, tx: &mut Tx| {
                            if !s.win_key.key.is_empty() {
                                tx.copy(s.win_key.key.clone());
                                s.push_toast("Copied", "Windows Product Key copied to clipboard.");
                            }
                        })
                        .build(k),
                ]
                .gap(8.0),
            )
            .child(
                row![
                    text(displayed_key)
                        .size(15.0)
                        .bold()
                        .mono()
                        .color(k.accent.text),
                    spacer(),
                    Badge::new(if self.win_key.is_valid {
                        "Genuine License Active"
                    } else {
                        "Not Detected"
                    })
                    .variant(if self.win_key.is_valid {
                        BadgeVariant::Accent
                    } else {
                        BadgeVariant::Subtle
                    })
                    .build(k),
                ]
                .items_center()
                .p(12.0)
                .rounded(8.0)
                .bg(k.neutral.bg_subtle),
            )
            .build(k);

        col![appearance_card, system_toggles, key_card]
            .gap(14.0)
            .w_full()
    }
}

fn default_boost_options() -> Vec<BoostOption> {
    vec![
        BoostOption {
            id: "ram",
            title: "Trim Process Working Sets (RAM)",
            desc: "Reclaims unused physical memory from background Win32 processes via EmptyWorkingSet.",
            impact: "High Impact",
            requires_admin: false,
            active: false,
            busy: false,
        },
        BoostOption {
            id: "dns",
            title: "Flush Windows DNS Resolver Cache",
            desc: "Clears stale DNS records via ipconfig /flushdns to resolve domain lookup lag.",
            impact: "Network",
            requires_admin: false,
            active: false,
            busy: false,
        },
        BoostOption {
            id: "startup_delay",
            title: "Disable Explorer Startup Delay",
            desc: "Sets StartupDelayInMSec=0 in HKCU Explorer\\Serialize for faster desktop boot.",
            impact: "Boot Speed",
            requires_admin: false,
            active: false,
            busy: false,
        },
        BoostOption {
            id: "cpu",
            title: "Foreground CPU Priority Separation",
            desc: "Optimizes Win32PrioritySeparation (26) so active foreground apps get maximum CPU slices.",
            impact: "High Impact",
            requires_admin: true,
            active: false,
            busy: false,
        },
        BoostOption {
            id: "net",
            title: "TCP/IP Auto-Tuning Optimization",
            desc: "Enables normal TCP receive window auto-tuning via netsh int tcp.",
            impact: "Throughput",
            requires_admin: true,
            active: false,
            busy: false,
        },
        BoostOption {
            id: "visual",
            title: "Optimize Windows Visual Effects",
            desc: "Tunes Explorer VisualFXSetting for snappy window animations and lower GPU compositing overhead.",
            impact: "UI Snappiness",
            requires_admin: false,
            active: false,
            busy: false,
        },
        BoostOption {
            id: "disk",
            title: "Verify NTFS SSD TRIM (DisableDeleteNotify)",
            desc: "Ensures Windows sends TRIM delete notifications to NVMe/SATA SSDs via fsutil.",
            impact: "SSD Longevity",
            requires_admin: true,
            active: false,
            busy: false,
        },
        BoostOption {
            id: "game",
            title: "Enable Windows Auto Game Mode",
            desc: "Configures HKCU\\Software\\Microsoft\\GameBar to prioritize game frame pacing.",
            impact: "Gaming",
            requires_admin: false,
            active: false,
            busy: false,
        },
        BoostOption {
            id: "temp",
            title: "Active Processor Cooling Policy",
            desc: "Configures powercfg SYSCOOLPOL to prioritize active fan cooling before thermal throttling.",
            impact: "Thermals",
            requires_admin: false,
            active: false,
            busy: false,
        },
    ]
}

fn build_teal_tray_icon() -> TrayIcon {
    let w = 16u32;
    let h = 16u32;
    let mut rgba_bytes = Vec::with_capacity((w * h * 4) as usize);
    for y in 0..h {
        for x in 0..w {
            let cx = x as f32 - 7.5;
            let cy = y as f32 - 7.5;
            let dist = (cx * cx + cy * cy).sqrt();
            if dist <= 6.8 {
                // CPulse Soft Accent (#7FB5A3)
                rgba_bytes.extend_from_slice(&[127, 181, 163, 255]);
            } else {
                rgba_bytes.extend_from_slice(&[0, 0, 0, 0]);
            }
        }
    }
    TrayIcon::rgba(w, h, rgba_bytes)
}

fn main() {
    // 1. Headless CLI mode (`--silent-clean`) for Windows Task Scheduler & Context Menu
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--silent-clean") {
        let log_dir = AppDirs::new("com.cpulse.app")
            .map(|d| d.logs().to_path_buf())
            .unwrap_or_else(std::env::temp_dir);
        if let Ok(scanned) = scan_junk_with_progress(None, |_| {}) {
            let cats: Vec<String> = scanned.into_iter().map(|i| i.name).collect();
            let _ = clean_junk_with_progress(&cats, &log_dir, |_| {});
        }
        return;
    }

    // 2. Pre-warm DirectX 12 / wgpu adapter on a background thread before window creation
    rune::prewarm_gpu();

    // 3. Enforce single running instance (`com.cpulse.app`)
    let Some(_instance_guard) = rune::single_instance("com.cpulse.app") else {
        return;
    };

    // 4. Register native Windows Toast Notifications (`rune-notify`)
    rune_notify::register(Identity::new("com.cpulse.app", "CPulse"));

    // 5. Build the Rune GPU Application (`keep_running` keeps tray alive when window closes)
    let app = App::new(AppSpec {
        title: "CPulse — Windows System Optimizer (Pure Rust • Rune GPU)",
        size: (1180.0, 760.0),
        min_size: Some((900.0, 600.0)),
        on_key: Some(CpulseApp::on_key),
        scenes: CpulseApp::scenes,
        ..AppSpec::new(CpulseApp::init, CpulseApp::view)
    })
    .keep_running();

    let handle = app.handle();
    let _ = GLOBAL_HANDLE.set(handle.clone());

    // 6. Initialize Native Windows System Tray (`rune::tray`)
    let tray_handle = handle.clone();
    let _tray = Tray::new(
        TraySpec::new("com.cpulse.app", "CPulse", build_teal_tray_icon())
            .tooltip("CPulse — Pure-Rust Windows Optimizer")
            .menu(vec![
                TrayItem::action("open", "Open CPulse Dashboard"),
                TrayItem::action("quick_clean", "Run Quick Clean"),
                TrayItem::action("boost_ram", "Boost RAM Now"),
                TrayItem::Separator,
                TrayItem::action("quit", "Exit CPulse"),
            ]),
        move |event| match event {
            TrayEvent::Activate | TrayEvent::DoubleClick => {
                tray_handle.update(|s, _| {
                    s.active_tab = Tab::Dashboard;
                });
            }
            TrayEvent::Menu(id) => match id.as_str() {
                "open" => {
                    tray_handle.update(|s, _| {
                        s.active_tab = Tab::Dashboard;
                    });
                }
                "quick_clean" => {
                    tray_handle.update(|s, _| {
                        s.trigger_quick_clean();
                    });
                }
                "boost_ram" => {
                    tray_handle.update(|s, _| {
                        s.trigger_ram_boost();
                    });
                }
                "quit" => {
                    cleanup_typeperf();
                    std::process::exit(0);
                }
                _ => {}
            },
        },
    );

    // 7. Spawn Disk I/O performance counter listener & 1-second hardware telemetry worker
    spawn_typeperf_listener();

    let metrics_handle = handle.clone();
    std::thread::spawn(move || {
        let mut sys = System::new_all();
        let mut components = Components::new_with_refreshed_list();
        let mut disks = Disks::new_with_refreshed_list();
        let mut networks = Networks::new_with_refreshed_list();
        let disk_cache = get_disk_details();

        loop {
            let m = collect_system_metrics(
                &mut sys,
                &mut disks,
                &mut components,
                &mut networks,
                &disk_cache,
            );
            let now_str = chrono::Local::now().format("%H:%M:%S").to_string();

            metrics_handle.update(move |s, _| {
                if s.cpu_history.len() >= 60 {
                    s.cpu_history.pop_front();
                }
                s.cpu_history.push_back(m.cpu_usage);

                if s.ram_history.len() >= 60 {
                    s.ram_history.pop_front();
                }
                s.ram_history.push_back(m.ram_usage);

                if s.disk_read_history.len() >= 60 {
                    s.disk_read_history.pop_front();
                }
                s.disk_read_history.push_back(m.disk_read_speed as f32);

                if s.disk_write_history.len() >= 60 {
                    s.disk_write_history.pop_front();
                }
                s.disk_write_history.push_back(m.disk_write_speed as f32);

                if s.net_down_history.len() >= 60 {
                    s.net_down_history.pop_front();
                }
                s.net_down_history.push_back(m.network_down as f32);

                if s.net_up_history.len() >= 60 {
                    s.net_up_history.pop_front();
                }
                s.net_up_history.push_back(m.network_up as f32);

                s.metrics = m;
                s.clock_text = now_str;
            });

            std::thread::sleep(Duration::from_secs(1));
        }
    });

    // 8. Fetch OEM / BIOS Windows Product Key in background on startup
    let key_handle = handle.clone();
    std::thread::spawn(move || {
        let info = get_windows_key_sync();
        key_handle.update(move |s, _| {
            s.win_key = info;
        });
    });

    // 9. Run the wgpu DX12 event loop
    app.run();
    cleanup_typeperf();
}
