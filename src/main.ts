import { app, BrowserWindow, globalShortcut } from 'electron'
import * as path from 'path'
import { ChildProcess, fork } from 'child_process'

let backendProcess: ChildProcess

function createWindow() {
	const mainWindow = new BrowserWindow({
		width: 510,
		height: 200,
		frame: false,
		transparent: true,
		alwaysOnTop: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js')
		}
	})

	mainWindow.setIgnoreMouseEvents(true)

	mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'index.html'))

	let isDraggable = false

	globalShortcut.register('Alt+D', () => {
		isDraggable = !isDraggable
		mainWindow.setIgnoreMouseEvents(!isDraggable)
		mainWindow.setResizable(isDraggable)
		mainWindow.webContents.send('toggle-move-mode', isDraggable)
	})

	globalShortcut.register('Alt+Q', () => {
		app.quit()
	})

	mainWindow.on('resize', () => {
		const [width, height] = mainWindow.getSize()
		mainWindow.webContents.send('window-resized', { width, height })
	})

	// Uncomment to enable devtools
	// mainWindow.webContents.openDevTools({ mode: 'detach' })
}

app.whenReady().then(() => {
	const backendScriptPath = path.join(__dirname, '..', 'src', 'server.js')
	backendProcess = fork(backendScriptPath)

	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('will-quit', () => {
	backendProcess.kill()
	globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
