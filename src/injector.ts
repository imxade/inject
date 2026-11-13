import type { NativePlatform } from "./types.js"

export type MouseButton = "left" | "right" | "middle"

export interface UnifiedInjector {
	/** Move to normalized desktop coordinates in the inclusive range 0..65535. */
	injectMouseAbsolute(x: number, y: number): void
	injectMouseButton(
		button: MouseButton,
		down: boolean,
		x?: number,
		y?: number,
	): void
	/** Wheel deltas use native wheel units; positive vertical values scroll up; positive horizontal values scroll right. */
	injectMouseWheel(deltaY: number, deltaX?: number): void
	/** keyCode is an OS-native code: evdev on Linux, CGKeyCode on macOS, VK on Windows. */
	injectKey(keyCode: number, down: boolean): void
	/** Press codes in order, then release them in reverse order. */
	injectCombo(keyCodes: number[]): void
	destroy(): void
}

function assertCoordinate(value: number, name: string): void {
	if (!Number.isInteger(value) || value < 0 || value > 65535) {
		throw new RangeError(`${name} must be an integer from 0 to 65535`)
	}
}

function assertKeyCode(value: number): void {
	if (!Number.isInteger(value) || value < 0) {
		throw new RangeError("keyCode must be a non-negative integer")
	}
}

export async function createInjector(
	platform: NativePlatform = process.platform as NativePlatform,
): Promise<UnifiedInjector> {
	switch (platform) {
		case "linux": {
			const native = await import("./linux/index.js")
			const device = new native.UinputDevice({
				name: "inject-unified-input",
				identity: { bustype: 3, vendor: 0x1209, product: 0x0001, version: 1 },
			})
			device
				.setEventBit(native.EV_SYN)
				.setEventBit(native.EV_KEY)
				.setEventBit(native.EV_ABS)
				.setEventBit(native.EV_REL)
				.setPropertyBit(0)
			for (let code = 0; code <= 0x2ff; code++) device.setKeyBit(code)
			device
				.setRelativeBit(6)
				.setRelativeBit(8)
				.setAbsoluteBit(0)
				.setAbsoluteBit(1)
				.configureAbsoluteAxis(0, { minimum: 0, maximum: 65535 })
				.configureAbsoluteAxis(1, { minimum: 0, maximum: 65535 })
				.create()

			const emit = (type: number, code: number, value: number) =>
				device.emit(type, code, value).sync()
			return {
				injectMouseAbsolute(x, y) {
					assertCoordinate(x, "x")
					assertCoordinate(y, "y")
					device.emit(native.EV_ABS, 0, x).emit(native.EV_ABS, 1, y).sync()
				},
				injectMouseButton(button, down, x = 32767, y = 32767) {
					assertCoordinate(x, "x")
					assertCoordinate(y, "y")
					const code = { left: 0x110, right: 0x111, middle: 0x112 }[button]
					if (code === undefined)
\t\t\t\t\tthrow new Error(`Unsupported mouse button: ${button}`)
					device
						.emit(native.EV_ABS, 0, x)
						.emit(native.EV_ABS, 1, y)
						.emit(native.EV_KEY, code, down ? 1 : 0)
						.sync()
				},
				injectMouseWheel(deltaY, deltaX = 0) {
					if (deltaY !== 0) device.emit(native.EV_REL, 8, Math.trunc(deltaY))
					if (deltaX !== 0) device.emit(native.EV_REL, 6, Math.trunc(deltaX))
					device.sync()
				},
				injectKey(keyCode, down) {
					assertKeyCode(keyCode)
					if (keyCode > 0x2ff)
\t\t\t\t\tthrow new RangeError("Linux evdev keyCode must be <= 767")
					emit(native.EV_KEY, keyCode, down ? 1 : 0)
				},
				injectCombo(keyCodes) {
					for (const code of keyCodes) assertKeyCode(code)
					if (keyCodes.some((code) => code > 0x2ff)) {
						throw new RangeError("Linux evdev keyCode must be <= 767")
					}
					for (const code of keyCodes) device.emit(native.EV_KEY, code, 1)
					device.sync()
					for (const code of [...keyCodes].reverse())
\t\t\t\t\tdevice.emit(native.EV_KEY, code, 0)
					device.sync()
				},
				destroy() {
					device.destroy()
				},
			}
		}
		case "darwin": {
			const native = await import("./mac/index.js")
			const size = native.getMainDisplaySize()
			const point = (x: number, y: number) => {
				assertCoordinate(x, "x")
				assertCoordinate(y, "y")
				return {
					x: Math.round((x / 65535) * Math.max(0, size.width - 1)),
					y: Math.round((y / 65535) * Math.max(0, size.height - 1)),
				}
			}
			const buttonData = {
				left: {
					button: native.kCGMouseButtonLeft,
					down: native.kCGEventLeftMouseDown,
					up: native.kCGEventLeftMouseUp,
				},
				right: {
					button: native.kCGMouseButtonRight,
					down: native.kCGEventRightMouseDown,
					up: native.kCGEventRightMouseUp,
				},
				middle: {
					button: native.kCGMouseButtonCenter,
					down: native.kCGEventOtherMouseDown,
					up: native.kCGEventOtherMouseUp,
				},
			}
			return {
				injectMouseAbsolute(x, y) {
					const p = point(x, y)
					native.postMouseEvent(
\t\t\t\t\tnative.kCGHIDEventTap,
\t\t\t\t\tnative.kCGEventMouseMoved,
\t\t\t\t\tp.x,
\t\t\t\t\tp.y,
\t\t\t\t\tnative.kCGMouseButtonLeft,
\t\t\t\t)
				},
				injectMouseButton(button, down, x = 32767, y = 32767) {
					const data = buttonData[button]
					if (!data) throw new Error(`Unsupported mouse button: ${button}`)
					const p = point(x, y)
					native.postMouseEvent(
\t\t\t\t\tnative.kCGHIDEventTap,
\t\t\t\t\tdown ? data.down : data.up,
\t\t\t\t\tp.x,
\t\t\t\t\tp.y,
\t\t\t\t\tdata.button,
\t\t\t\t)
				},
				injectMouseWheel(deltaY, deltaX = 0) {
					native.postScrollEvent(
\t\t\t\t\tnative.kCGHIDEventTap,
\t\t\t\t\tnative.kCGScrollEventUnitLine,
\t\t\t\t\tdeltaY,
\t\t\t\t\tdeltaX,
\t\t\t\t)
				},
				injectKey(keyCode, down) {
					assertKeyCode(keyCode)
					if (keyCode > 0xffff)
\t\t\t\t\tthrow new RangeError("macOS CGKeyCode must be <= 65535")
					native.postKeyEvent(native.kCGHIDEventTap, keyCode, down)
				},
				injectCombo(keyCodes) {
					for (const code of keyCodes) assertKeyCode(code)
					for (const code of keyCodes)
\t\t\t\t\tnative.postKeyEvent(native.kCGHIDEventTap, code, true)
					for (const code of [...keyCodes].reverse())
\t\t\t\t\tnative.postKeyEvent(native.kCGHIDEventTap, code, false)
				},
				destroy() {},
			}
		}
		case "win32": {
			const native = await import("./windows/index.js")
			const sendMouse = (flags: number, mouseData = 0, x = 0, y = 0) => {
				const sent = native.sendInput([{
					type: native.INPUT_MOUSE,
					u: { mi: { dx: x, dy: y, mouseData, dwFlags: flags } },
				}])
				if (sent !== 1) throw new Error("SendInput failed to submit mouse event")
			}
			const sendKey = (keyCode: number, down: boolean) => {
				const sent = native.sendInput([{
					type: native.INPUT_KEYBOARD,
					u: { ki: { wVk: keyCode, wScan: 0, dwFlags: down ? 0 : native.KEYEVENTF_KEYUP } },
				}])
				if (sent !== 1) throw new Error("SendInput failed to submit keyboard event")
			}
			const buttons = {
				left: [native.MOUSEEVENTF_LEFTDOWN, native.MOUSEEVENTF_LEFTUP],
				right: [native.MOUSEEVENTF_RIGHTDOWN, native.MOUSEEVENTF_RIGHTUP],
				middle: [native.MOUSEEVENTF_MIDDLEDOWN, native.MOUSEEVENTF_MIDDLEUP],
			}
			return {
				injectMouseAbsolute(x, y) {
					assertCoordinate(x, "x")
					assertCoordinate(y, "y")
					sendMouse(
\t\t\t\t\tnative.MOUSEEVENTF_MOVE | native.MOUSEEVENTF_ABSOLUTE,
\t\t\t\t\t0,
\t\t\t\t\tx,
\t\t\t\t\ty,
\t\t\t\t)
				},
				injectMouseButton(button, down, x = 32767, y = 32767) {
					assertCoordinate(x, "x")
					assertCoordinate(y, "y")
					const flags = buttons[button]
					if (!flags) throw new Error(`Unsupported mouse button: ${button}`)
					sendMouse(
\t\t\t\t\tnative.MOUSEEVENTF_MOVE |
\t\t\t\t\t\tnative.MOUSEEVENTF_ABSOLUTE |
\t\t\t\t\t\tflags[down ? 0 : 1],
\t\t\t\t\t0,
\t\t\t\t\tx,
\t\t\t\t\ty,
\t\t\t\t)
				},
				injectMouseWheel(deltaY, deltaX = 0) {
					if (deltaY !== 0)
\t\t\t\t\tsendMouse(native.MOUSEEVENTF_WHEEL, Math.trunc(deltaY * 120))
					if (deltaX !== 0)
\t\t\t\t\tsendMouse(native.MOUSEEVENTF_HWHEEL, Math.trunc(deltaX * 120))
				},
				injectKey(keyCode, down) {
					assertKeyCode(keyCode)
					if (keyCode > 0xffff)
\t\t\t\t\tthrow new RangeError("Windows virtual key must be <= 65535")
					sendKey(keyCode, down)
				},
				injectCombo(keyCodes) {
					for (const code of keyCodes) assertKeyCode(code)
					for (const code of keyCodes) sendKey(code, true)
					for (const code of [...keyCodes].reverse()) sendKey(code, false)
				},
				destroy() {},
			}
		}
		default:
			throw new Error(`Unsupported platform: ${platform}`)
	}
}
