
import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  // Specific methods for type safety
  startServer: () => ipcRenderer.send('start-server'),
  stopServer: () => ipcRenderer.send('stop-server'),
  updateConfig: (config: any) => ipcRenderer.send('update-config', config),
  resolveApproval: (id: string, approved: boolean) => ipcRenderer.send('resolve-approval', { id, approved }),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
})
