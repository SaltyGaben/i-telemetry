/// <reference path="renderer.d.ts" />

const THROTTLE_COLOR = '#00ff00'
const BRAKE_COLOR = '#ff0000'
const BG_COLOR = 'rgba(0, 0, 0, 0.6)'
const ABS_COLOR = 'rgba(239, 255, 91, 0.6)'

const canvas = document.getElementById('telemetry-graph') as HTMLCanvasElement
const ctx = canvas.getContext('2d')
const gearDisplay = document.getElementById('gear-display') as HTMLDivElement
const speedText = document.getElementById('speed-text') as HTMLDivElement

canvas.width = 400
canvas.height = 150

const throttleHistory: number[] = []
const brakeHistory: number[] = []
let absOn: boolean = false

interface TelemetryData {
	Throttle?: number
	Brake?: number
	Gear?: number
	Speed?: number
	Abs?: boolean
	localInputs?: {
		Throttle?: number
		Brake?: number
		Gear?: number
		Speed?: number
		Abs?: boolean
	}
}

function drawLine(history: number[], color: string) {
	if (!ctx) return
	ctx.beginPath()
	ctx.lineWidth = 2
	ctx.strokeStyle = color
	history.forEach((value, index) => {
		const x = index
		const y = canvas.height - value * canvas.height
		if (index === 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	})
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

		if ('localInputs' in data && data.localInputs) {
			throttle = data.localInputs.Throttle || 0
			brake = data.localInputs.Brake || 0
			gear = data.localInputs.Gear || 0
			speed = data.localInputs.Speed || 0
			abs = data.localInputs.Abs || false
		} else {
			throttle = data.Throttle || 0
			brake = data.Brake || 0
			gear = data.Gear || 0
			speed = data.Speed || 0
			abs = data.Abs || false
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
	}
	ws.onclose = () => setTimeout(connect, 3000)
}

window.electronAPI.onToggleMoveMode((event, isDraggable) => {
	document.body.classList.toggle('draggable', isDraggable)
})

window.electronAPI.onWindowResized((event, { width, height }) => {
	const newCanvasWidth = width - 110
	const newCanvasHeight = height - 50

	const widthDifference = newCanvasWidth - canvas.width

	canvas.width = newCanvasWidth
	canvas.height = newCanvasHeight

	if (widthDifference > 0) {
		for (let i = 0; i < widthDifference; i++) {
			throttleHistory.unshift(0)
			brakeHistory.unshift(0)
		}
	} else if (widthDifference < 0) {
		throttleHistory.splice(0, -widthDifference)
		brakeHistory.splice(0, -widthDifference)
	}
})

connect()
draw()
