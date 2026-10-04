import { constants as fsConstants } from "node:fs"
import { open, readdir, readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import {
	EV_KEY,
	EV_SYN,
	INPUT_EVENT_SIZE,
	SYN_REPORT,
	UinputDevice,
} from "../../src/linux/index.js"

const enabled =
	process.env.INJECT_NATIVE_E2E === "1" && process.platform === "linux"

const KEY_F24 = 194
const BUS_USB = 0x03

interface NativeEvent {
	type: number
	code: number
	value: number
}

async function waitForEventNode(
	name: string,
	timeoutMs = 5000,
): Promise<string> {
	const deadline = Date.now() + timeoutMs

	while (Date.now() < deadline) {
		const entries = await readdir("/sys/class/input")
		for (const entry of entries) {
			if (!entry.startsWith("event")) continue
			try {
				const deviceName = (
					await readFile(`/sys/class/input/${entry}/device/name`, "utf8")
				).trim()
				if (deviceName === name) return `/dev/input/${entry}`
			} catch {
				// Device may disappear while sysfs is being scanned.
			}
		}
		await new Promise((resolve) => setTimeout(resolve, 20))
	}

	throw new Error(`Timed out waiting for evdev node for ${name}`)
}

async function readEvents(
	handle: Awaited<ReturnType<typeof open>>,
	expectedCount: number,
	timeoutMs = 5000,
): Promise<NativeEvent[]> {
	const events: NativeEvent[] = []
	const buffer = Buffer.alloc(INPUT_EVENT_SIZE * 16)
	const deadline = Date.now() + timeoutMs

	while (Date.now() < deadline && events.length < expectedCount) {
		try {
			const { bytesRead } = await handle.read(buffer, 0, buffer.length, null)
			for (
				let offset = 0;
				offset + INPUT_EVENT_SIZE <= bytesRead;
				offset += INPUT_EVENT_SIZE
			) {
				const event = {
					type: buffer.readUInt16LE(offset + 16),
					code: buffer.readUInt16LE(offset + 18),
					value: buffer.readInt32LE(offset + 20),
				}
				if (
					(event.type === EV_KEY && event.code === KEY_F24) ||
					(event.type === EV_SYN && event.code === SYN_REPORT)
				) {
					events.push(event)
				}
			}
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code
			if (code !== "EAGAIN" && code !== "EWOULDBLOCK") throw error
		}
		if (events.length < expectedCount) {
			await new Promise((resolve) => setTimeout(resolve, 10))
		}
	}

	if (events.length < expectedCount) {
		throw new Error(
			`Timed out after receiving ${events.length}/${expectedCount} events`,
		)
	}

	return events.slice(0, expectedCount)
}

describe.runIf(enabled)("Linux uinput native E2E", () => {
	it("delivers the exact emitted key frames through evdev", async () => {
		const name = `inject-e2e-${process.pid}-${Date.now()}`
		const device = new UinputDevice({
			name,
			identity: {
				bustype: BUS_USB,
				vendor: 0x1209,
				product: 0x0001,
				version: 1,
			},
		})

		try {
			device.setEventBit(EV_KEY).setEventBit(EV_SYN).setKeyBit(KEY_F24).create()

			const eventPath = await waitForEventNode(name)
			const eventHandle = await open(
				eventPath,
				fsConstants.O_RDONLY | fsConstants.O_NONBLOCK,
			)

			try {
				const eventsPromise = readEvents(eventHandle, 4)

				device.emit(EV_KEY, KEY_F24, 1).sync()
				device.emit(EV_KEY, KEY_F24, 0).sync()

				await expect(eventsPromise).resolves.toEqual([
					{ type: EV_KEY, code: KEY_F24, value: 1 },
					{ type: EV_SYN, code: SYN_REPORT, value: 0 },
					{ type: EV_KEY, code: KEY_F24, value: 0 },
					{ type: EV_SYN, code: SYN_REPORT, value: 0 },
				])
			} finally {
				await eventHandle.close()
			}
		} finally {
			device.destroy()
		}
	}, 15_000)
})
