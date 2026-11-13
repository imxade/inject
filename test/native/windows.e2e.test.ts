import koffi from "koffi"
import { describe, expect, it } from "vitest"
import { createInjector } from "../../src/injector.js"

const enabled =
	process.env.INJECT_NATIVE_E2E === "1" && process.platform === "win32"

const VK_F24 = 0x87

async function waitForState(
	getAsyncKeyState: (key: number) => number,
	down: boolean,
	timeoutMs = 3000,
): Promise<void> {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const isDown = (getAsyncKeyState(VK_F24) & 0x8000) !== 0
		if (isDown === down) return
		await new Promise((resolve) => setTimeout(resolve, 10))
	}
	throw new Error(`Timed out waiting for F24 state down=${down}`)
}

describe.runIf(enabled)("Windows SendInput native E2E", () => {
	it("changes the operating-system keyboard state", async () => {
		const user32 = koffi.load("user32.dll")
		const getAsyncKeyState = user32.func(
			"short GetAsyncKeyState(int vKey)",
		) as unknown as (key: number) => number

		const input = await createInjector("win32")
		try {
			input.injectKey(VK_F24, true)
			await waitForState(getAsyncKeyState, true)
		} finally {
			input.injectKey(VK_F24, false)
			input.destroy()
		}

		await waitForState(getAsyncKeyState, false)
	}, 10_000)
})
