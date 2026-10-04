import type {
	CreateInjectorOptions,
	PlatformInjector,
	SupportedPlatform,
} from "./types.js"

export async function createInputInjector(
	options: CreateInjectorOptions = {},
): Promise<PlatformInjector> {
	const platform = (options.platform ?? process.platform) as SupportedPlatform
	const config = options.config ?? {}

	switch (platform) {
		case "linux": {
			const { LinuxInputInjector } = await import("./linux/index.js")
			return new LinuxInputInjector(config)
		}
		case "darwin": {
			const { MacInputInjector } = await import("./mac/index.js")
			return new MacInputInjector(config)
		}
		case "win32": {
			const { WindowsInputInjector } = await import("./windows/index.js")
			return new WindowsInputInjector(config)
		}
		default:
			throw new Error(`Unsupported platform: ${platform}`)
	}
}
