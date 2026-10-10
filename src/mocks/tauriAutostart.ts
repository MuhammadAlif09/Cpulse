export async function isEnabled(): Promise<boolean> {
  return localStorage.getItem("cpulse_autostart") === "true";
}

export async function enable(): Promise<void> {
  localStorage.setItem("cpulse_autostart", "true");
}

export async function disable(): Promise<void> {
  localStorage.setItem("cpulse_autostart", "false");
}
