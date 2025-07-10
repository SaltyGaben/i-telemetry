const irsdk = require('iracing-sdk-js')
const { WebSocketServer, WebSocket } = require('ws')

const wss = new WebSocketServer({ port: 8080 })
console.log('Backend started. WebSocket server is listening on port 8080.')

wss.on('connection', (ws) => {
	console.log('Overlay client connected.')
	ws.on('close', () => console.log('Overlay client disconnected.'))
})

function broadcast(data) {
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(data))
		}
	})
}

const iracing = irsdk.init({
	telemetryUpdateInterval: 16,
	sessionInfoUpdateInterval: 1000
})

console.log('iRacing SDK Initialized. Waiting for iRacing to start...')

// 3. Listen to the correct events
iracing.on('Connected', () => {
	console.log('Connected to iRacing.')
})

iracing.on('Disconnected', () => {
	console.log('iRacing disconnected.')
})

iracing.on('Telemetry', (data) => {
	broadcast(data.values)
})
