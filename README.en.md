# Pi Web Desktop (Windows Desktop Client)

[English](./README.en.md) | [简体中文](./README.md)

**Pi Web Desktop** packages [pi-web](https://github.com/agegr/pi-web) (the browser UI for the [Pi Coding Agent](https://github.com/earendil-works/pi)) into a native **Windows Desktop Application**.

No need to open command prompts, run `npx @agegr/pi-web`, configure Node.js runtimes, or open a browser manually. Simply double-click to launch as a standalone Windows desktop app.

---

## 🌟 Key Features

- 🖥️ **Native Windows Desktop Experience**:
  - Independent desktop window with native Windows controls, taskbar branding, and sleek dark mode.
- 📦 **Zero External Dependencies**:
  - Bundled with Chromium and Node.js runtime via Electron.
  - Windows users don't need to install Node.js, Python, or Git to run the app.
- 🚀 **Installer & Portable Editions**:
  - **Installer (`Setup .exe`)**: Modern NSIS wizard, customizable install directory, automatic Desktop and Start Menu shortcuts.
  - **Portable (`Portable .exe`)**: Single-file standalone executable, no installation needed, runs from USB drives.
- 🔄 **Intelligent Lifecycle & Process Tree Management**:
  - Auto-starts the embedded Next.js server on launch with health check probing.
  - Uses `tree-kill` on Windows to cleanly terminate child processes and terminal sessions when exiting, leaving no orphaned processes.
  - Automatic port conflict resolution (defaults to 30141, increments if occupied).
- 🔔 **System Tray Integration**:
  - Minimize to tray to keep long-running agent tasks executing in the background.
  - Tray context menu: Server status, Show window, Open in browser, Open Pi data directory (`~/.pi/agent`), Restart server, Exit.
- 🔒 **Single Instance Guard**:
  - Focusing existing window when re-launched, preventing multiple duplicate server instances.
  - External links (GitHub, docs, auth URLs) automatically open in default Windows browser (Edge/Chrome).
- 🌐 **Embedded & Remote Modes**:
  - Run the embedded server locally, or configure a remote server URL (e.g. `http://gpu-server:30141`) to use as a lightweight client.
- 🤖 **GitHub Actions CI/CD**:
  - Pre-configured `.github/workflows/build-windows.yml` to automatically compile Windows `.exe` installers on GitHub's cloud runners.

---

## 🛠️ Development

```bash
cd pi-web-desktop
npm install
npm run build:ts
npm run dev
```

## 📦 Building Windows Releases

Run on Windows or trigger via GitHub Actions:

```bash
npm run build:win:all
```

Outputs in `release/`:
- `release/Pi Web Desktop Setup 0.10.0.exe` (NSIS Installer)
- `release/Pi Web Desktop-0.10.0-windows-portable.exe` (Portable executable)

## 📄 License

MIT License.
