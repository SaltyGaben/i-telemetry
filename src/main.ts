import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import * as path from 'path'
import { ChildProcess, fork } from 'child_process'
import * as fs from 'fs'

let backendProcess: ChildProcess
const openWindows: BrowserWindow[] = []

interface WindowPosition {
	x: number
	y: number
	width: number
	height: number
}

interface WindowPositions {
	mainWindow?: WindowPosition
	fuelWindow?: WindowPosition
	settingsWindow?: WindowPosition
}

interface SavedConnectionInfo {
	serverAddress?: string
	driverName?: string
}

function getSettingsPath(): string {
	const userDataPath = app.getPath('userData')
	return path.join(userDataPath, 'window-positions.json')
}

function loadWindowPositions(): WindowPositions {
	try {
		const settingsPath = getSettingsPath()
		if (fs.existsSync(settingsPath)) {
			const data = fs.readFileSync(settingsPath, 'utf8')
			return JSON.parse(data)
		}
	} catch (error) {
		console.error('Error loading window positions:', error)
	}
	return {}
}

function saveWindowPosition(windowType: keyof WindowPositions, position: WindowPosition) {
	try {
		const positions = loadWindowPositions()
		positions[windowType] = position
		const settingsPath = getSettingsPath()
		fs.writeFileSync(settingsPath, JSON.stringify(positions, null, 2))
	} catch (error) {
		console.error('Error saving window position:', error)
	}
}

function getWindowPosition(windowType: keyof WindowPositions, defaultPosition: WindowPosition): WindowPosition {
	const positions = loadWindowPositions()
	return positions[windowType] || defaultPosition
}

function getLastConnectionPath(): string {
	const userDataPath = app.getPath('userData')
	return path.join(userDataPath, 'last-connection.json')
}

function loadLastConnection(): SavedConnectionInfo {
	try {
		const connectionPath = getLastConnectionPath()
		if (fs.existsSync(connectionPath)) {
			const data = fs.readFileSync(connectionPath, 'utf8')
			return JSON.parse(data)
		}
	} catch (error) {
		console.error('Error loading last connection info:', error)
	}
	return {}
}

function saveLastConnection(info: SavedConnectionInfo) {
	try {
		const connectionPath = getLastConnectionPath()
		fs.writeFileSync(connectionPath, JSON.stringify(info, null, 2))
	} catch (error) {
		console.error('Error saving last connection info:', error)
	}
}

function createMainWindow() {
	const savedPosition = getWindowPosition('mainWindow', { x: 100, y: 100, width: 550, height: 210 })

	const win = new BrowserWindow({
		width: savedPosition.width,
		height: savedPosition.height,
		x: savedPosition.x,
		y: savedPosition.y,
		frame: false,
		transparent: true,
		alwaysOnTop: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js')
		}
	})

	win.setIgnoreMouseEvents(true)
	win.loadFile(path.join(__dirname, '..', 'frontend', 'input.html'))
	//win.webContents.openDevTools({ mode: 'detach' })

	win.on('moved', () => {
		const [x, y] = win.getPosition()
		const [width, height] = win.getSize()
		saveWindowPosition('mainWindow', { x, y, width, height })
	})

	win.on('resize', () => {
		const [x, y] = win.getPosition()
		const [width, height] = win.getSize()
		saveWindowPosition('mainWindow', { x, y, width, height })
	})

	openWindows.push(win)
}

function createFuelWindow() {
	const savedPosition = getWindowPosition('fuelWindow', { x: 650, y: 100, width: 220, height: 170 })

	const win = new BrowserWindow({
		width: savedPosition.width,
		height: savedPosition.height,
		x: savedPosition.x,
		y: savedPosition.y,
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

	win.on('moved', () => {
		const [x, y] = win.getPosition()
		const [width, height] = win.getSize()
		saveWindowPosition('fuelWindow', { x, y, width, height })
	})

	win.on('resize', () => {
		const [x, y] = win.getPosition()
		const [width, height] = win.getSize()
		saveWindowPosition('fuelWindow', { x, y, width, height })
	})

	openWindows.push(win)
}

app.whenReady().then(() => {
	const savedPosition = getWindowPosition('settingsWindow', { x: 100, y: 100, width: 450, height: 650 })

	const settingsWindow = new BrowserWindow({
		width: savedPosition.width,
		height: savedPosition.height,
		x: savedPosition.x,
		y: savedPosition.y,
		webPreferences: { preload: path.join(__dirname, 'preload.js') }
	})
	settingsWindow.loadFile(path.join(__dirname, '..', 'frontend', 'settings.html'))

	settingsWindow.on('moved', () => {
		const [x, y] = settingsWindow.getPosition()
		const [width, height] = settingsWindow.getSize()
		saveWindowPosition('settingsWindow', { x, y, width, height })
	})

	settingsWindow.on('resize', () => {
		const [x, y] = settingsWindow.getPosition()
		const [width, height] = settingsWindow.getSize()
		saveWindowPosition('settingsWindow', { x, y, width, height })
	})

	ipcMain.on('launch-app', (event, settings) => {
		backendProcess = fork(path.join(__dirname, '..', 'src', 'server.js'))

		backendProcess.send(settings)

		// Persist last successful shared connection for next launch
		try {
			if (settings && settings.dataSource === 'shared' && settings.serverAddress) {
				saveLastConnection({
					serverAddress: settings.serverAddress,
					driverName: settings.driverName
				})
			}
		} catch (error) {
			console.error('Failed to persist last connection:', error)
		}

		if (settings.showGraph) {
			createMainWindow()
		}
		if (settings.showFuel) {
			createFuelWindow()
		}

		settingsWindow.close()
	})

	// Provide saved connection info to renderer for pre-filling the form
	ipcMain.handle('get-saved-connection', () => {
		return loadLastConnection()
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
			win.setAlwaysOnTop(true)
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
	if (backendProcess) {
		backendProcess.kill()
	}
	globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
