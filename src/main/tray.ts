import { Tray, Menu, app, shell, nativeImage, NativeImage, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { getServerManager } from './server';
import { getConfigManager } from './config';
import { getMainWindow, showMainWindow, setAppQuitting } from './window';
import { getAssetPath, openPath } from './utils';

let tray: Tray | null = null;

export function setupTray(): Tray {
  if (tray) return tray;

  const iconPath = process.platform === 'win32'
    ? getAssetPath('tray.ico')
    : getAssetPath('tray.png');

  let image: NativeImage;
  try {
    image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) {
      image = nativeImage.createFromPath(getAssetPath('icon.png'));
    }
  } catch {
    image = nativeImage.createFromPath(getAssetPath('icon.png'));
  }

  tray = new Tray(image);
  tray.setToolTip('Pi Web Desktop');

  const updateMenu = () => {
    if (!tray) return;

    const serverManager = getServerManager();
    const configManager = getConfigManager();
    const status = serverManager.getStatus();
    const serverUrl = serverManager.getUrl();
    const version = app.getVersion();

    let statusText = 'Server: Stopped';
    if (status === 'starting') statusText = 'Server: Starting...';
    else if (status === 'running') statusText = `Server: Running (${serverUrl})`;
    else if (status === 'error') statusText = 'Server: Error';

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Pi Web Desktop v${version}`,
        enabled: false,
      },
      {
        label: statusText,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Open Pi Web',
        click: () => {
          showMainWindow();
        },
      },
      {
        label: 'Open in Web Browser',
        enabled: status === 'running' && Boolean(serverUrl),
        click: () => {
          if (serverUrl) {
            shell.openExternal(serverUrl);
          }
        },
      },
      {
        label: 'Open Pi Data Directory (~/.pi/agent)',
        click: () => {
          const config = configManager.get();
          const targetDir = config.customPiDir || path.join(process.env.USERPROFILE || process.env.HOME || '', '.pi', 'agent');
          if (fs.existsSync(targetDir)) {
            openPath(targetDir);
          } else {
            // create if doesn't exist yet
            fs.mkdirSync(targetDir, { recursive: true });
            openPath(targetDir);
          }
        },
      },
      {
        label: 'Restart Server',
        click: async () => {
          try {
            await serverManager.restart();
          } catch (e) {
            console.error('[Tray] Failed to restart server:', e);
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Toggle Developer Tools',
        click: () => {
          const win = getMainWindow();
          if (win) {
            win.webContents.toggleDevTools();
          }
        },
      },
      {
        label: 'Close to Tray on Window Close',
        type: 'checkbox',
        checked: configManager.get().closeToTray,
        click: (menuItem) => {
          configManager.set({ closeToTray: menuItem.checked });
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Pi Web Desktop',
        click: async () => {
          setAppQuitting(true);
          await serverManager.stop();
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
  };

  tray.on('click', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isVisible() && !win.isMinimized() && win.isFocused()) {
        win.hide();
      } else {
        showMainWindow();
      }
    } else {
      showMainWindow();
    }
  });

  tray.on('double-click', () => {
    showMainWindow();
  });

  // Re-build menu when server status changes
  const server = getServerManager();
  server.on('status-changed', () => updateMenu());

  updateMenu();
  return tray;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
