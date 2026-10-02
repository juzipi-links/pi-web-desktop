export interface PiDesktopAPI {
  isElectron: boolean;
  platform: string;
  selectDirectory: (defaultPath?: string) => Promise<string | null>;
  selectFile: (options?: { extensions?: string[] }) => Promise<string | null>;
  getServerStatus: () => Promise<{ status: string; url: string; logs: string[] }>;
  restartServer: () => Promise<{ success: boolean; url?: string; error?: string }>;
  getConfig: () => Promise<any>;
  setConfig: (config: any) => Promise<any>;
  openExternal: (url: string) => Promise<boolean>;
  openPath: (targetPath: string) => Promise<boolean>;
  showItemInFolder: (targetPath: string) => Promise<boolean>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  quitApp: () => Promise<void>;
  onDirectorySelected: (callback: (dir: string) => void) => () => void;
  onServerLog: (callback: (log: string) => void) => () => void;
  onServerError: (callback: (error: string) => void) => () => void;
}

declare global {
  interface Window {
    piDesktop?: PiDesktopAPI;
  }
}
