export async function readTextFile(path: string): Promise<string> {
  return localStorage.getItem(`cpulse_fs_${path}`) || "";
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  localStorage.setItem(`cpulse_fs_${path}`, contents);
}
