// icons.rs — Custom vector icons for CPulse using rune_kit::Icon
//
// Zero external image assets or font files required; rendered directly via Rune's GPU SVG pipeline.

use rune_kit::Icon;

pub static DASHBOARD: Icon = Icon {
    name: "cpulse-dashboard",
    view: 16.0,
    body: r#"<rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/>"#,
};

pub static TRASH: Icon = Icon {
    name: "cpulse-trash",
    view: 16.0,
    body: r#"<path d="M2.5 4H13.5M5.5 4V2.5H10.5V4M4 4V13.5H12V4M6.5 6.5V11M9.5 6.5V11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>"#,
};

pub static BOLT: Icon = Icon {
    name: "cpulse-bolt",
    view: 16.0,
    body: r#"<path d="M9 1.5L3 9H8L7 14.5L13 7H8L9 1.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>"#,
};

pub static ROCKET: Icon = Icon {
    name: "cpulse-rocket",
    view: 16.0,
    body: r#"<path d="M9.5 2.5C11.5 2.5 13.5 2.5 13.5 2.5C13.5 2.5 13.5 4.5 13.5 6.5C13.5 9.5 10.5 12 7.5 12.5L3.5 8.5C4 5.5 6.5 2.5 9.5 2.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M3.5 12.5L2 14M6 12L4 14M4 10L2 12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>"#,
};

pub static SHIELD: Icon = Icon {
    name: "cpulse-shield",
    view: 16.0,
    body: r#"<path d="M8 1.5L2.5 4V7.5C2.5 11.2 5 13.5 8 14.5C11 13.5 13.5 11.2 13.5 7.5V4L8 1.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>"#,
};

pub static ACTIVITY: Icon = Icon {
    name: "cpulse-activity",
    view: 16.0,
    body: r#"<path d="M1.5 8H4.5L6.5 3L9.5 13L11.5 8H14.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>"#,
};

pub static CLOCK: Icon = Icon {
    name: "cpulse-clock",
    view: 16.0,
    body: r#"<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5V8L10.5 9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>"#,
};

pub static SETTINGS: Icon = Icon {
    name: "cpulse-settings",
    view: 16.0,
    body: r#"<circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.3"/><path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.5 4.5M11.5 11.5L12.6 12.6M12.6 3.4L11.5 4.5M4.5 11.5L3.4 12.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>"#,
};

pub static CPU: Icon = Icon {
    name: "cpulse-cpu",
    view: 16.0,
    body: r#"<rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="6.5" y="6.5" width="3" height="3" stroke="currentColor" stroke-width="1"/><path d="M6 1.5V4M10 1.5V4M6 12V14.5M10 12V14.5M1.5 6H4M1.5 10H4M12 6H14.5M12 10H14.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>"#,
};

pub static MEMORY: Icon = Icon {
    name: "cpulse-memory",
    view: 16.0,
    body: r#"<rect x="1.5" y="4.5" width="13" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 6.5V8.5M8 6.5V8.5M11.5 6.5V8.5M4 10.5V12.5M8 10.5V12.5M12 10.5V12.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>"#,
};

pub static HARD_DRIVE: Icon = Icon {
    name: "cpulse-hard-drive",
    view: 16.0,
    body: r#"<rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 9H14.5" stroke="currentColor" stroke-width="1.2"/><circle cx="11.5" cy="10.8" r="0.8" fill="currentColor"/>"#,
};

pub static WIFI: Icon = Icon {
    name: "cpulse-wifi",
    view: 16.0,
    body: r#"<path d="M1.5 5.5C5 2.5 11 2.5 14.5 5.5M4 8.5C6.3 6.5 9.7 6.5 12 8.5M6.5 11.5C7.3 10.8 8.7 10.8 9.5 11.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="13.5" r="0.9" fill="currentColor"/>"#,
};

pub static REFRESH: Icon = Icon {
    name: "cpulse-refresh",
    view: 16.0,
    body: r#"<path d="M13.5 3V6.5H10M2.5 13V9.5H6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.2 6C4 3.8 6.2 2.5 8.5 2.5C10.8 2.5 12.6 3.8 13.5 6M12.8 10C12 12.2 9.8 13.5 7.5 13.5C5.2 13.5 3.4 12.2 2.5 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>"#,
};

pub static DOWNLOAD: Icon = Icon {
    name: "cpulse-download",
    view: 16.0,
    body: r#"<path d="M8 2V10.5M4.5 7.5L8 11L11.5 7.5M2.5 13.5H13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>"#,
};

pub static PLUS: Icon = Icon {
    name: "cpulse-plus",
    view: 16.0,
    body: r#"<path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>"#,
};

pub static SUN: Icon = Icon {
    name: "cpulse-sun",
    view: 16.0,
    body: r#"<circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.5 4.5M11.5 11.5L12.6 12.6M12.6 3.4L11.5 4.5M4.5 11.5L3.4 12.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>"#,
};

pub static MOON: Icon = Icon {
    name: "cpulse-moon",
    view: 16.0,
    body: r#"<path d="M13 10.2A5.5 5.5 0 0 1 5.8 3a5.5 5.5 0 1 0 7.2 7.2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>"#,
};

pub static BELL: Icon = Icon {
    name: "cpulse-bell",
    view: 16.0,
    body: r#"<path d="M4 6.5a4 4 0 0 1 8 0c0 3.5 1.5 4.5 1.5 4.5h-11S4 10 4 6.5ZM6.8 13a1.5 1.5 0 0 0 2.4 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>"#,
};

pub static KEY: Icon = Icon {
    name: "cpulse-key",
    view: 16.0,
    body: r#"<circle cx="5.5" cy="9.5" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M8 7.5L13.5 2M11.5 4L13.5 6M9.5 6L11 7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>"#,
};
