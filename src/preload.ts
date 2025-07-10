import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
	onToggleMoveMode: (callback: (event: any, value: any) => void) => ipcRenderer.on('toggle-move-mode', callback),
	onWindowResized: (callback: (event: any, value: { width: number; height: number }) => void) => ipcRenderer.on('window-resized', callback)
})
