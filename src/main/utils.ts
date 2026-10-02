import net from 'net';
import path from 'path';
import { app, shell } from 'electron';
import treeKill from 'tree-kill';

export const isDev = !app.isPackaged;

export function checkPortAvailable(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

export async function findAvailablePort(startPort: number, host = '127.0.0.1', maxAttempts = 20): Promise<number> {
  for (let p = startPort; p < startPort + maxAttempts; p++) {
    const available = await checkPortAvailable(p, host);
    if (available) {
      return p;
    }
  }
  return startPort;
}

export function killProcessTree(pid: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          console.warn(`[Process] Failed to SIGTERM pid ${pid}, trying SIGKILL:`, err);
          treeKill(pid, 'SIGKILL', () => resolve());
        } else {
          resolve();
        }
      });
    } catch (e) {
      console.warn(`[Process] Exception killing pid ${pid}:`, e);
      resolve();
    }
  });
}

export function getAssetPath(...paths: string[]): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', ...paths);
  }
  return path.join(app.getAppPath(), 'assets', ...paths);
}

export function getRendererPath(...paths: string[]): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'renderer', ...paths);
  }
  return path.join(app.getAppPath(), 'src', 'renderer', ...paths);
}

export function showItemInFolder(targetPath: string): void {
  try {
    shell.showItemInFolder(targetPath);
  } catch (err) {
    console.error('[Shell] Failed to show item in folder:', err);
  }
}

export function openPath(targetPath: string): void {
  try {
    shell.openPath(targetPath);
  } catch (err) {
    console.error('[Shell] Failed to open path:', err);
  }
}
