export interface IElectronAPI {
	launchApp: (settings: object) => void
	onReceiveSettings: (callback: (event: any, settings: any) => void) => void
	onToggleMoveMode: (callback: (event: any, value: any) => void) => void
	onWindowResized: (callback: (event: any, value: { width: number; height: number }) => void) => void
}
declare global {
	interface Window {
		electronAPI: IElectronAPI
	}
}
