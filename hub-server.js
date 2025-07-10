const http = require('http')
const { WebSocketServer } = require('ws')

// Create a simple HTTP server and a WebSocket server on top of it
const server = http.createServer()
const wss = new WebSocketServer({ server })

const PORT = 8081 // Using a different port (8081) to avoid conflicts

// This will store the latest data for each driver
const driverData = new Map()

wss.on('connection', (ws) => {
	console.log('A new client connected.')

	ws.on('message', (message) => {
		try {
			const data = JSON.parse(message)

			// We expect data in the format: { driverName: "...", telemetry: {...} }
			if (data.driverName && data.telemetry) {
				// Store the latest data for this driver
				driverData.set(data.driverName, data.telemetry)
			}
		} catch (e) {
			console.error('Failed to parse message:', e)
		}
	})

	ws.on('close', () => {
		console.log('Client disconnected.')
	})
})

// Broadcast the latest data for ALL drivers to ALL clients periodically
setInterval(() => {
	if (driverData.size === 0) return // Don't send empty updates

	// Convert the Map to an array of objects for sending
	const payload = Array.from(driverData.entries()).map(([driverName, telemetry]) => ({
		driverName,
		telemetry
	}))

	// Broadcast the full payload to every connected client
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(payload))
		}
	})
}, 500) // Broadcast team data twice per second

server.listen(PORT, () => {
	console.log(`Hub Server is listening on http://localhost:${PORT}`)
	console.log("To share, run 'ngrok http 8081' and give the URL to your team.")
})
