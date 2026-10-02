import { BrowserWindow, shell, app, dialog } from 'electron';
import path from 'path';
import { getConfigManager } from './config';
import { getAssetPath, getRendererPath } from './utils';

let mainWindow: BrowserWindow | null = null;
let isAppQuitting = false;
let hasNotifiedTray = false;

export function setAppQuitting(quitting: boolean): void {
  isAppQuitting = quitting;
}

export function getAppQuitting(): boolean {
  return isAppQuitting;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function createMainWindow(): BrowserWindow {
  const configManager = getConfigManager();
  const config = configManager.get();
  const bounds = config.windowBounds || { width: 1280, height: 840 };

  const iconPath = getAssetPath('icon.png');

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 900,
    minHeight: 600,
    title: 'Pi Web Desktop',
    icon: iconPath,
    backgroundColor: '#0e0f12',
    show: false, // Show once ready
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  if (bounds.maximized) {
    mainWindow.maximize();
  }

  // Save window position & dimensions on change
  const saveBounds = () => {
    if (!mainWindow) return;
    const isMax = mainWindow.isMaximized();
    if (!isMax) {
      const b = mainWindow.getBounds();
      configManager.set({
        windowBounds: {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          maximized: false,
        },
      });
    } else {
      configManager.set({
        windowBounds: {
          ...(config.windowBounds || { width: 1280, height: 840 }),
          maximized: true,
        },
      });
    }
  };

  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  // Close to tray handling
  mainWindow.on('close', (event) => {
    if (isAppQuitting) {
      return; // Proceed with close
    }

    const currentConfig = configManager.get();
    if (currentConfig.closeToTray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Handle external link clicks (open in default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only open HTTP/HTTPS links externally
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent navigating to external origins inside the main app frame
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname);
      const isConfiguredRemote = currentConfigMatches(parsedUrl.origin);

      if (!isLoopback && !isConfiguredRemote && !navigationUrl.startsWith('file:')) {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    } catch {
      // ignore
    }
  });

  // Load splash screen first
  const splashPath = getRendererPath('splash.html');
  mainWindow.loadFile(splashPath).catch((err) => {
    console.error('[Window] Failed to load splash screen:', err);
  });

  mainWindow.once('ready-to-show', () => {
    if (!config.startMinimized) {
      mainWindow?.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function currentConfigMatches(origin: string): boolean {
  const config = getConfigManager().get();
  if (config.remoteServerUrl) {
    try {
      return new URL(config.remoteServerUrl).origin === origin;
    } catch {
      return false;
    }
  }
  return false;
}

export function loadServerUrl(url: string): void {
  if (!mainWindow) return;
  mainWindow.loadURL(url).catch((err) => {
    console.error('[Window] Failed to load server URL:', err);
  });
}

export function showMainWindow(): void {
  if (!mainWindow) {
    createMainWindow();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}
