// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // let _guard = sentry::init(("https://placeholder@sentry.io/1234567", sentry::ClientOptions {
    //     release: sentry::release_name!(),
    //     ..Default::default()
    // }));

    app_lib::run()
}

#[cfg(test)]
mod tests {
    mod cleaner_tests;
    mod lib_tests;
}
