// i18n.rs — Pure-Rust bilingual localization (English & Indonesian) powered by `rune-i18n`
//
// Uses `rune_i18n::{Catalog, Locale, Translator}` to resolve UI strings with zero
// runtime JSON overhead or JavaScript i18next dependencies.

use rune_i18n::{Catalog, Locale, Translator};

pub fn build_catalog() -> Catalog {
    let mut cat = Catalog::new(Locale::new("en"));

    let en_json = r#"{
        "dashboard": "Dashboard",
        "cleaner": "System Cleaner",
        "booster": "Performance Booster",
        "startup": "Startup Manager",
        "privacy": "Privacy Care",
        "diagnostics": "Hardware Diagnostics",
        "history": "Activity History",
        "settings": "Settings",
        "health_score": "System Health Score",
        "scan_junk": "Scan Junk",
        "clean_now": "Clean Selected",
        "boost_ram": "Boost RAM",
        "quick_clean": "Quick Clean",
        "fix_startup": "Optimize Startup",
        "privacy_sweep": "Sweep Privacy",
        "admin_mode": "Admin Mode",
        "standard_mode": "Standard User"
    }"#;

    let id_json = r#"{
        "dashboard": "Dasbor",
        "cleaner": "Pembersih Sistem",
        "booster": "Penguat Performa",
        "startup": "Manajer Startup",
        "privacy": "Perlindungan Privasi",
        "diagnostics": "Diagnostik Perangkat Keras",
        "history": "Riwayat Aktivitas",
        "settings": "Pengaturan",
        "health_score": "Skor Kesehatan Sistem",
        "scan_junk": "Pindai Sampah",
        "clean_now": "Bersihkan Terpilih",
        "boost_ram": "Optimalkan RAM",
        "quick_clean": "Pembersihan Cepat",
        "fix_startup": "Optimalkan Startup",
        "privacy_sweep": "Sapu Privasi",
        "admin_mode": "Mode Administrator",
        "standard_mode": "Pengguna Standar"
    }"#;

    let _ = cat.load_json_str(Locale::new("en"), en_json);
    let _ = cat.load_json_str(Locale::new("id"), id_json);
    cat
}

pub fn tr(catalog: &Catalog, lang: &str, key: &str) -> String {
    let locale = Locale::new(if lang == "id" { "id" } else { "en" });
    Translator::new(catalog, locale).get(key)
}
