/// <reference path="renderer.d.ts" />

const ROLLING_AVG_LAPS = 5

interface TelemetryData {
	FuelLevel?: number
	Lap?: number
	IsOnTrack?: boolean
}

interface DriverState {
	currentLap: number
	fuelAtLapStart: number
	lastLapFuelUsed: number
	fuelUsageHistory: number[]
	isOnTrack: boolean
}

const driverStates = new Map<string, DriverState>()

const fuelContainer = document.querySelector('.fuel-container')

function connectFuel() {
	const ws = new WebSocket('ws://localhost:8080')

	ws.onmessage = (event) => {
		const data = JSON.parse(event.data)
		if (!fuelContainer) {
			console.error('Fuel container element not found!')
			return
		}

		let driversToShow = []

		if (data.isShared) {
			driversToShow = data.drivers
		} else {
			driversToShow = [{ driverName: 'You', telemetry: data }]
		}

		let newHtml = ''

		if (driversToShow.length === 0 || !data) {
			newHtml = `<div class="driver-item"><div class="driver-name">Waiting for data...</div></div>`
		} else {
			for (const driver of driversToShow) {
				const driverName = driver.driverName
				const telemetry: TelemetryData = data.isShared ? driver.telemetry : data.localInputs

				if (!driverStates.has(driverName)) {
					driverStates.set(driverName, {
						currentLap: 0,
						fuelAtLapStart: 0,
						lastLapFuelUsed: 0,
						fuelUsageHistory: [],
						isOnTrack: false
					})
				}
				const state = driverStates.get(driverName)!

				if (telemetry.Lap !== undefined && telemetry.FuelLevel !== undefined) {
					if (telemetry.Lap > state.currentLap) {
						if (state.currentLap !== 0 && state.fuelAtLapStart > 0) {
							const fuelUsedThisCompletedLap = state.fuelAtLapStart - telemetry.FuelLevel

							if (fuelUsedThisCompletedLap > 0.1 && fuelUsedThisCompletedLap < 100) {
								state.lastLapFuelUsed = fuelUsedThisCompletedLap
								state.fuelUsageHistory.push(fuelUsedThisCompletedLap)

								if (state.fuelUsageHistory.length > ROLLING_AVG_LAPS) {
									state.fuelUsageHistory.shift()
								}
							} else {
								state.lastLapFuelUsed = 0
							}
						} else {
							state.lastLapFuelUsed = 0
							state.fuelUsageHistory = []
						}
						state.fuelAtLapStart = telemetry.FuelLevel
					}
					state.currentLap = telemetry.Lap
				}

				let rollingAverageFuelPerLap = 0
				if (state.fuelUsageHistory.length > 0) {
					const totalInHistory = state.fuelUsageHistory.reduce((sum, val) => sum + val, 0)
					rollingAverageFuelPerLap = totalInHistory / state.fuelUsageHistory.length
				}

				let lapsLeft = 0
				if (rollingAverageFuelPerLap > 0 && telemetry.FuelLevel !== undefined) {
					lapsLeft = telemetry.FuelLevel / rollingAverageFuelPerLap
				}

				console.log("data: ", telemetry.FuelLevel)
				console.log("data: ", lapsLeft)
				
				state.isOnTrack = telemetry.IsOnTrack || false
				let driverStatus = state.isOnTrack ? 'On Track' : 'In Pits'
				let pitDotClass = state.isOnTrack ? 'pit-dot' : 'pit-dot in-pits'

				newHtml += `
                <div class="driver-item">
                    <div class="driver-name">${driverName}</div>
					<div class="driver-status-container">
						<span class="${pitDotClass}"></span>
						<span class="driver-status">${driverStatus}</span>
					</div>
                    <div class="driver-stats">
                        <div class="stat-item">
                            <span class="stat-value">${telemetry.FuelLevel?.toFixed(2) ?? '0.00'}</span>
                            <span class="stat-label">Fuel (L)</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${state.lastLapFuelUsed.toFixed(2) ?? '0.00'}</span>
                            <span class="stat-label">Last F/L</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${rollingAverageFuelPerLap.toFixed(2) ?? '0.00'}</span>
                            <span class="stat-label">Avg F/L</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${lapsLeft.toFixed(1) ?? '0.0'}</span>
                            <span class="stat-label">Laps Left</span>
                        </div>
                    </div>
                </div>
            `
			}
		}

		fuelContainer.innerHTML = newHtml
	}
}

window.electronAPI.onToggleMoveMode((event, isDraggable) => {
	document.body.classList.toggle('draggable', isDraggable)
})

connectFuel()
