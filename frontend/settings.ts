/// <reference path="renderer.d.ts" />

const enableGraph = document.getElementById('enable-graph') as HTMLInputElement
const enableFuel = document.getElementById('enable-fuel') as HTMLInputElement
const sourceLocal = document.getElementById('source-local') as HTMLInputElement
const sourceShared = document.getElementById('source-shared') as HTMLInputElement
const serverAddressContainer = document.getElementById('server-address-container')
const serverAddress = document.getElementById('server-address') as HTMLInputElement
const launchButton = document.getElementById('launch-button')
const driverName = document.getElementById('driver-name') as HTMLInputElement

sourceShared.addEventListener('change', () => {
	serverAddressContainer?.classList.remove('hidden')
})
sourceLocal.addEventListener('change', () => {
	serverAddressContainer?.classList.add('hidden')
})

launchButton?.addEventListener('click', () => {
	const settings = {
		showGraph: enableGraph.checked,
		showFuel: enableFuel.checked,
		dataSource: sourceShared.checked ? 'shared' : 'local',
		serverAddress: serverAddress.value,
		driverName: driverName.value
	}
	window.electronAPI.launchApp(settings)
})
