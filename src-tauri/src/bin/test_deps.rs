fn main() {
    println!("Hello from main!");
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_deps_run() {
        println!("Calling app_lib::dummy_check in test...");
        app_lib::dummy_check();
    }
}
