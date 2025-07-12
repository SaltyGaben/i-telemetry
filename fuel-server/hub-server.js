const http = require('http')
const { WebSocketServer } = require('ws')

const server = http.createServer()
const wss = new WebSocketServer({ server })

const PORT = 8081

const driverData = new Map()
const clientDrivers = new Map() // Track which client sent which driver data

wss.on('connection', (ws) => {
	console.log('A new client connected.')

	ws.on('message', (message) => {
		try {
			const data = JSON.parse(message)

			if (data.driverName && data.telemetry) {
				driverData.set(data.driverName, data.telemetry)

				// Track which client sent this driver data
				if (!clientDrivers.has(ws)) {
					clientDrivers.set(ws, new Set())
				}
				clientDrivers.get(ws).add(data.driverName)
			}
		} catch (e) {
			console.error('Failed to parse message:', e)
		}
	})

	ws.on('close', () => {
		console.log('Client disconnected.')

		// Remove all driver data that this client sent
		const driversFromClient = clientDrivers.get(ws)
		if (driversFromClient) {
			driversFromClient.forEach((driverName) => {
				driverData.delete(driverName)
			})
			clientDrivers.delete(ws)
		}
	})
})

setInterval(() => {
	if (driverData.size === 0) return

	const payload = Array.from(driverData.entries()).map(([driverName, telemetry]) => ({
		driverName,
		telemetry
	}))

	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(payload))
		}
	})
}, 500)

server.listen(PORT, () => {
	console.log(`Hub Server is listening on http://localhost:${PORT}`)
})
