# Pi Web Desktop (Windows 桌面端)

[English](./README.en.md) | [简体中文](./README.md)

**Pi Web Desktop** 是将 [pi-web](https://github.com/agegr/pi-web)（[Pi 编程智能体](https://github.com/earendil-works/pi) 的 Web 界面）封装为 **Windows 原生桌面应用** 的解决方案。

无需在 Windows 上每次手动打开终端、执行 `npx @agegr/pi-web`、配置 Node.js 环境或打开浏览器，双击即可作为独立的 Windows 桌面客户端运行。

![Pi Web Desktop Preview](assets/icon.png)

---

## 🌟 核心特性

- 🖥️ **Windows 原生体验**：
  - 拥有独立的 Windows 应用程序窗口、原生任务栏图标与 Windows 原生标题栏控制。
  - 内置防闪烁深色背景主题，与 Pi Web 界面完美契合。
- 📦 **免环境依赖（Zero-Dependency）**：
  - 基于 Electron 架构，打包了内置的 Chromium 渲染引擎与 Node.js 运行时。
  - 普通用户无需预先安装 Node.js、Python 或 Git，双击安装即可直接使用。
- 🚀 **一键式安装包与免安装便携版**：
  - **安装版 (`.exe`)**：NSIS 现代化安装向导，支持自定义安装路径，自动创建桌面与开始菜单快捷方式。
  - **便携版 (`Portable .exe`)**：单文件便携可执行程序，无需安装，拷入 U 盘随插随用。
- 🔄 **智能服务生命周期管理**：
  - 启动应用自动拉起内置 Next.js 后端服务，并实时进行端口检测与探针轮询。
  - 优雅进程树退出（Tree-kill），退出应用时自动彻底清理后端服务与 Node-PTY 终端子进程，杜绝后台僵尸进程占用 CPU/内存。
  - 智能端口分配：默认检测 `30141` 端口，若被占用自动顺延分配可用端口，防止端口冲突。
- 🔔 **Windows 系统托盘（System Tray）集成**：
  - 支持最小化到右下角托盘，后台保持智能体长程任务稳定运行。
  - 托盘右键菜单支持：查看服务运行状态、快速呼出主窗口、浏览器打开、一键打开智能体数据目录 (`~/.pi/agent`)、重启服务、退出。
- 🔒 **单实例互斥锁（Single Instance Lock）**：
  - 多次双击启动器自动聚焦激活已有窗口，防止重复启动多个服务冲突。
  - 外部链接（GitHub、文档、登录鉴权页面）自动调用 Windows 默认浏览器（Edge/Chrome）打开，保持应用内视图整洁。
- 🌐 **双运行模式（内置服务 / 远程连接）**：
  - **内置模式**：默认模式，完全在本地运行 Pi Web 服务与 Pi 智能体。
  - **远程客户端模式**：可在配置中指定局域网或远程服务器地址（如 `http://192.168.1.100:30141`），作为轻量远程客户端连接 GPU 服务器上的 Pi 实例。
- 🤖 **GitHub Actions 自动化编译**：
  - 提供开箱即用的 GitHub Actions 工作流，无需 Windows 物理机，每次推送或发布 Release 即可自动在云端构建打包 Windows `.exe` 安装程序与便携版。

---

## 📁 目录结构

```text
pi-web-desktop/
├── .github/
│   └── workflows/
│       └── build-windows.yml       # GitHub Actions 自动化构建 Windows .exe
├── assets/
│   ├── icon.ico                    # Windows 图标 (多尺寸 16/32/48/64/128/256px)
│   ├── icon.png                    # 高清图标 (512x512)
│   ├── tray.ico                    # 托盘图标
│   └── tray.png
├── build/                          # electron-builder 打包资源
├── scripts/
│   ├── generate-icons.mjs          # 图标生成工具
│   └── prepare-server.mjs          # 服务依赖校验脚本
├── src/
│   ├── main/                       # Electron 主进程
│   │   ├── index.ts                # 应用入口、单实例锁、生命周期调度
│   │   ├── server.ts               # Pi Web 后端服务管理器 (启动/健康探针/退出清理)
│   │   ├── window.ts               # BrowserWindow 窗口管理、尺寸记忆、托盘关闭拦截
│   │   ├── tray.ts                 # Windows 托盘图标与上下文菜单
│   │   ├── menu.ts                 # 原生菜单栏与快捷键
│   │   ├── ipc.ts                  # IPC 原生通道 (Windows 文件夹选择、系统操作)
│   │   ├── config.ts               # 本地持久化配置管理
│   │   └── utils.ts                # 端口探测、进程树终止、路径解析
│   ├── preload/                    # 安全预加载脚本
│   │   ├── index.ts                # contextBridge 暴露安全原生 API
│   │   └── types.ts                # TypeScript 类型定义
│   └── renderer/                   # 渲染层静态资源
│       ├── splash.html             # 启动过渡 Loading 页面 (深色主题)
│       └── splash.css              # 启动页动画与日志视图样式
├── electron-builder.yml            # Windows 安装包与便携版打包规则
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛠️ 本地开发与调试

### 前置要求

- Node.js >= 22.19.0
- npm >= 10.0.0

### 安装依赖

```bash
cd pi-web-desktop
npm install
```

### 启动开发模式

```bash
# 编译 TypeScript 并启动 Electron 窗口
npm run dev
```

启动后：
1. 主进程会检查本地 `@agegr/pi-web` 服务。
2. 启动窗口并显示启动进度页。
3. 服务就绪后自动加载 Pi Web 智能体界面。

---

## 📦 打包构建 Windows 应用程序

### 方式一：在 Windows 机器上直接打包

在 Windows 本地运行以下命令即可：

```bash
# 1. 编译 TypeScript
npm run build:ts

# 2. 打包生成 Windows 安装程序 (.exe) 与便携版 (Portable .exe)
npm run build:win:all
```

打包完成后，输出文件存放在 `release/` 目录：
- `release/Pi Web Desktop Setup 0.10.0.exe`：NSIS 标准 Windows 安装包。
- `release/Pi Web Desktop-0.10.0-windows-portable.exe`：免安装便携版。

### 方式二：使用 GitHub Actions 云端自动打包（无需本地 Windows 环境）

本项目已内置 `.github/workflows/build-windows.yml`。

1. 将代码仓库推送到 GitHub：
   ```bash
   git init
   git add .
   git commit -m "feat: initial pi-web desktop for windows"
   git remote add origin https://github.com/你的用户名/pi-web-desktop.git
   git push -u origin main
   ```
2. 进入 GitHub 仓库的 **Actions** 标签页。
3. 选择 **Build Windows Desktop App** 工作流，点击 **Run workflow**。
4. 构建完成后，在页面下方的 **Artifacts** 处即可直接下载构建好的 Windows 可执行文件压缩包！
5. 当给仓库打上标签（如 `git tag v0.10.0 && git push origin v0.10.0`）时，GitHub Actions 会自动创建 Release 并将 `.exe` 附件发布到 Releases 页面。

---

## ⚙️ 配置说明

桌面端配置文件保存在用户数据目录下：
- **Windows**: `%APPDATA%\pi-web-desktop\config.json`
- **Linux**: `~/.config/pi-web-desktop/config.json`

配置文件示例：

```json
{
  "port": 30141,
  "hostname": "127.0.0.1",
  "closeToTray": true,
  "startMinimized": false,
  "customPiDir": "",
  "remoteServerUrl": "",
  "windowBounds": {
    "width": 1280,
    "height": 840,
    "maximized": false
  }
}
```

| 参数项 | 说明 | 默认值 |
| --- | --- | --- |
| `port` | 本地服务监听端口 | `30141` |
| `hostname` | 监听主机地址 | `127.0.0.1` |
| `closeToTray` | 点击右上角关闭按钮时是否最小化到托盘 | `true` |
| `startMinimized` | 是否开机或启动时静默最小化到托盘 | `false` |
| `customPiDir` | 自定义 Pi 智能体数据存储路径 | 留空使用默认 `~/.pi/agent` |
| `remoteServerUrl` | 远程 Pi Web 服务地址（设置后不启动本地服务） | `""` |

---

## 常见问题 (FAQ)

### 1. 为什么选择 Electron 而非纯 Web 快捷方式或 Tauri？
Pi Web 内部深度依赖 `@earendil-works/pi-coding-agent`、`node-pty`（Windows 下运行终端子进程）以及 Next.js 服务端 SSR 与 API 路由。
如果使用纯 Webview2 / Tauri，用户必须在 Windows 上自行配置完整的 Node.js 环境并手动处理后端服务生命周期。Electron 将 Chromium、Node.js 运行时与原生应用外壳打包为一个开箱即用的 `.exe`，实现真正的“双击即用”。

### 2. 智能体产生的文件保存在哪里？
与命令行版本一致，所有会话历史、记忆与插件数据保存在当前 Windows 用户的 `%USERPROFILE%\.pi\agent` 目录下。您也可以通过托盘菜单直接点击 **"Open Pi Data Directory"** 直达该文件夹。

### 3. 如何彻底退出应用？
如果开启了“关闭最小化到托盘”，点击窗口右上角 `X` 仅隐藏窗口。如需彻底退出，可以通过以下任一方式：
- 托盘图标右键菜单 -> 选择 **"Quit Pi Web Desktop"**
- 顶部菜单栏 -> 选择 **File -> Exit**
- 快捷键使用 `Alt + F4` 并在提示时选择退出。

---

## 开源协议

本项目遵循 [MIT License](./LICENSE)。
核心 Web 界面与智能体代码版权归原项目 [pi-web](https://github.com/agegr/pi-web) 及 [pi](https://github.com/earendil-works/pi) 所有。
