import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/constants.js"
import { LINUX_KEY_MAP } from "../src/keyMap.js"
import { applyMotion, resolveChar } from "../src/utils.js"

describe("pure input helpers", () => {
	it("applies sensitivity without acceleration", () => {
		expect(
			applyMotion(2, -3, {
				...DEFAULT_CONFIG,
				sensitivity: 2,
				acceleration: false,
			}),
		).toEqual({ ax: 4, ay: -6 })
	})

	it("resolves shifted characters", () => {
		expect(resolveChar("!", LINUX_KEY_MAP)).toEqual({
			code: LINUX_KEY_MAP["1"],
			shifted: true,
		})
	})
})
