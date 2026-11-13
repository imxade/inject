import { describe, expect, it } from "vitest"
import { createInjector } from "../src/injector.js"
import { loadNativeBackend } from "../src/loader.js"

describe("platform loader", () => {
	it("rejects unsupported platforms", async () => {
		await expect(loadNativeBackend("unsupported" as never)).rejects.toThrow(
			"Unsupported platform",
		)
	})
	it("rejects unsupported unified injector platforms", async () => {
		await expect(createInjector("unsupported" as never)).rejects.toThrow(
			"Unsupported platform",
		)
	})
})
