const irsdk = require('iracing-sdk-js')
const { WebSocketServer, WebSocket } = require('ws')

const wss = new WebSocketServer({ port: 8080 })

let latestLocalTelemetry = {}
let latestSharedData = []
let settings = { dataSource: 'local' }
let hubConnection = null

process.on('message', (newSettings) => {
	console.log('Backend received settings:', newSettings)
	settings = newSettings
	if (settings.dataSource === 'shared' && settings.serverAddress) {
		connectToHub(settings.serverAddress)
	}
})

function connectToHub(serverAddress) {
	if (hubConnection) hubConnection.close()

	console.log(`Connecting to shared hub at ${serverAddress}`)
	hubConnection = new WebSocket(serverAddress)

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

const iracing = irsdk.init({ telemetryUpdateInterval: 16 })
iracing.on('Telemetry', (data) => {
	latestLocalTelemetry = {
		Throttle: data.values.Throttle,
		Brake: data.values.Brake,
		Speed: data.values.Speed,
		Gear: data.values.Gear,
		IsOnTrack: data.values.IsOnTrack,
		Abs: data.values.BrakeABSactive,
		FuelLevel: data.values.FuelLevel,
		FuelLevelPct: data.values.FuelLevelPct,
		Lap: data.values.Lap
	}

	if (settings.dataSource === 'shared' && hubConnection?.readyState === WebSocket.OPEN) {
		const payload = {
			driverName: settings.driverName || 'Unknown',
			telemetry: data.values
		}
		hubConnection.send(JSON.stringify(payload))
	}
})

setInterval(() => {
	let payload = {}

	if (settings.dataSource === 'shared') {
		payload = {
			isShared: true,
			drivers: latestSharedData,
			localInputs: {
				Throttle: latestLocalTelemetry.Throttle,
				Brake: latestLocalTelemetry.Brake,
				Gear: latestLocalTelemetry.Gear,
				Speed: latestLocalTelemetry.Speed
			}
		}
	} else {
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
}, 16)
