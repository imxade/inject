import koffi from "koffi"

const CG_PATH = "/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics"

type KoffiLib = ReturnType<typeof koffi.load>
type KoffiFunc = ReturnType<KoffiLib["func"]>

export const CGPoint = koffi.struct("InjectCGPoint", {
	x: "double",
	y: "double",
})

let library: KoffiLib | null = null
let createMouseEvent: KoffiFunc | null = null
let createKeyboardEvent: KoffiFunc | null = null
let createScrollWheelEvent: KoffiFunc | null = null
let eventPost: KoffiFunc | null = null
let release: KoffiFunc | null = null

function ensureFunctions(): void {
	if (process.platform !== "darwin") {
		throw new Error("CoreGraphics input injection is only available on macOS")
	}
	if (library) return

	library = koffi.load(CG_PATH)
	createMouseEvent = library.func(
		"void * CGEventCreateMouseEvent(void *, uint32, InjectCGPoint, uint32)",
	)
	createKeyboardEvent = library.func(
		"void * CGEventCreateKeyboardEvent(void *, uint16, uint8)",
	)
	createScrollWheelEvent = library.func(
		"void * CGEventCreateScrollWheelEvent(void *, uint32, uint32, int32, int32)",
	)
	eventPost = library.func("void CGEventPost(uint32, void *)")
	release = library.func("void CFRelease(void *)")
}

function postAndRelease(tapLocation: number, event: unknown): void {
	if (!event || !eventPost || !release) {
		throw new Error("Failed to create CoreGraphics event")
	}
	eventPost(tapLocation, event)
	release(event)
}

export function postMouseEvent(
	tapLocation: number,
	eventType: number,
	x: number,
	y: number,
	button: number,
): void {
	ensureFunctions()
	const event = createMouseEvent?.(null, eventType, { x, y }, button)
	postAndRelease(tapLocation, event)
}

export function postKeyEvent(
	tapLocation: number,
	keyCode: number,
	keyDown: boolean,
): void {
	ensureFunctions()
	const event = createKeyboardEvent?.(null, keyCode, keyDown ? 1 : 0)
	postAndRelease(tapLocation, event)
}

export function postScrollEvent(
	tapLocation: number,
	unit: number,
	deltaAxis1: number,
	deltaAxis2 = 0,
): void {
	ensureFunctions()
	const event = createScrollWheelEvent?.(
		null,
		unit,
		2,
		Math.round(deltaAxis1),
		Math.round(deltaAxis2),
	)
	postAndRelease(tapLocation, event)
}
