import type { InputConfig } from "./types.js"

export const INPUT_MOUSE = 0
export const INPUT_KEYBOARD = 1
export const DEFAULT_SCREEN_WIDTH = 1920
export const DEFAULT_SCREEN_HEIGHT = 1080
export const WHEEL_SCALE = 3
export const PINCH_PAN_THRESHOLD = 2

export const DEFAULT_CONFIG: InputConfig = {
	sensitivity: 1,
	invertScroll: false,
	acceleration: true,
	screenWidth: DEFAULT_SCREEN_WIDTH,
	screenHeight: DEFAULT_SCREEN_HEIGHT,
}

export const ACCEL_THRESHOLD = 1
export const ACCEL_FACTOR = 0.8
export const ACCEL_EXPONENT = 1.2
