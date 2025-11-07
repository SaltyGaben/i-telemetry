const irsdk = require('iracing-sdk-js')
const { WebSocketServer, WebSocket } = require('ws')

const wss = new WebSocketServer({ port: 8080 })

let latestLocalTelemetry = {}
let latestSharedData = []
let latestServerTelemetry = null
let latestSessionInfo = null
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
		RPM: data.values.RPM,
		Gear: data.values.Gear,
		IsOnTrack: data.values.IsOnTrack,
		Abs: data.values.BrakeABSactive,
		FuelLevel: data.values.FuelLevel,
		Lap: data.values.Lap
	}

	latestServerTelemetry = {
		FuelLevel: data.values.FuelLevel,
		IsOnTrack: data.values.IsOnTrack,
		Lap: data.values.Lap,
		CarIdxLap: data.values.CarIdxLap,
		CarIdxLapCompleted: data.values.CarIdxLapCompleted,
		CarIdxPosition: data.values.CarIdxPosition,
		CarIdxClassPosition: data.values.CarIdxClassPosition,
		CarIdxClass: data.values.CarIdxClass,
		CarIdxLastLapTime: data.values.CarIdxLastLapTime,
		CarIdxBestLapTime: data.values.CarIdxBestLapTime,
		LapBestLapTime: data.values.LapBestLapTime,
		LapLastLapTime: data.values.LapLastLapTime,
		LapCompleted: data.values.LapCompleted,
		PlayerCarIdx: data.values.PlayerCarIdx,
		PlayerCarTeamIncidentCount: data.values.PlayerCarTeamIncidentCount,
		PlayerCarMyIncidentCount: data.values.PlayerCarMyIncidentCount,
		PlayerCarPosition: data.values.PlayerCarPosition,
		PlayerCarClassPosition: data.values.PlayerCarClassPosition
	}
})
iracing.on('SessionInfo', (sessionInfo) => {
	const drivers = sessionInfo.data.DriverInfo.Drivers.map((driver) => ({
		UserName: driver.UserName,
		TeamName: driver.TeamName,
		CarIdx: driver.CarIdx,
		UserID: driver.UserID
	}))
	latestSessionInfo = {
		Drivers: drivers,
		CurrentUserID: sessionInfo.data.DriverInfo.DriverUserID
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
				Speed: latestLocalTelemetry.Speed,
				RPM: latestLocalTelemetry.RPM,
				Abs: latestLocalTelemetry.Abs,
				FuelLevel: latestLocalTelemetry.FuelLevel,
				IsOnTrack: latestLocalTelemetry.IsOnTrack,
				Lap: latestLocalTelemetry.Lap
			}
		}
	} else {
		payload = {
			isShared: false,
			localInputs: {
				Throttle: latestLocalTelemetry.Throttle,
				Brake: latestLocalTelemetry.Brake,
				Gear: latestLocalTelemetry.Gear,
				Speed: latestLocalTelemetry.Speed,
				RPM: latestLocalTelemetry.RPM,
				Abs: latestLocalTelemetry.Abs,
				FuelLevel: latestLocalTelemetry.FuelLevel,
				IsOnTrack: latestLocalTelemetry.IsOnTrack,
				Lap: latestLocalTelemetry.Lap
			}
		}
	}

	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(payload))
		}
	})
}, 16)

setInterval(() => {
	if (settings.dataSource === 'shared' && hubConnection?.readyState === WebSocket.OPEN && latestServerTelemetry) {
		const payload = {
			driverName: settings.driverName || 'Unknown',
			telemetry: latestServerTelemetry,
			sessionInfo: latestSessionInfo
		}
		hubConnection.send(JSON.stringify(payload))
	}
}, 500)
