import { describe, expect, it } from "vitest"
import { loadNativeBackend } from "../src/loader.js"

describe("platform loader", () => {
	it("rejects unsupported platforms", async () => {
		await expect(
			loadNativeBackend("unsupported" as never),
		).rejects.toThrow("Unsupported platform")
	})
})
