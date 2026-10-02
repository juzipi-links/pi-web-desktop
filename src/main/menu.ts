import { Menu, MenuItemConstructorOptions, app, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { getMainWindow, showMainWindow, setAppQuitting } from './window';
import { getServerManager } from './server';
import { getConfigManager } from './config';
import { openPath } from './utils';

export function setupAppMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    // File Menu
    {
      label: '&File',
      submenu: [
        {
          label: 'Open &Workspace Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const win = getMainWindow();
            if (!win) return;
            const res = await dialog.showOpenDialog(win, {
              properties: ['openDirectory'],
              title: 'Select Workspace Directory for Pi Agent',
            });
            if (!res.canceled && res.filePaths.length > 0) {
              const selectedPath = res.filePaths[0];
              // Notify renderer of selected directory
              win.webContents.send('pi:directory-selected', selectedPath);
            }
          },
        },
        {
          label: 'Open &Pi Data Directory (~/.pi/agent)',
          click: () => {
            const config = getConfigManager().get();
            const targetDir = config.customPiDir || path.join(process.env.USERPROFILE || process.env.HOME || '', '.pi', 'agent');
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            openPath(targetDir);
          },
        },
        { type: 'separator' },
        {
          label: '&Restart Pi Server',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: async () => {
            try {
              await getServerManager().restart();
            } catch (err) {
              console.error('[Menu] Restart failed:', err);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'E&xit',
          accelerator: 'Alt+F4',
          click: async () => {
            setAppQuitting(true);
            await getServerManager().stop();
            app.quit();
          },
        },
      ],
    },
    // Edit Menu
    {
      label: '&Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    // View Menu
    {
      label: '&View',
      submenu: [
        {
          label: '&Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const win = getMainWindow();
            win?.webContents.reload();
          },
        },
        {
          label: '&Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            const win = getMainWindow();
            win?.webContents.reloadIgnoringCache();
          },
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Toggle &Developer Tools',
          accelerator: 'F12',
          click: () => {
            const win = getMainWindow();
            win?.webContents.toggleDevTools();
          },
        },
      ],
    },
    // Window Menu
    {
      label: '&Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        {
          label: '&Show Window',
          click: () => {
            showMainWindow();
          },
        },
        {
          label: '&Close to Tray',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            const win = getMainWindow();
            win?.hide();
          },
        },
      ],
    },
    // Help Menu
    {
      label: '&Help',
      submenu: [
        {
          label: 'Pi Web Documentation',
          click: () => {
            shell.openExternal('https://github.com/agegr/pi-web#readme');
          },
        },
        {
          label: 'Pi Coding Agent GitHub',
          click: () => {
            shell.openExternal('https://github.com/earendil-works/pi');
          },
        },
        { type: 'separator' },
        {
          label: 'View Server Logs...',
          click: () => {
            const win = getMainWindow();
            const logs = getServerManager().getLogs().slice(-50).join('\n');
            dialog.showMessageBox(win || undefined as any, {
              type: 'info',
              title: 'Pi Web Server Logs',
              message: 'Latest Server Logs',
              detail: logs || 'No logs captured yet.',
              buttons: ['OK', 'Copy to Clipboard'],
            }).then((res) => {
              if (res.response === 1) {
                const { clipboard } = require('electron');
                clipboard.writeText(logs);
              }
            });
          },
        },
        { type: 'separator' },
        {
          label: 'About Pi Web Desktop',
          click: () => {
            const win = getMainWindow();
            dialog.showMessageBox(win || undefined as any, {
              type: 'info',
              title: 'About Pi Web Desktop',
              message: 'Pi Web Desktop',
              detail: `Version: ${app.getVersion()}\n` +
                      `Electron: ${process.versions.electron}\n` +
                      `Chrome: ${process.versions.chrome}\n` +
                      `Node.js: ${process.versions.node}\n` +
                      `OS: ${process.platform} ${process.arch} (${process.getSystemVersion()})\n\n` +
                      `Native Windows Desktop interface for Pi Coding Agent.`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
