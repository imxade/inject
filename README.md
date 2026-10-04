# Inject

A starting point for a standalone, cross-platform native input injection library
for Node.js. The code is extracted from an existing cross-platform input-driver
layer and is intended to evolve into a reusable alternative to app-coupled
automation/input libraries.

This bootstrap is an initial isolation of the native injection concern, not a
stable release.

## Current scope

The library currently isolates:

- relative and absolute mouse movement
- left/right/middle mouse buttons
- vertical and horizontal scrolling
- keyboard key injection and key combinations
- text injection
- multi-touch / touchpad injection
- shared key maps and motion helpers
- Linux, macOS, and Windows native backends using Koffi

It deliberately does **not** copy Rein's WebRTC signalling, input-message
protocol, sanitization/throttling, UI gestures, or server lifecycle.

Gamepad code is also left out of this first extraction. Rein's current Windows
gamepad implementation has an application-specific ViGEm binary lookup, so it
should be isolated behind a library-owned dependency strategy before being
added here.

## Architecture

```text
src/
├── index.ts       # platform-neutral exports
├── factory.ts     # lazy platform selection
├── types.ts       # public injector contract
├── constants.ts   # input-only defaults/constants
├── keyMap.ts      # shared platform key maps
├── utils.ts       # pure motion/character helpers
├── linux/         # uinput backend
├── mac/           # CoreGraphics backend
└── windows/       # SendInput + Synthetic Pointer backend
```

The root entry point does not statically import all native backends. Platform
modules are loaded lazily by `createInputInjector()`, which avoids evaluating
Windows/macOS/Linux FFI bindings on the wrong host.

## Usage

```ts
import { createInputInjector } from "@imxade/inject"

const input = await createInputInjector({
  config: {
    sensitivity: 1,
    acceleration: true,
    invertScroll: false,
    screenWidth: 1920,
    screenHeight: 1080,
  },
})

input.injectMouseMove(20, 10)
input.injectMouseButton("left", true)
input.injectMouseButton("left", false)
input.injectText("hello")
input.injectKey("enter")
```

Consumers that explicitly need a platform backend can use the subpath entry
points such as `@imxade/inject/linux`, `@imxade/inject/mac`, or
`@imxade/inject/windows`.

## Platform notes

**Linux:** uses `/dev/uinput`; the process must have permission to open it.
Production packaging should document a udev/group setup rather than requiring
root.

**macOS:** uses CoreGraphics. The host application normally needs Accessibility
permission for injected keyboard/mouse events.

**Windows:** uses `SendInput` for mouse/keyboard and the Synthetic Pointer API
for touchpad injection.

## Contributor direction

The next useful steps are:

1. Add CI on Linux, macOS, and Windows and run build/tests on every platform.
2. Add deterministic tests around platform guards without constructing real
   native devices in unit tests.
3. Audit native lifecycle/cleanup and error propagation, especially synthetic
   touch-device destruction and uinput ioctl failures.
4. Define a stable public error model instead of platform modules logging
   directly to `console`.
5. Decide whether CommonJS output is required; this bootstrap intentionally
   starts ESM-only to keep the build simple.
6. Add gamepad support only after Windows ViGEm loading is made independent of
   Rein's bundled-resource paths.
7. Add release/versioning automation only after the public API and package name
   are agreed.

## Provenance

See [NOTICE](./NOTICE). The extracted code is kept under Apache-2.0. The goal
of this repository is to provide a clean home for the native input layer so
applications can consume it as a normal library.
