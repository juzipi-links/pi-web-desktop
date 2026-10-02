import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron';
import { getServerManager } from './server';
import { getConfigManager, AppConfig } from './config';
import { getMainWindow, setAppQuitting } from './window';
import { openPath, showItemInFolder } from './utils';

export function setupIpc(): void {
  // Directory picker for Windows
  ipcMain.handle('dialog:select-directory', async (event, defaultPath?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (!win) return null;

    const res = await dialog.showOpenDialog(win, {
      title: 'Select Workspace Directory',
      defaultPath: defaultPath || undefined,
      properties: ['openDirectory', 'createDirectory'],
    });

    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  // File picker
  ipcMain.handle('dialog:select-file', async (event, options?: { extensions?: string[] }) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (!win) return null;

    const filters = options?.extensions
      ? [{ name: 'Allowed Files', extensions: options.extensions }]
      : undefined;

    const res = await dialog.showOpenDialog(win, {
      title: 'Select File',
      properties: ['openFile'],
      filters,
    });

    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  // Server management
  ipcMain.handle('server:get-status', () => {
    const server = getServerManager();
    return {
      status: server.getStatus(),
      url: server.getUrl(),
      logs: server.getLogs().slice(-100),
    };
  });

  ipcMain.handle('server:restart', async () => {
    try {
      const url = await getServerManager().restart();
      return { success: true, url };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Config
  ipcMain.handle('config:get', () => {
    return getConfigManager().get();
  });

  ipcMain.handle('config:set', (_event, partial: Partial<AppConfig>) => {
    const configManager = getConfigManager();
    configManager.set(partial);
    return configManager.get();
  });

  // Shell & Filesystem
  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  ipcMain.handle('shell:open-path', (_event, targetPath: string) => {
    openPath(targetPath);
    return true;
  });

  ipcMain.handle('shell:show-item-in-folder', (_event, targetPath: string) => {
    showItemInFolder(targetPath);
    return true;
  });

  // Window controls
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.handle('app:quit', async () => {
    setAppQuitting(true);
    await getServerManager().stop();
    app.quit();
  });
}
