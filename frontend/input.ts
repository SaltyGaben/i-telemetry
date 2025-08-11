/// <reference path="renderer.d.ts" />

const DISPLAY_HISTORY_WIDTH = 200
const THROTTLE_COLOR = '#00ff00'
const BRAKE_COLOR = '#ff0000'
const BG_COLOR = 'rgba(0, 0, 0, 0.6)'
const ABS_COLOR = 'rgba(239, 255, 91, 0.6)'

const canvas = document.getElementById('telemetry-graph') as HTMLCanvasElement
const ctx = canvas.getContext('2d')
const gearDisplay = document.getElementById('gear-display') as HTMLDivElement
const speedText = document.getElementById('speed-text') as HTMLDivElement
const rpmText = document.getElementById('rpm-text') as HTMLDivElement

canvas.width = 400
canvas.height = 150

const throttleHistory: number[] = []
const brakeHistory: number[] = []
let absOn: boolean = false

interface TelemetryData {
	localInputs?: {
		Throttle?: number
		Brake?: number
		Gear?: number
		Speed?: number
		Abs?: boolean
		RPM?: number
	}
}

function drawLine(history: number[], color: string) {
	if (!ctx) return

	ctx.beginPath()
	ctx.lineWidth = 2
	ctx.strokeStyle = color

	const startIndex = Math.max(0, history.length - DISPLAY_HISTORY_WIDTH)

	const xScale = canvas.width / DISPLAY_HISTORY_WIDTH

	for (let i = startIndex; i < history.length; i++) {
		const value = history[i]

		const y = canvas.height - (value || 0) * canvas.height

		const x = (i - startIndex) * xScale

		if (i === startIndex) {
			ctx.moveTo(x, y)
		} else {
			ctx.lineTo(x, y)
		}
	}

	ctx.stroke()
}

function draw() {
	if (!ctx) return
	ctx.clearRect(0, 0, canvas.width, canvas.height)
	ctx.fillStyle = absOn ? ABS_COLOR : BG_COLOR
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	drawLine(throttleHistory, THROTTLE_COLOR)
	drawLine(brakeHistory, BRAKE_COLOR)
	requestAnimationFrame(draw)
}

function connect() {
	const ws = new WebSocket('ws://localhost:8080')
	ws.onopen = () => console.log('Overlay connected to backend.')
	ws.onmessage = (event) => {
		const data: TelemetryData = JSON.parse(event.data)
		let throttle = 0
		let brake = 0
		let gear = 0
		let speed = 0
		let abs = false
		let rpm = 0

		if ('localInputs' in data && data.localInputs) {
			throttle = data.localInputs.Throttle || 0
			brake = data.localInputs.Brake || 0
			gear = data.localInputs.Gear || 0
			speed = data.localInputs.Speed || 0
			abs = data.localInputs.Abs || false
			rpm = data.localInputs.RPM || 0
		}

		throttleHistory.push(throttle)
		brakeHistory.push(brake)
		absOn = abs
		if (throttleHistory.length > canvas.width) throttleHistory.shift()
		if (brakeHistory.length > canvas.width) brakeHistory.shift()
		if (gear !== undefined && gearDisplay) {
			let gearText = String(gear)
			if (gear === 0) gearText = 'N'
			if (gear === -1) gearText = 'R'
			gearDisplay.textContent = gearText
		}
		if (speed !== undefined && speedText) {
			const speed_kmh = speed * 3.6
			speedText.textContent = Math.round(speed_kmh).toString()
		}
		if (rpm !== undefined && rpmText) {
			rpmText.textContent = Math.round(rpm).toString()
		}
	}
	ws.onclose = () => setTimeout(connect, 3000)
}

window.electronAPI.onToggleMoveMode((event, isDraggable) => {
	document.body.classList.toggle('draggable', isDraggable)
})

window.electronAPI.onWindowResized((event, { width, height }) => {
	const newCanvasWidth = width - 110
	const newCanvasHeight = height - 50

	canvas.width = newCanvasWidth
	canvas.height = newCanvasHeight

	draw()
})

connect()
draw()
