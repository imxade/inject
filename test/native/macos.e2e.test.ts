import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { kCGHIDEventTap, postKeyEvent } from "../../src/mac/index.js"

const enabled =
	process.env.INJECT_NATIVE_E2E === "1" && process.platform === "darwin"

const KEY_F13 = 105
const observerPath = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"macos-observer.swift",
)

function waitForLine(
	stream: NodeJS.ReadableStream,
	line: string,
	timeoutMs: number,
): Promise<void> {
	return new Promise((resolve, reject) => {
		let output = ""
		const timeout = setTimeout(() => {
			cleanup()
			reject(new Error(`Timed out waiting for observer line: ${line}\n${output}`))
		}, timeoutMs)

		const onData = (chunk: Buffer | string) => {
			output += chunk.toString()
			if (output.split(/\r?\n/).includes(line)) {
				cleanup()
				resolve()
			}
		}

		const cleanup = () => {
			clearTimeout(timeout)
			stream.off("data", onData)
		}

		stream.on("data", onData)
	})
}

describe.runIf(enabled)("macOS CoreGraphics native E2E", () => {
	it("delivers posted key events through a CGEventTap", async () => {
		const observer = spawn("xcrun", [
			"swift",
			observerPath,
			String(KEY_F13),
		], {
			stdio: ["ignore", "pipe", "pipe"],
		})

		let stderr = ""
		observer.stderr.on("data", (chunk) => {
			stderr += chunk.toString()
		})

		try {
			await waitForLine(observer.stdout, "READY", 30_000)

			const pass = waitForLine(observer.stdout, "PASS", 5000)
			postKeyEvent(kCGHIDEventTap, KEY_F13, true)
			postKeyEvent(kCGHIDEventTap, KEY_F13, false)
			await pass

			const exitCode = await new Promise<number | null>((resolve) => {
				observer.once("exit", resolve)
			})
			expect(exitCode, stderr).toBe(0)
		} finally {
			if (observer.exitCode === null) observer.kill("SIGTERM")
		}
	}, 45_000)
})
