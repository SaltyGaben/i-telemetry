const irsdk = require('iracing-sdk-js')
const { WebSocketServer, WebSocket } = require('ws')

const wss = new WebSocketServer({ port: 8080 })

// --- State Variables ---
let latestLocalTelemetry = {}
let latestSharedData = [] // Will be an array of { driverName, telemetry }
let settings = { dataSource: 'local' }
let hubConnection = null

// --- 1. Listen for settings from the main process ---
process.on('message', (newSettings) => {
	console.log('Backend received settings:', newSettings)
	settings = newSettings
	if (settings.dataSource === 'shared' && settings.serverAddress) {
		connectToHub(settings.serverAddress)
	}
})

// --- 2. Function to connect to the remote hub ---
function connectToHub(serverAddress) {
	if (hubConnection) hubConnection.close() // Close any existing connection

	console.log(`Connecting to shared hub at ${serverAddress}`)
	hubConnection = new WebSocket(serverAddress)

	// When the hub sends us the list of all drivers, store it
	hubConnection.on('message', (message) => {
		try {
			latestSharedData = JSON.parse(message)
		} catch (e) {
			console.error('Failed to parse hub message:', e)
		}
	})

	hubConnection.on('error', (err) => console.error('Hub connection error:', err.message))
	hubConnection.on('close', () => {
		console.log('Disconnected from hub. Retrying...')
		setTimeout(() => connectToHub(serverAddress), 5000)
	})
}

// --- 3. Always read local iRacing data ---
const iracing = irsdk.init({ telemetryUpdateInterval: 250 }) // 4x per second
iracing.on('Telemetry', (data) => {
	// A. Prepare local data for the overlays
	latestLocalTelemetry = {
		Throttle: data.values.Throttle,
		Brake: data.values.Brake,
		// Always include local fuel data for the calculation logic
		FuelLevel: data.values.FuelLevel,
		FuelLevelPct: data.values.FuelLevelPct,
		Lap: data.values.Lap
	}

	// B. If in shared mode, also REPORT local data to the hub
	if (settings.dataSource === 'shared' && hubConnection?.readyState === WebSocket.OPEN) {
		const payload = {
			driverName: settings.driverName || 'Unknown',
			telemetry: data.values
		}
		hubConnection.send(JSON.stringify(payload))
	}
})

// --- 4. Broadcast a unified data packet to all local overlays ---
setInterval(() => {
	let payload = {}

	if (settings.dataSource === 'shared') {
		// In shared mode, the payload is the full list from the hub
		payload = {
			isShared: true,
			drivers: latestSharedData,
			// Also include local inputs for the graph overlay
			localInputs: {
				Throttle: latestLocalTelemetry.Throttle,
				Brake: latestLocalTelemetry.Brake
			}
		}
	} else {
		// In local mode, the payload is just the local telemetry
		payload = {
			isShared: false,
			...latestLocalTelemetry
		}
	}

	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(payload))
		}
	})
}, 60) // Broadcast at a smooth rate
