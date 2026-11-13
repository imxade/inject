# Inject

Inject provides native input primitives and a unified cross-platform input API for Node.js.

Use the root `createInjector()` API for common mouse and keyboard operations, or import a platform subpath when you need lower-level operating-system features.

## Install

Install from npm:

```sh
npm install @imxade/inject
```

The published package includes the compiled `dist/` entry points, so consumers
can install it directly from the public npm registry.

## Quick usage

Use the root API for common mouse and keyboard injection:

```ts
import { createInjector } from "@imxade/inject"

const input = await createInjector()
input.injectKey(nativeKeyCode, true)
input.injectKey(nativeKeyCode, false)
input.destroy()
```

Use `@imxade/inject/mac` for CoreGraphics primitives and
`@imxade/inject/windows` for SendInput, synthetic pointer, and ViGEm
primitives.

## Unified API

```ts
import { createInjector } from "@imxade/inject"

const input = await createInjector()

input.injectMouseAbsolute(32767, 32767)
input.injectMouseButton("left", true, 32767, 32767)
input.injectMouseButton("left", false, 32767, 32767)
input.injectKey(nativeKeyCode, true)
input.injectKey(nativeKeyCode, false)
input.injectCombo([modifierKeyCode, keyCode])
input.injectMouseWheel(1, 0)
input.destroy()
```

The unified API currently covers absolute pointer positioning, primary mouse
buttons, vertical/horizontal wheel events, key down/up, and key combinations.
Coordinates are normalized to the inclusive range `0..65535`. Wheel deltas are
expressed in line-like native units (positive vertical values scroll up and
positive horizontal values scroll right; Windows converts each unit to 120 wheel
delta units).

**Key codes remain OS-native:** Linux expects evdev codes, macOS expects
`CGKeyCode`, and Windows expects virtual-key codes. This intentionally avoids
pretending that physical keys and keyboard layouts have identical numeric
representations across operating systems. Text entry, layout translation,
touch interpretation, gestures, and controller mappings remain application
responsibilities. Linux creates a virtual uinput device and therefore requires
access to `/dev/uinput`; macOS may require the appropriate privacy permission.

## Design boundary

The library owns:

- loading and calling native input APIs
- native structure definitions and FFI bindings
- virtual-device creation and destruction
- capability registration
- raw event submission
- native resource lifecycle
- platform selection and platform-specific entry points

The consuming application owns:

- key-name mappings
- keyboard layouts
- text-to-key conversion
- shortcuts and key combinations
- pointer sensitivity or acceleration
- scroll direction and scaling
- gesture recognition
- touch interpretation
- controller button mappings
- application protocols, validation, throttling, and state

There are no built-in key maps, gesture policies, controller layouts, screen
defaults, or input-message formats.

The unified API standardizes operation names and argument shapes, not OS-native key-code spaces or application policy. Platform subpaths remain available for capabilities not yet represented by the common interface.

## API layout

```text
src/
├── index.ts       # platform-neutral loader and unified API exports
├── loader.ts      # lazy platform loading
├── linux/         # generic uinput device/config/event primitives
├── mac/           # CoreGraphics event-posting primitives
└── windows/       # SendInput, synthetic pointer, and ViGEm primitives
```

Platform modules are loaded lazily so importing the root package does not
evaluate native bindings for another operating system.

## Linux: uinput

The Linux API exposes a generic `UinputDevice`. The library does not create a
predefined mouse, keyboard, touch device, or controller. The client registers
the capabilities and event codes it needs.

```ts
import {
  EV_KEY,
  EV_SYN,
  UinputDevice,
} from "@imxade/inject/linux"

const device = new UinputDevice({
  name: "client-controlled-device",
  identity: {
    bustype: clientBusType,
    vendor: clientVendor,
    product: clientProduct,
    version: clientVersion,
  },
})

device
  .setEventBit(EV_KEY)
  .setEventBit(EV_SYN)
  .setKeyBit(clientKeyCode)
  .create()

device.emit(EV_KEY, clientKeyCode, clientKeyState)
device.sync()

device.destroy()
```

The numeric key code and state come from the consumer. Inject only configures
and writes to `uinput`.

## macOS: CoreGraphics

The macOS entry point exposes raw CoreGraphics posting primitives.

```ts
import {
  kCGHIDEventTap,
  postKeyEvent,
} from "@imxade/inject/mac"

postKeyEvent(kCGHIDEventTap, clientKeyCode, true)
postKeyEvent(kCGHIDEventTap, clientKeyCode, false)
```

The caller owns the key-code mapping and event sequence.

## Windows: SendInput and synthetic pointers

```ts
import {
  INPUT_KEYBOARD,
  sendInput,
} from "@imxade/inject/windows"

sendInput([
  {
    type: INPUT_KEYBOARD,
    u: {
      ki: {
        wVk: clientVirtualKey,
        wScan: clientScanCode,
        dwFlags: clientFlags,
      },
    },
  },
])
```

Synthetic pointer creation and frame injection are exposed separately. Inject
does not track contacts or turn touch data into gestures.

## Windows: ViGEm

ViGEm is exposed as a native transport rather than a controller policy. The
consumer supplies the DLL path and the raw XUSB report values.

```ts
import { ViGEmClient } from "@imxade/inject/windows"

const vigem = new ViGEmClient(clientViGEmDllPath)
const target = vigem.createXbox360Target()

target.update({
  wButtons: clientButtonBits,
  bLeftTrigger: clientLeftTrigger,
  bRightTrigger: clientRightTrigger,
  sThumbLX: clientLeftX,
  sThumbLY: clientLeftY,
  sThumbRX: clientRightX,
  sThumbRY: clientRightY,
})

target.destroy()
vigem.destroy()
```

No button-name map or bundled binary lookup is provided by the library.

## Scope boundaries

The common API deliberately does not guess keyboard layouts or translate text
into keystrokes. Applications remain responsible for text-to-key conversion,
key-name maps, pointer acceleration, gesture recognition, touch interpretation,
controller layouts, protocols, validation, and throttling. New cross-platform
operations should be added only when their behavior and limitations can be
specified consistently on every supported operating system.

## Releases

Releases are automated. From GitHub Actions, run **Create Release**, enter a
stable SemVer such as `0.2.0`, and optionally enter a release title.

The workflow updates `package.json`, verifies the package, commits the version,
creates the `vX.Y.Z` tag, and creates a GitHub Release with generated release
notes containing the merged pull requests since the previous release. Publishing
that GitHub Release automatically triggers npm publishing for the same version.

After the initial npm package and trusted publisher are configured, releases do
not require local npm publishing or npm tokens. Publishing a normal release
updates npm's `latest` dist-tag automatically.

Consumers can run `npm update @imxade/inject` to receive the newest version
allowed by their dependency's SemVer range. To explicitly move to the newest
release even across a SemVer boundary, run
`npm install @imxade/inject@latest`.

## Native E2E testing

The normal CI matrix verifies formatting, types, tests, builds, and package
installation on GitHub-hosted Linux, macOS, and Windows runners.

`.github/workflows/native-e2e.yml` adds operating-system boundary tests:

- Linux uses a real `uinput` device and reads the resulting evdev frames back.
- macOS posts CoreGraphics keyboard events and observes them with a CGEventTap.
- Windows calls `SendInput` and verifies the resulting OS keyboard state.

Linux runs on GitHub-hosted CI. macOS and Windows native delivery tests require
dedicated self-hosted runners labelled `inject-e2e`, and are enabled only when
the repository variable `NATIVE_E2E_ENABLED` is set to `true`. They never run
for pull requests, so untrusted fork code is not sent to persistent runners.

Release creation requires CI, CodeQL, and Native E2E workflow runs to be green
for the current `master` commit.

## Development

```sh
npm install
npm run check
npm run typecheck
npm test
npm run build
```

CI runs these checks on Linux, macOS, and Windows. CodeQL, Dependabot, and
CodeRabbit are configured at repository level.

## License

Apache-2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
