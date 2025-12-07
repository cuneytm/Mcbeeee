
import { app, BrowserWindow, ipcMain, dialog, Notification } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { McpService } from './server'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let mcpService: McpService | null = null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      // Security: nodeIntegration false, contextIsolation true is default and good.
    },
    width: 1000,
    height: 800,
    titleBarStyle: 'hiddenInset', // Mac style
    vibrancy: 'under-window', // Glass effect
    visualEffectState: 'active'
  })

  // Initialize MCP Service
  mcpService = new McpService(win);

  // Send initial state on load
  win.webContents.on('did-finish-load', () => {
    if (mcpService) win?.webContents.send('status-update', mcpService.state);
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow();

  // Request notification permissions (macOS)
  if (process.platform === 'darwin' && !Notification.isSupported()) {
    console.warn('Notifications are not supported on this system');
  }

  // IPC Handlers
  ipcMain.on('start-server', () => mcpService?.start());
  ipcMain.on('stop-server', () => mcpService?.stop());
  ipcMain.on('update-config', (_, config) => mcpService?.updateConfig(config));
  ipcMain.on('resolve-approval', (_, { id, approved }) => mcpService?.resolveApproval(id, approved));

  ipcMain.handle('pick-directory', async () => {
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
})
