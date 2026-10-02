import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { EventEmitter } from 'events';
import { getConfigManager } from './config';
import { checkPortAvailable, findAvailablePort, killProcessTree } from './utils';

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface ServerEvents {
  'status-changed': (status: ServerStatus, url?: string, error?: string) => void;
  'log': (text: string, isError: boolean) => void;
}

export class ServerManager extends EventEmitter {
  private childProcess: ChildProcess | null = null;
  private status: ServerStatus = 'stopped';
  private serverUrl: string = '';
  private logs: string[] = [];
  private maxLogs: number = 1000;
  private currentPort: number = 30141;

  constructor() {
    super();
  }

  public getStatus(): ServerStatus {
    return this.status;
  }

  public getUrl(): string {
    return this.serverUrl;
  }

  public getLogs(): string[] {
    return [...this.logs];
  }

  private appendLog(text: string, isError = false): void {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${text}`;
    this.logs.push(formatted);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.emit('log', formatted, isError);
  }

  private setStatus(status: ServerStatus, error?: string): void {
    this.status = status;
    this.emit('status-changed', status, this.serverUrl, error);
  }

  /**
   * Locate the @agegr/pi-web package entry file
   */
  private resolvePiWebScript(): { scriptPath: string; pkgDir: string } | null {
    const searchDirs = [
      // 1. In packaged app: unpacked node_modules
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@agegr/pi-web'),
      // 2. In packaged app: direct resources server
      path.join(process.resourcesPath, 'server'),
      // 3. Normal appPath node_modules
      path.join(app.getAppPath(), 'node_modules', '@agegr/pi-web'),
      // 4. Relative to current file
      path.resolve(__dirname, '..', '..', 'node_modules', '@agegr/pi-web'),
      // 5. User home / global fallback
      path.join(process.env.USERPROFILE || process.env.HOME || '', '.local/lib/node_modules/@agegr/pi-web'),
    ];

    for (const pkgDir of searchDirs) {
      const scriptPath = path.join(pkgDir, 'bin', 'pi-web.js');
      if (fs.existsSync(scriptPath)) {
        return { scriptPath, pkgDir };
      }
    }

    try {
      const resolved = require.resolve('@agegr/pi-web/bin/pi-web.js');
      if (fs.existsSync(resolved)) {
        return { scriptPath: resolved, pkgDir: path.dirname(path.dirname(resolved)) };
      }
    } catch {
      // not resolvable via require.resolve
    }

    return null;
  }

  /**
   * Check if a server is already running on the given URL
   */
  public async probeServer(url: string, timeoutMs = 2000): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(url);
        const req = http.request(
          {
            hostname: parsed.hostname,
            port: parsed.port,
            path: '/',
            method: 'GET',
            timeout: timeoutMs,
          },
          (res) => {
            // Any response (even 200, 302, 401, 404) means a server is listening
            resolve(true);
          }
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Wait until the server is responding to HTTP requests
   */
  private async waitForServer(url: string, maxWaitMs = 45000): Promise<boolean> {
    const startTime = Date.now();
    const interval = 400;

    while (Date.now() - startTime < maxWaitMs) {
      if (this.childProcess && this.childProcess.exitCode !== null) {
        this.appendLog(`Server process exited prematurely with code ${this.childProcess.exitCode}`, true);
        return false;
      }

      const ok = await this.probeServer(url, 1000);
      if (ok) {
        return true;
      }
      await new Promise((r) => setTimeout(r, interval));
    }
    return false;
  }

  /**
   * Start or connect to the Pi Web server
   */
  public async start(): Promise<string> {
    const config = getConfigManager().get();

    // 1. If remote server configured, connect directly
    if (config.remoteServerUrl && config.remoteServerUrl.trim()) {
      this.serverUrl = config.remoteServerUrl.trim();
      this.appendLog(`Connecting to configured remote server: ${this.serverUrl}`);
      this.setStatus('starting');

      const ok = await this.waitForServer(this.serverUrl, 10000);
      if (ok) {
        this.appendLog(`Connected to remote server: ${this.serverUrl}`);
        this.setStatus('running');
        return this.serverUrl;
      } else {
        const err = `Remote server not reachable at ${this.serverUrl}`;
        this.appendLog(err, true);
        this.setStatus('error', err);
        throw new Error(err);
      }
    }

    // 2. Check if server already running on target port
    const targetPort = config.port || 30141;
    const hostname = config.hostname || '127.0.0.1';
    const initialUrl = `http://${hostname}:${targetPort}`;

    const alreadyRunning = await this.probeServer(initialUrl, 1500);
    if (alreadyRunning) {
      this.currentPort = targetPort;
      this.serverUrl = initialUrl;
      this.appendLog(`Existing Pi Web server detected at ${initialUrl}`);
      this.setStatus('running');
      return this.serverUrl;
    }

    // 3. Find an available port if initial port is occupied by something else
    const isPortFree = await checkPortAvailable(targetPort, hostname);
    let chosenPort = targetPort;
    if (!isPortFree) {
      this.appendLog(`Port ${targetPort} is in use by another process. Searching for free port...`);
      chosenPort = await findAvailablePort(targetPort + 1, hostname);
      this.appendLog(`Found free port: ${chosenPort}`);
    }
    this.currentPort = chosenPort;
    this.serverUrl = `http://${hostname}:${chosenPort}`;

    // 4. Resolve pi-web server script
    const piWebInfo = this.resolvePiWebScript();
    if (!piWebInfo) {
      const err = 'Could not find @agegr/pi-web server script. Please verify installation.';
      this.appendLog(err, true);
      this.setStatus('error', err);
      throw new Error(err);
    }

    const { scriptPath, pkgDir } = piWebInfo;
    this.appendLog(`Starting Pi Web server using: ${scriptPath}`);
    this.appendLog(`Package root directory: ${pkgDir}`);
    this.setStatus('starting');

    // 5. Prepare environment variables
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PI_WEB_HOSTNAME: hostname,
      PORT: String(chosenPort),
      NODE_ENV: 'production',
      LANG: process.env.LANG || 'C.UTF-8',
    };

    if (config.customPiDir) {
      env.PI_CODING_AGENT_DIR = config.customPiDir;
      this.appendLog(`Custom Pi agent directory: ${config.customPiDir}`);
    }

    const args = [
      scriptPath,
      '--port', String(chosenPort),
      '--hostname', hostname,
      '--no-open',
    ];

    try {
      this.childProcess = spawn(process.execPath, args, {
        cwd: pkgDir,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      this.childProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.appendLog(text.trim());
      });

      this.childProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.appendLog(text.trim(), true);
      });

      this.childProcess.on('error', (err) => {
        this.appendLog(`Server process spawn error: ${err.message}`, true);
        this.setStatus('error', err.message);
      });

      this.childProcess.on('exit', (code, signal) => {
        this.appendLog(`Server process stopped (exit code: ${code}, signal: ${signal})`);
        this.childProcess = null;
        if (this.status === 'running' || this.status === 'starting') {
          this.setStatus('stopped');
        }
      });

      // 6. Wait for HTTP readiness
      this.appendLog(`Waiting for server to become ready at ${this.serverUrl}...`);
      const ready = await this.waitForServer(this.serverUrl, 60000);
      if (!ready) {
        throw new Error(`Server failed to respond at ${this.serverUrl} within 60s`);
      }

      this.appendLog(`Pi Web server is ready and serving at ${this.serverUrl}`);
      this.setStatus('running');
      return this.serverUrl;
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      this.appendLog(`Failed to start server: ${msg}`, true);
      this.setStatus('error', msg);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop the child server process
   */
  public async stop(): Promise<void> {
    if (!this.childProcess) {
      this.setStatus('stopped');
      return;
    }

    this.appendLog('Stopping Pi Web server process...');
    const pid = this.childProcess.pid;
    if (pid) {
      await killProcessTree(pid);
    }
    this.childProcess = null;
    this.setStatus('stopped');
    this.appendLog('Pi Web server stopped.');
  }

  /**
   * Restart server
   */
  public async restart(): Promise<string> {
    await this.stop();
    return this.start();
  }
}

let serverInstance: ServerManager | null = null;
export function getServerManager(): ServerManager {
  if (!serverInstance) {
    serverInstance = new ServerManager();
  }
  return serverInstance;
}
