import koffi from "koffi"

export const VIGEM_ERROR_NONE = 0x20000000

export interface XusbReport {
	wButtons: number
	bLeftTrigger: number
	bRightTrigger: number
	sThumbLX: number
	sThumbLY: number
	sThumbRX: number
	sThumbRY: number
}

const XUSB_REPORT = koffi.struct("InjectXUSB_REPORT", {
	wButtons: "uint16",
	bLeftTrigger: "uint8",
	bRightTrigger: "uint8",
	sThumbLX: "int16",
	sThumbLY: "int16",
	sThumbRX: "int16",
	sThumbRY: "int16",
})

type KoffiLib = ReturnType<typeof koffi.load>
type KoffiFunc = ReturnType<KoffiLib["func"]>

export class ViGEmClient {
	private readonly library: KoffiLib
	private readonly allocClient: KoffiFunc
	private readonly connectClient: KoffiFunc
	private readonly disconnectClient: KoffiFunc
	private readonly freeClient: KoffiFunc
	private readonly allocTarget: KoffiFunc
	private readonly addTarget: KoffiFunc
	private readonly removeTarget: KoffiFunc
	private readonly freeTarget: KoffiFunc
	private readonly updateTarget: KoffiFunc
	private client: unknown
	private targets = new Set<ViGEmXbox360Target>()
	private closed = false

	constructor(dllPath: string) {
		if (process.platform !== "win32") {
			throw new Error("ViGEm is only available on Windows")
		}

		this.library = koffi.load(dllPath)
		this.allocClient = this.library.func("void * vigem_alloc()")
		this.connectClient = this.library.func("int vigem_connect(void *client)")
		this.disconnectClient = this.library.func(
			"void vigem_disconnect(void *client)",
		)
		this.freeClient = this.library.func("void vigem_free(void *client)")
		this.allocTarget = this.library.func("void * vigem_target_x360_alloc()")
		this.addTarget = this.library.func(
			"int vigem_target_add(void *client, void *target)",
		)
		this.removeTarget = this.library.func(
			"int vigem_target_remove(void *client, void *target)",
		)
		this.freeTarget = this.library.func("void vigem_target_free(void *target)")
		this.updateTarget = this.library.func(
			"int vigem_target_x360_update(void *client, void *target, InjectXUSB_REPORT report)",
		)

		this.client = this.allocClient()
		if (!this.client) throw new Error("vigem_alloc failed")

		const result = this.connectClient(this.client) as number
		if (result !== VIGEM_ERROR_NONE) {
			this.freeClient(this.client)
			this.client = null
			throw new Error(`vigem_connect failed with code 0x${result.toString(16)}`)
		}
	}

	createXbox360Target(): ViGEmXbox360Target {
		this.assertOpen()
		const handle = this.allocTarget()
		if (!handle) throw new Error("vigem_target_x360_alloc failed")

		const result = this.addTarget(this.client, handle) as number
		if (result !== VIGEM_ERROR_NONE) {
			this.freeTarget(handle)
			throw new Error(`vigem_target_add failed with code 0x${result.toString(16)}`)
		}

		const target = new ViGEmXbox360Target(
			this.client,
			handle,
			this.updateTarget,
			this.removeTarget,
			this.freeTarget,
			() => this.targets.delete(target),
		)
		this.targets.add(target)
		return target
	}

	destroy(): void {
		if (this.closed) return
		for (const target of [...this.targets]) target.destroy()
		this.disconnectClient(this.client)
		this.freeClient(this.client)
		this.client = null
		this.closed = true
	}

	private assertOpen(): void {
		if (this.closed || !this.client) throw new Error("ViGEmClient is closed")
	}
}

export class ViGEmXbox360Target {
	private closed = false

	constructor(
		private readonly client: unknown,
		private readonly target: unknown,
		private readonly updateTarget: KoffiFunc,
		private readonly removeTarget: KoffiFunc,
		private readonly freeTarget: KoffiFunc,
		private readonly onDestroy: () => void,
	) {}

	update(report: XusbReport): void {
		if (this.closed) throw new Error("ViGEm target is closed")
		const result = this.updateTarget(this.client, this.target, report) as number
		if (result !== VIGEM_ERROR_NONE) {
			throw new Error(
				`vigem_target_x360_update failed with code 0x${result.toString(16)}`,
			)
		}
	}

	destroy(): void {
		if (this.closed) return
		this.removeTarget(this.client, this.target)
		this.freeTarget(this.target)
		this.closed = true
		this.onDestroy()
	}
}
