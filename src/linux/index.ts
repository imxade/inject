import {
	EV_SYN,
	SYN_REPORT,
	UI_ABS_SETUP,
	UI_DEV_CREATE,
	UI_DEV_DESTROY,
	UI_DEV_SETUP,
	UI_SET_ABSBIT,
	UI_SET_EVBIT,
	UI_SET_KEYBIT,
	UI_SET_PROPBIT,
	UI_SET_RELBIT,
	UINPUT_MAX_NAME_SIZE,
	UINPUT_PATH,
} from "./constants.js"
import {
	closeUinput,
	ioctlInt,
	ioctlNull,
	ioctlStruct,
	openUinput,
	writeEvent,
} from "./structs.js"

export * from "./constants.js"
export {
	INPUT_EVENT_SIZE,
	InputAbsinfo,
	InputEvent,
	UinputAbsSetup,
	UinputSetup,
} from "./structs.js"

export interface UinputDeviceIdentity {
	bustype: number
	vendor: number
	product: number
	version: number
}

export interface UinputDeviceOptions {
	name: string
	identity: UinputDeviceIdentity
	path?: string
}

export interface UinputAbsoluteAxis {
	minimum: number
	maximum: number
	fuzz?: number
	flat?: number
	resolution?: number
}

export class UinputDevice {
	readonly fd: number
	private readonly options: UinputDeviceOptions
	private created = false
	private closed = false

	constructor(options: UinputDeviceOptions) {
		if (process.platform !== "linux") {
			throw new Error("UinputDevice is only available on Linux")
		}
		this.options = options
		this.fd = openUinput(options.path ?? UINPUT_PATH)
	}

	setEventBit(bit: number): this {
		this.ioctlBit(UI_SET_EVBIT, bit)
		return this
	}

	setKeyBit(bit: number): this {
		this.ioctlBit(UI_SET_KEYBIT, bit)
		return this
	}

	setRelativeBit(bit: number): this {
		this.ioctlBit(UI_SET_RELBIT, bit)
		return this
	}

	setAbsoluteBit(bit: number): this {
		this.ioctlBit(UI_SET_ABSBIT, bit)
		return this
	}

	setPropertyBit(bit: number): this {
		this.ioctlBit(UI_SET_PROPBIT, bit)
		return this
	}

	configureAbsoluteAxis(code: number, axis: UinputAbsoluteAxis): this {
		this.assertOpen()
		const ret = ioctlStruct(this.fd, UI_ABS_SETUP, "uinput_abs_setup *", {
			code,
			__pad: 0,
			absinfo: {
				value: 0,
				minimum: axis.minimum,
				maximum: axis.maximum,
				fuzz: axis.fuzz ?? 0,
				flat: axis.flat ?? 0,
				resolution: axis.resolution ?? 0,
			},
		})
		if (ret < 0) {
			throw new Error(`UI_ABS_SETUP failed for code ${code} (ret=${ret})`)
		}
		return this
	}

	create(): this {
		this.assertOpen()
		if (this.created) return this

		const name = new Array(UINPUT_MAX_NAME_SIZE).fill(0)
		for (
			let index = 0;
			index < Math.min(this.options.name.length, UINPUT_MAX_NAME_SIZE - 1);
			index++
		) {
			name[index] = this.options.name.charCodeAt(index)
		}

		const setup = {
			bustype: this.options.identity.bustype,
			vendor: this.options.identity.vendor,
			product: this.options.identity.product,
			version: this.options.identity.version,
			name,
			ff_effects_max: 0,
		}

		const setupResult = ioctlStruct(
			this.fd,
			UI_DEV_SETUP,
			"uinput_setup *",
			setup,
		)
		if (setupResult < 0) {
			throw new Error(`UI_DEV_SETUP failed (ret=${setupResult})`)
		}

		const createResult = ioctlNull(this.fd, UI_DEV_CREATE)
		if (createResult < 0) {
			throw new Error(`UI_DEV_CREATE failed (ret=${createResult})`)
		}

		this.created = true
		return this
	}

	emit(type: number, code: number, value: number): this {
		this.assertCreated()
		if (!writeEvent(this.fd, type, code, value)) {
			throw new Error("Failed to write uinput event")
		}
		return this
	}

	sync(): this {
		return this.emit(EV_SYN, SYN_REPORT, 0)
	}

	destroy(): void {
		if (this.closed) return
		if (this.created) {
			ioctlNull(this.fd, UI_DEV_DESTROY)
			this.created = false
		}
		closeUinput(this.fd)
		this.closed = true
	}

	private ioctlBit(request: number, bit: number): void {
		this.assertOpen()
		const ret = ioctlInt(this.fd, request, bit)
		if (ret < 0) {
			throw new Error(\n\t\t\t\t`uinput ioctl 0x${request.toString(16)} failed for bit ${bit}`,\n\t\t\t)
		}
	}

	private assertOpen(): void {
		if (this.closed) {
			throw new Error("UinputDevice is closed")
		}
	}

	private assertCreated(): void {
		this.assertOpen()
		if (!this.created) {
			throw new Error(\n\t\t\t\t"UinputDevice.create() must be called before emitting events",\n\t\t\t)
		}
	}
}
