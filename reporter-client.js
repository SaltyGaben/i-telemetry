const irsdk = require('node-irsdk')
const WebSocket = require('ws')

// --- TEAMMATES MUST CONFIGURE THIS SECTION ---
// The public URL of the Hub Server (from ngrok or a cloud host)
const SERVER_URL = 'ws://localhost:8081' // <-- CHANGE THIS
// The name that will appear for this driver
const DRIVER_NAME = 'SaltyGaben' // <-- CHANGE THIS
// ---------------------------------------------

function connect() {
	console.log(`Attempting to connect to Hub at ${SERVER_URL} as ${DRIVER_NAME}`)
	const ws = new WebSocket(SERVER_URL)

	ws.on('open', () => {
		console.log('Connected to Hub. Reporting telemetry...')

		const iracing = irsdk.init({ telemetryUpdateInterval: 500 }) // Send 2x/sec

		iracing.on('Telemetry', (data) => {
			const payload = {
				driverName: DRIVER_NAME,
				telemetry: data.values // Send all telemetry values
			}

			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify(payload))
			}
		})
	})

	ws.on('error', (err) => console.error('Connection error:', err.message))
	ws.on('close', () => {
		console.log('Disconnected from Hub. Retrying in 5 seconds...')
		setTimeout(connect, 5000)
	})
}

connect()
