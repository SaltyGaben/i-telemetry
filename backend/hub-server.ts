import { ConvexHttpClient } from 'convex/browser'
import { api } from './convex/_generated/api.js'
import type { Doc } from 'convex/_generated/dataModel.js'

// HTTP client
const httpClient = new ConvexHttpClient(process.env.CONVEX_URL!)

type SessionInfo = {
	Drivers: Array<{
		UserName: string
		TeamName: string
		CarIdx: number
		UserID: string
	}>
	CurrentUserID: string
}

type Telemetry = {
	FuelLevel: number
	IsOnTrack: boolean
	Lap: number
	CarIdxLap: number[]
	CarIdxLapCompleted: number[]
	CarIdxPosition: number[]
	CarIdxClassPosition: number[]
	CarIdxClass: number[]
	CarIdxLastLapTime: number[]
	CarIdxBestLapTime: number[]
	LapBestLapTime: number
	LapLastLapTime: number
	LapCompleted: number
	PlayerCarIdx: number
	PlayerCarTeamIncidentCount: number
	PlayerCarMyIncidentCount: number
	PlayerCarPosition: number
	PlayerCarClassPosition: number
}

type Data = {
	driverName: string
	telemetry: Telemetry
	sessionInfo: SessionInfo
}

type TelemetryTeam = Doc<'telemetry_team'>
type TelemetryAll = Doc<'telemetry_all'>

const http = require('http')
const { WebSocketServer } = require('ws')

const server = http.createServer()
const ws = new WebSocketServer({ server })

const PORT = 8081
const USE_DB = process.argv.includes('--db')

const driverData = new Map<string, Telemetry>()
const clientDrivers = new Map()
let latestSessionInfo: SessionInfo = {
	Drivers: [],
	CurrentUserID: ''
}
let userOnTrack: string = ''

ws.on('connection', (ws: any) => {
	console.log('A new client connected.')

	ws.on('message', (message: any) => {
		try {
			const data: Data = JSON.parse(message)

			if (data.driverName && data.telemetry) {
				driverData.set(data.driverName, data.telemetry)

				if (!clientDrivers.has(ws)) {
					clientDrivers.set(ws, new Set())
				}
				clientDrivers.get(ws).add(data.driverName)
			}
			if (data.sessionInfo) {
				latestSessionInfo = data.sessionInfo
			}
			if (data.telemetry.IsOnTrack) {
				userOnTrack = data.sessionInfo.CurrentUserID
			}
		} catch (e) {
			console.error('Failed to parse message:', e)
		}
	})

	ws.on('close', () => {
		console.log('Client disconnected.')

		const driversFromClient = clientDrivers.get(ws)
		if (driversFromClient) {
			driversFromClient.forEach((driverName: string) => {
				driverData.delete(driverName)
			})
			clientDrivers.delete(ws)
		}

		if (driverData.size === 0) {
			latestSessionInfo.Drivers = []
		}
	})
})

setInterval(() => {
	if (driverData.size === 0) return

	const payload = Array.from(driverData.entries()).map(([driverName, telemetry]) => ({
		driverInfo: {
			UserID: latestSessionInfo.Drivers.find((d) => d.UserName === driverName)?.UserID ?? '',
			UserName: driverName
		},
		telemetry
	}))

	ws.clients.forEach((client: any) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(payload))
		}
	})
}, 500)

server.listen(PORT, () => {
	console.log(`Hub Server is listening on http://localhost:${PORT}`)
})

if (USE_DB) {
	setInterval(() => {
		if (latestSessionInfo.Drivers.length > 0) {
			httpClient.mutation(api.drivers.upsertDrivers, {
				drivers: latestSessionInfo.Drivers.map((driver) => ({
					userName: driver.UserName,
					teamName: driver.TeamName,
					carIdx: driver.CarIdx,
					userID: driver.UserID
				}))
			})
		}

		driverData.forEach((telemetry, driverName) => {
			if (telemetry.IsOnTrack) {
				const carIndexes = latestSessionInfo.Drivers.map((d) => d.CarIdx)

				let telemetryAllList: any[] = []

				carIndexes.forEach(async (carIdx) => {
					const telemetryAll = {
						carIdx: carIdx,
						lap: telemetry.CarIdxLap[carIdx] ?? 0,
						lapsCompleted: telemetry.CarIdxLapCompleted[carIdx] ?? 0,
						position: telemetry.CarIdxPosition[carIdx] ?? 0,
						positionClass: telemetry.CarIdxClassPosition[carIdx] ?? 0,
						lastLapTime: telemetry.CarIdxLastLapTime[carIdx] ?? 0,
						bestLapTime: telemetry.CarIdxBestLapTime[carIdx] ?? 0,
						class: telemetry.CarIdxClass[carIdx] ?? 0
					}

					telemetryAllList.push(telemetryAll)
				})

				const telemetryTeam = {
					carIdx: telemetry.PlayerCarIdx,
					userID: userOnTrack,
					lap: telemetry.Lap,
					fuelLevel: telemetry.FuelLevel,
					incidentsTeam: telemetry.PlayerCarTeamIncidentCount,
					incidentsDriver: telemetry.PlayerCarMyIncidentCount,
					bestLapTime: telemetry.LapBestLapTime,
					lastLapTime: telemetry.LapLastLapTime,
					position: telemetry.PlayerCarPosition,
					positionClass: telemetry.PlayerCarClassPosition,
					lapsCompleted: telemetry.LapCompleted
				}

				httpClient.mutation(api.telemetry.addTelemetry, {
					telemetryTeam,
					telemetryAll: telemetryAllList
				})
			}
		})
	}, 30000)
}
