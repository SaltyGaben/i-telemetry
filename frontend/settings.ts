/// <reference path="renderer.d.ts" />

const enableGraph = document.getElementById('enable-graph') as HTMLInputElement
const enableFuel = document.getElementById('enable-fuel') as HTMLInputElement
const sourceLocal = document.getElementById('source-local') as HTMLInputElement
const sourceShared = document.getElementById('source-shared') as HTMLInputElement
const serverAddressContainer = document.getElementById('server-address-container')
const serverAddress = document.getElementById('server-address') as HTMLInputElement
const serverError = document.getElementById('server-error') as HTMLDivElement
const launchButton = document.getElementById('launch-button') as HTMLButtonElement
const driverName = document.getElementById('driver-name') as HTMLInputElement

async function validateServerConnection(serverUrl: string): Promise<boolean> {
	try {
		const ws = new WebSocket(serverUrl)

		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				ws.close()
				resolve(false)
			}, 3000) // 3 second timeout

			ws.onopen = () => {
				clearTimeout(timeout)
				ws.close()
				resolve(true)
			}

			ws.onerror = () => {
				clearTimeout(timeout)
				resolve(false)
			}
		})
	} catch (error) {
		return false
	}
}

function showServerError(message: string) {
	if (serverError) {
		serverError.textContent = message
		serverError.classList.remove('hidden')
	}
}

function hideServerError() {
	if (serverError) {
		serverError.classList.add('hidden')
	}
}

sourceShared.addEventListener('change', () => {
	serverAddressContainer?.classList.remove('hidden')
	hideServerError()
})
sourceLocal.addEventListener('change', () => {
	serverAddressContainer?.classList.add('hidden')
	hideServerError()
})

serverAddress.addEventListener('input', () => {
	hideServerError()
})

launchButton?.addEventListener('click', async () => {
	if (launchButton) {
		launchButton.disabled = true
		launchButton.textContent = 'Validating...'
	}

	try {
		const settings = {
			showGraph: enableGraph.checked,
			showFuel: enableFuel.checked,
			dataSource: sourceShared.checked ? 'shared' : 'local',
			serverAddress: serverAddress.value,
			driverName: driverName.value
		}

		if (sourceShared.checked && serverAddress.value.trim()) {
			const isValid = await validateServerConnection(serverAddress.value.trim())

			if (!isValid) {
				showServerError('Unable to connect to server. Please check the server address and try again.')
				return
			}
		}

		hideServerError()

		window.electronAPI.launchApp(settings)
	} catch (error) {
		showServerError('An error occurred while validating the server connection.')
	} finally {
		if (launchButton) {
			launchButton.disabled = false
			launchButton.textContent = 'Launch'
		}
	}
})
