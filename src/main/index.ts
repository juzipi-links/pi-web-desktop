import { app, dialog } from 'electron';
import { createMainWindow, getMainWindow, loadServerUrl, showMainWindow, setAppQuitting } from './window';
import { getServerManager } from './server';
import { setupTray, destroyTray } from './tray';
import { setupAppMenu } from './menu';
import { setupIpc } from './ipc';
import { getConfigManager } from './config';

// Set AppUserModelId for Windows taskbar and notifications
if (process.platform === 'win32') {
  app.setAppUserModelId('com.agegr.piweb.desktop');
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[App] Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus existing window when user tries to open a second instance
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    console.log('[App] Pi Web Desktop is starting...');

    // 1. Initialize configuration and IPC
    getConfigManager();
    setupIpc();
    setupAppMenu();

    // 2. Create the main window (shows splash screen)
    createMainWindow();

    // 3. Setup System Tray
    setupTray();

    // 4. Start the embedded or remote server
    const server = getServerManager();

    server.on('log', (text) => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('server:log', text);
      }
    });

    try {
      const url = await server.start();
      console.log(`[App] Server started at ${url}, loading in browser window...`);

      // Give a tiny buffer for CSS/assets to settle then load
      setTimeout(() => {
        loadServerUrl(url);
      }, 500);
    } catch (err: any) {
      console.error('[App] Failed to start server:', err);
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('server:error', err.message || String(err));
      }
      dialog.showErrorBox(
        'Pi Web Server Error',
        `Failed to start the Pi Web server:\n\n${err.message || String(err)}\n\nPlease check server logs via Tray menu or restart the application.`
      );
    }

    app.on('activate', () => {
      showMainWindow();
    });
  });

  // Handle graceful quit
  app.on('before-quit', async (event) => {
    setAppQuitting(true);
    destroyTray();
    try {
      await getServerManager().stop();
    } catch (e) {
      console.warn('[App] Error stopping server on quit:', e);
    }
  });

  app.on('window-all-closed', () => {
    const config = getConfigManager().get();
    if (!config.closeToTray) {
      app.quit();
    }
  });
}
