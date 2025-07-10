export interface IElectronAPI {
	onToggleMoveMode: (callback: (event: any, value: any) => void) => void
	onWindowResized: (callback: (event: any, value: { width: number; height: number }) => void) => void
}

declare global {
	interface Window {
		electronAPI: IElectronAPI
	}
}
