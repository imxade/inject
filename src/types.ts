export interface TouchContact {
	id: number
	x: number
	y: number
	state: "down" | "move" | "up"
}

export interface InputConfig {
	sensitivity: number
	invertScroll: boolean
	acceleration: boolean
	screenWidth: number
	screenHeight: number
}

export type MouseButton = "left" | "right" | "middle"
export type KeyPosition = "" | "HOLD" | "RELEASE"
export type SupportedPlatform = "linux" | "darwin" | "win32"

export interface PlatformInjector {
	updateConfig(config: Partial<InputConfig>): void
	injectMouseMove(dx: number, dy: number): void
	injectMouseAbsolute(x: number, y: number): void
	injectMouseButton(button: MouseButton, isDown: boolean): void
	injectMouseWheel(dx: number, dy: number): void
	injectKey(key: string, pos?: KeyPosition): void
	injectCombo(keys: string[]): void
	injectText(text: string): void
	injectTouch(contacts: TouchContact[]): void
	destroy(): void
}

export interface CreateInjectorOptions {
	platform?: SupportedPlatform
	config?: Partial<InputConfig>
}
