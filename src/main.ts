import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import * as path from 'path'
import { ChildProcess, fork } from 'child_process'

let backendProcess: ChildProcess
const openWindows: BrowserWindow[] = []

function createMainWindow() {
	console.log('LOG 3A: Inside createMainWindow function.')
	const win = new BrowserWindow({
		width: 510,
		height: 200,
		frame: false,
		transparent: true,
		alwaysOnTop: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js')
		}
	})

	win.setIgnoreMouseEvents(true)

	win.loadFile(path.join(__dirname, '..', 'frontend', 'input.html'))
	openWindows.push(win)
}

function createFuelWindow() {
	console.log('LOG 3B: Inside createFuelWindow function.')
	const win = new BrowserWindow({
		width: 220,
		height: 170,
		frame: false,
		transparent: true,
		alwaysOnTop: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js')
		}
	})
	win.setIgnoreMouseEvents(true)
	win.loadFile(path.join(__dirname, '..', 'frontend', 'fuel.html'))
	win.webContents.openDevTools({ mode: 'detach' })
	openWindows.push(win)
}

app.whenReady().then(() => {
	const settingsWindow = new BrowserWindow({
		width: 450,
		height: 400,
		webPreferences: { preload: path.join(__dirname, 'preload.js') }
	})
	settingsWindow.loadFile(path.join(__dirname, '..', 'frontend', 'settings.html'))

	ipcMain.on('launch-app', (event, settings) => {
		console.log("LOG 1: 'launch-app' event received with settings:", settings)
		backendProcess = fork(path.join(__dirname, '..', 'src', 'server.js'))

		backendProcess.send(settings)

		if (settings.showGraph) {
			console.log("LOG 2A: 'showGraph' is true. Calling createMainWindow...") // Debug log
			createMainWindow()
		}
		if (settings.showFuel) {
			console.log("LOG 2B: 'showFuel' is true. Calling createFuelWindow...") // Debug log
			createFuelWindow()
		}

		settingsWindow.close()
	})

	globalShortcut.register('Alt+Q', () => {
		app.quit()
	})

	let isEditable = false
	globalShortcut.register('Alt+D', () => {
		isEditable = !isEditable
		openWindows.forEach((win) => {
			win.setIgnoreMouseEvents(!isEditable)
			win.setResizable(isEditable)
			win.webContents.send('toggle-move-mode', isEditable)
		})
	})

	openWindows.forEach((window) => {
		if (window && !window.isDestroyed()) {
			window.on('resize', () => {
				const [width, height] = window.getSize()
				window.webContents.send('window-resized', { width, height })
			})
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
