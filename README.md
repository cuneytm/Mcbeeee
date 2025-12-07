<div align="center">

<img src="public/logo.png" alt="MCBeeee Logo" width="200"/>

# MCBeeee 🐑

### Secure Agentic Gateway for AI File System Access

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![macOS](https://img.shields.io/badge/macOS-10.12+-blue.svg)](https://www.apple.com/macos/)
[![Electron](https://img.shields.io/badge/Electron-30.0+-9feaf9.svg)](https://www.electronjs.org/)

A beautiful, secure desktop application that provides controlled file system access to AI agents via the Model Context Protocol (MCP).

[Download for macOS](#-download) • [Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 📥 Download

### Latest Release (v1.0.0)

Choose the version for your Mac:

| Platform | Download Link |
|----------|--------------|
| **Apple Silicon** (M1/M2/M3) | [Download for Apple Silicon](https://github.com/cuneytm/Mcbeeee/releases/download/v1.0.0/MCBeeee-1.0.0-arm64.dmg) |
| **Intel** (x64) | [Download for Intel Mac](https://github.com/cuneytm/Mcbeeee/releases/download/v1.0.0/MCBeeee-1.0.0.dmg) |


### Installation

1. Download the appropriate DMG file for your Mac
2. Open the DMG file
3. Drag **MCBeeee** to your Applications folder
4. Right-click the app and select "Open" (first time only)
5. Grant notification permissions when prompted

> **⚠️ "App is damaged" Error?**
>
> If macOS says the app is "damaged/can't be opened", run this command in Terminal to bypass Gatekeeper (required for unsigned apps):
> ```bash
> xattr -cr /Applications/MCBeeee.app
> ```

---

## ✨ Features

### 🎨 **Beautiful UI**
- Modern dark theme with amber accents
- Smooth animations and transitions
- Responsive design with glassmorphism effects

### 🔒 **Security First**
- **Request Approval System**: Review every AI file operation
- **macOS Native Notifications**: Approve/deny requests from anywhere
- **Network Isolation**: Localhost-only or external network access
- **Path Confinement**: Restrict AI access to specific directories
- **Optional API Keys**: Add an extra layer of authentication

### 🔔 **Smart Notifications**
- Native macOS notifications with action buttons
- Approve or deny requests without opening the app
- Notifications stay in Notification Center for review
- In-app modal for detailed request inspection

### 📊 **Activity Monitoring**
- Real-time activity log
- Color-coded log entries (Info, Error, Request)
- Clear history button
- Fixed-height scrollable view

### 🔧 **Easy Configuration**
- One-click config copy for Claude Desktop and VS Code
- Visual toggle switches for all settings
- Directory picker for allowed paths
- Security warnings when needed

---

## 🚀 Quick Start

### 1. Launch MCBeeee

Open the app and click **Start Server** to begin.

### 2. Configure Your AI Client

#### For Claude Desktop:

1. Click the **Claude Desktop** card in MCBeeee to copy the configuration
2. Open: `~/Library/Application Support/Claude/claude_desktop_config.json`
3. Paste the configuration
4. Restart Claude Desktop

#### For VS Code:

1. Click the **VS Code** card in MCBeeee to copy the configuration
2. Create/Open the config file:
   - **Project-specific**: `${PROJECT_FOLDER}/.vscode/mcp.json`
   - **Global**: `$HOME/Library/Application Support/Code/User/mcp.json`
   ```json
   {
     "servers": {
       "mcbeeee": {
         "type": "sse",
         "url": "http://localhost:3000/sse",
         "headers": {
           "Authorization": "YOUR_API_KEY"
         }
       }
     }
   }
   ```
   (Remove the "headers" section if you haven't set an API key)
4. Restart VS Code


### 3. Set Allowed Directory

1. Click **Choose Directory** in MCBeeee
2. Select the folder you want to grant AI access to
3. The AI can now only access files within this directory

### 4. Configure Approval Settings

- **Request Approval ON**: You'll get a notification for every file operation
- **Request Approval OFF**: AI can access files automatically (use with caution!)

---

## 📖 Documentation

### Network Isolation

- **Enabled (Default)**: Server only accepts connections from `127.0.0.1` (localhost)
- **Disabled**: Server accepts connections from `0.0.0.0` (all network interfaces)

⚠️ **Warning**: When disabled, ensure your firewall allows port 3000 (or your configured port).

### Notification Permissions

MCBeeee uses macOS notifications to alert you when AI agents request file access.

**First-time setup:**
- macOS will automatically prompt for notification permissions
- Click "Allow" to enable notifications

**If you missed the prompt:**
1. Open **System Settings** → **Notifications**
2. Find **MCBeeee** in the list
3. Enable **Allow Notifications**
4. Recommended settings:
   - Alert Style: **Alerts** (stays on screen)
   - Show in Notification Center: **ON**
   - Badge app icon: **ON**

### Firewall Configuration

If you disable Network Isolation for external access:

1. Open **System Settings** → **Network** → **Firewall**
2. Click **Options**
3. Ensure port 3000 (or your configured port) is allowed
4. Or add MCBeeee to the allowed apps list

### API Keys

API keys are optional but recommended for additional security:

1. Enter an API key in the MCBeeee settings
2. The key will be included in your client configuration
3. All requests must include this key to be accepted

---

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/cuneytm/Mcbeeee.git
cd Mcbeeee

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

The built DMG files will be in the `release/` folder.

---

## 🏗️ Architecture

MCBeeee is built with:

- **Electron** - Desktop application framework
- **React** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **MCP SDK** - Model Context Protocol implementation

### Bridge Mode

MCBeeee includes a `bridge.js` script that translates between:
- **stdio transport** (used by Claude Desktop)
- **SSE transport** (used by the Electron app)

This allows standard MCP clients to communicate with the visual desktop interface.

---

## 🔐 Security Model

1. **Path Confinement**: AI can ONLY access files within the configured "Allowed Directory"
2. **Request Approval**: Every file operation can require manual approval
3. **Network Isolation**: Default localhost-only binding prevents external access
4. **API Authentication**: Optional API key for additional security
5. **Activity Logging**: All operations are logged for audit

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/cuneytm/Mcbeeee/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cuneytm/Mcbeeee/discussions)

---

<div align="center">

Made with ❤️ for the AI community

**MCBeeee** - Secure Agentic Gateway

</div>
