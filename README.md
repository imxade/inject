# Inject

Inject is a thin native-input systems layer for Node.js.

Its job is to expose the mechanisms required to create native input devices and
submit native input events. It intentionally does **not** decide what those
events mean for an application.

## Install

Install from GitHub now:

```sh
npm install github:imxade/inject
```

For a reproducible application dependency, pin a commit:

```sh
npm install github:imxade/inject#<commit-sha>
```

After the first npm registry release, the preferred install will be:

```sh
npm install @imxade/inject
```

GitHub installs run the package build automatically before installation, so
consumers receive the compiled `dist/` entry points even though build output is
not committed to the repository.

## Quick usage

Import the platform primitive you need and keep application input policy in the
consumer:

```ts
import { EV_KEY, EV_SYN, UinputDevice } from "@imxade/inject/linux"

const device = new UinputDevice({
  name: "my-input-device",
  identity: { bustype: 3, vendor: 1, product: 1, version: 1 },
})

device
  .setEventBit(EV_KEY)
  .setEventBit(EV_SYN)
  .setKeyBit(myNativeKeyCode)
  .create()

device.emit(EV_KEY, myNativeKeyCode, myNativeKeyState).sync()
```

Use `@imxade/inject/mac` for CoreGraphics primitives and
`@imxade/inject/windows` for SendInput, synthetic pointer, and ViGEm
primitives.

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

The model is deliberately closer to Node.js core bindings: Inject exposes a
small, predictable primitive over an operating-system facility, while the
caller decides how to compose those primitives.

## API layout

```text
src/
├── index.ts       # platform-neutral loader/types only
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

## What should not be added here

Features such as `injectText("hello")`, `injectCombo(["ctrl", "c"])`, a
predefined `"left"` mouse action, gesture-to-scroll conversion, pointer
acceleration, or an application-specific input message schema should live in a
consumer package or application.

A useful test for a contribution is: **does this expose a native input mechanism,
or does it decide how an application should interpret input?** Only the former
belongs here.

## Releases

Releases are automated. From GitHub Actions, run **Create Release**, enter a
stable SemVer such as `0.2.0`, and optionally enter a release title.

The workflow updates `package.json`, verifies the package, commits the version,
creates the `vX.Y.Z` tag, and creates a GitHub Release with generated release
notes containing the merged pull requests since the previous release. Publishing
that GitHub Release automatically triggers npm publishing for the same version.

After the initial npm package and trusted publisher are configured, releases do
not require local npm publishing or npm tokens.

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
