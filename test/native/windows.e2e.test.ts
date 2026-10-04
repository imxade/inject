import koffi from "koffi"
import { describe, expect, it } from "vitest"
import {
	INPUT_KEYBOARD,
	KEYEVENTF_KEYUP,
	sendInput,
} from "../../src/windows/index.js"

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

		try {
			expect(
				sendInput([
					{
						type: INPUT_KEYBOARD,
						u: {
							ki: {
								wVk: VK_F24,
								wScan: 0,
								dwFlags: 0,
							},
						},
					},
				]),
			).toBe(1)

			await waitForState(getAsyncKeyState, true)
		} finally {
			sendInput([
				{
					type: INPUT_KEYBOARD,
					u: {
						ki: {
							wVk: VK_F24,
							wScan: 0,
							dwFlags: KEYEVENTF_KEYUP,
						},
					},
				},
			])
		}

		await waitForState(getAsyncKeyState, false)
	}, 10_000)
})
