export class MockStore {
  private filename: string;

  constructor(filename: string) {
    this.filename = filename;
  }

  private getKey(key: string): string {
    return `cpulse_store_${this.filename}_${key}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(this.getKey(key));
    if (raw !== null) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return raw as unknown as T;
      }
    }

    // Default values for known files
    if (this.filename === "history.json" && key === "cleaning-history") {
      return [
        {
          date: new Date(Date.now() - 86400000).toLocaleString(),
          freed: "1.4 GB",
          fixed: 4210,
          duration: "1.2s",
          type: "Deep Clean",
        },
        {
          date: new Date(Date.now() - 172800000).toLocaleString(),
          freed: "512 MB",
          fixed: 1,
          duration: "0.2s",
          type: "RAM Boost",
        },
      ] as unknown as T;
    }

    if (this.filename === "settings.json" && key === "user-settings") {
      return {
        startWithWindows: false,
        minimizeToTray: true,
        autoUpdate: false,
        autoClean: false,
        realTimeMonitoring: true,
        contextMenu: false,
        notifications: false,
        soundEffects: false,
        language: "en",
      } as unknown as T;
    }

    return null;
  }

  async set(key: string, value: any): Promise<void> {
    localStorage.setItem(this.getKey(key), JSON.stringify(value));
  }

  async save(): Promise<void> {
    return Promise.resolve();
  }
}

export async function load(filename: string): Promise<MockStore> {
  return new MockStore(filename);
}
