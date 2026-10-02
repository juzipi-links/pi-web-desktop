import { contextBridge, ipcRenderer } from 'electron';
import type { PiDesktopAPI } from './types';

const api: PiDesktopAPI = {
  isElectron: true,
  platform: process.platform,

  selectDirectory: (defaultPath?: string) => {
    return ipcRenderer.invoke('dialog:select-directory', defaultPath);
  },

  selectFile: (options?: { extensions?: string[] }) => {
    return ipcRenderer.invoke('dialog:select-file', options);
  },

  getServerStatus: () => {
    return ipcRenderer.invoke('server:get-status');
  },

  restartServer: () => {
    return ipcRenderer.invoke('server:restart');
  },

  getConfig: () => {
    return ipcRenderer.invoke('config:get');
  },

  setConfig: (config: any) => {
    return ipcRenderer.invoke('config:set', config);
  },

  openExternal: (url: string) => {
    return ipcRenderer.invoke('shell:open-external', url);
  },

  openPath: (targetPath: string) => {
    return ipcRenderer.invoke('shell:open-path', targetPath);
  },

  showItemInFolder: (targetPath: string) => {
    return ipcRenderer.invoke('shell:show-item-in-folder', targetPath);
  },

  minimizeWindow: () => {
    return ipcRenderer.invoke('window:minimize');
  },

  maximizeWindow: () => {
    return ipcRenderer.invoke('window:maximize');
  },

  closeWindow: () => {
    return ipcRenderer.invoke('window:close');
  },

  quitApp: () => {
    return ipcRenderer.invoke('app:quit');
  },

  onDirectorySelected: (callback: (dir: string) => void) => {
    const handler = (_event: any, dir: string) => callback(dir);
    ipcRenderer.on('pi:directory-selected', handler);
    return () => {
      ipcRenderer.removeListener('pi:directory-selected', handler);
    };
  },

  onServerLog: (callback: (log: string) => void) => {
    const handler = (_event: any, log: string) => callback(log);
    ipcRenderer.on('server:log', handler);
    return () => {
      ipcRenderer.removeListener('server:log', handler);
    };
  },

  onServerError: (callback: (error: string) => void) => {
    const handler = (_event: any, error: string) => callback(error);
    ipcRenderer.on('server:error', handler);
    return () => {
      ipcRenderer.removeListener('server:error', handler);
    };
  },
};

contextBridge.exposeInMainWorld('piDesktop', api);
