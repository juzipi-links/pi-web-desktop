import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface AppConfig {
  port: number;
  hostname: string;
  closeToTray: boolean;
  startMinimized: boolean;
  openBrowserOnStart: boolean;
  customPiDir?: string;
  remoteServerUrl?: string; // If set, connect to external Pi Web instance instead of embedded server
  windowBounds?: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    maximized?: boolean;
  };
}

const DEFAULT_CONFIG: AppConfig = {
  port: 30141,
  hostname: '127.0.0.1',
  closeToTray: true,
  startMinimized: false,
  openBrowserOnStart: false,
  windowBounds: {
    width: 1280,
    height: 840,
    maximized: false,
  },
};

export class ConfigManager {
  private configPath: string;
  private config: AppConfig;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (e) {
      console.error('[Config] Failed to load config, using defaults:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  public get(): AppConfig {
    return { ...this.config };
  }

  public set(partial: Partial<AppConfig>): void {
    this.config = { ...this.config, ...partial };
    this.save();
  }

  public save(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (e) {
      console.error('[Config] Failed to save config:', e);
    }
  }
}

let instance: ConfigManager | null = null;
export function getConfigManager(): ConfigManager {
  if (!instance) {
    instance = new ConfigManager();
  }
  return instance;
}
