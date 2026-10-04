import koffi from "koffi"

export interface WindowsPoint {
	x: number
	y: number
}

export interface WindowsRect {
	left: number
	top: number
	right: number
	bottom: number
}

export interface WindowsMouseInput {
	dx: number
	dy: number
	mouseData: number
	dwFlags: number
	time?: number
	dwExtraInfo?: number
}

export interface WindowsKeyboardInput {
	wVk: number
	wScan: number
	dwFlags: number
	time?: number
	dwExtraInfo?: number
}

export type WindowsInput =
	| { type: number; u: { mi: WindowsMouseInput } }
	| { type: number; u: { ki: WindowsKeyboardInput } }

const POINT = koffi.struct("InjectPOINT", {
	x: "long",
	y: "long",
})

const RECT = koffi.struct("InjectRECT", {
	left: "long",
	top: "long",
	right: "long",
	bottom: "long",
})

const POINTER_INFO = koffi.struct("InjectPOINTER_INFO", {
	pointerType: "uint32",
	pointerId: "uint32",
	frameId: "uint32",
	pointerFlags: "uint32",
	sourceDevice: "void *",
	hwndTarget: "void *",
	ptPixelLocation: POINT,
	ptHimetricLocation: POINT,
	ptPixelLocationRaw: POINT,
	ptHimetricLocationRaw: POINT,
	dwTime: "uint32",
	historyCount: "uint32",
	InputData: "int32",
	dwKeyStates: "uint32",
	PerformanceCount: "uint64",
	ButtonChangeType: "int32",
})

const POINTER_TOUCH_INFO = koffi.struct("InjectPOINTER_TOUCH_INFO", {
	pointerInfo: POINTER_INFO,
	touchFlags: "uint32",
	touchMask: "uint32",
	rcContact: RECT,
	rcContactRaw: RECT,
	orientation: "uint32",
	pressure: "uint32",
})

export const POINTER_TYPE_INFO = koffi.struct("InjectPOINTER_TYPE_INFO", {
	type: "uint32",
	touchInfo: POINTER_TOUCH_INFO,
})

const MOUSEINPUT = koffi.struct("InjectMOUSEINPUT", {
	dx: "long",
	dy: "long",
	mouseData: "uint32",
	dwFlags: "uint32",
	time: "uint32",
	dwExtraInfo: "uintptr",
})

const KEYBDINPUT = koffi.struct("InjectKEYBDINPUT", {
	wVk: "uint16",
	wScan: "uint16",
	dwFlags: "uint32",
	time: "uint32",
	dwExtraInfo: "uintptr",
})

const INPUT_UNION = koffi.union("InjectINPUT_UNION", {
	mi: MOUSEINPUT,
	ki: KEYBDINPUT,
})

const INPUT = koffi.struct("InjectINPUT", {
	type: "uint32",
	__pad: "uint32",
	u: INPUT_UNION,
})

type KoffiLib = ReturnType<typeof koffi.load>
type KoffiFunc = ReturnType<KoffiLib["func"]>

let library: KoffiLib | null = null
let sendInputNative: KoffiFunc | null = null
let createSyntheticPointerDeviceNative: KoffiFunc | null = null
let injectPointerInputNative: KoffiFunc | null = null
let destroySyntheticPointerDeviceNative: KoffiFunc | null = null

function ensureLibrary(): void {
	if (process.platform !== "win32") {
		throw new Error("Windows input injection is only available on Windows")
	}
	if (library) return

	library = koffi.load("user32.dll")
	sendInputNative = library.func(
		"uint32 SendInput(uint32 nInputs, const InjectINPUT * pInputs, int cbSize)",
	)
	createSyntheticPointerDeviceNative = library.func(
		"void * CreateSyntheticPointerDevice(uint32 pointerType, uint32 maxCount, uint32 mode)",
	)
	injectPointerInputNative = library.func(
		"int InjectSyntheticPointerInput(void * device, const InjectPOINTER_TYPE_INFO * pointerInfo, uint32 count)",
	)
	destroySyntheticPointerDeviceNative = library.func(
		"void DestroySyntheticPointerDevice(void * device)",
	)
}

export const INPUT_STRUCT_SIZE = koffi.sizeof(INPUT)

export function sendInput(events: WindowsInput[]): number {
	if (events.length === 0) return 0
	if (events.length > 1000) {
		throw new Error("SendInput event count exceeds 1000")
	}
	ensureLibrary()
	if (!sendInputNative) throw new Error("SendInput is unavailable")

	const normalized = events.map((event) => ({
		...event,
		__pad: 0,
		u: {
			...event.u,
			...(event.u.mi
				? {
						mi: {
							time: 0,
							dwExtraInfo: 0,
							...event.u.mi,
						},
					}
				: {}),
			...(event.u.ki
				? {
						ki: {
							time: 0,
							dwExtraInfo: 0,
							...event.u.ki,
						},
					}
				: {}),
		},
	}))

	return sendInputNative(
		normalized.length,
		normalized,
		INPUT_STRUCT_SIZE,
	) as number
}

export function createSyntheticPointerDevice(
	pointerType: number,
	maxCount: number,
	mode: number,
): unknown {
	ensureLibrary()
	if (!createSyntheticPointerDeviceNative) {
		throw new Error("CreateSyntheticPointerDevice is unavailable")
	}
	const handle = createSyntheticPointerDeviceNative(pointerType, maxCount, mode)
	if (!handle) throw new Error("CreateSyntheticPointerDevice failed")
	return handle
}

export function injectPointerInput(
	device: unknown,
	pointerInfo: unknown,
	count: number,
): boolean {
	if (!device) throw new Error("Invalid synthetic pointer device")
	if (count < 1) throw new Error("Pointer count must be positive")
	ensureLibrary()
	if (!injectPointerInputNative) {
		throw new Error("InjectSyntheticPointerInput is unavailable")
	}
	return Boolean(injectPointerInputNative(device, pointerInfo, count))
}

export function destroySyntheticPointerDevice(device: unknown): void {
	if (!device) return
	ensureLibrary()
	if (!destroySyntheticPointerDeviceNative) {
		throw new Error("DestroySyntheticPointerDevice is unavailable")
	}
	destroySyntheticPointerDeviceNative(device)
}
