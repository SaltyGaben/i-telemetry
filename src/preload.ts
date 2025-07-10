import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
	launchApp: (settings: object) => ipcRenderer.send('launch-app', settings),
	onReceiveSettings: (callback: (event: any, settings: any) => void) => ipcRenderer.on('receive-settings', callback),
	onToggleMoveMode: (callback: (event: any, value: any) => void) => ipcRenderer.on('toggle-move-mode', callback),
	onWindowResized: (callback: (event: any, value: { width: number; height: number }) => void) => ipcRenderer.on('window-resized', callback)
})
