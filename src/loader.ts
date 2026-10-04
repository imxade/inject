import type { NativePlatform } from "./types.js"

export async function loadNativeBackend(
	platform: NativePlatform = process.platform as NativePlatform,
) {
	switch (platform) {
		case "linux":
			return import("./linux/index.js")
		case "darwin":
			return import("./mac/index.js")
		case "win32":
			return import("./windows/index.js")
		default:
			throw new Error(`Unsupported platform: ${platform}`)
	}
}
