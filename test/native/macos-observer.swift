import ApplicationServices
import Foundation

guard CommandLine.arguments.count == 2,
      let rawKey = UInt16(CommandLine.arguments[1]) else {
    fputs("ERROR: expected key code\n", stderr)
    exit(2)
}

let targetKey = CGKeyCode(rawKey)
var sawDown = false
var sawUp = false

let callback: CGEventTapCallBack = { _, type, event, _ in
    let key = CGKeyCode(event.getIntegerValueField(.keyboardEventKeycode))
    if key == targetKey {
        if type == .keyDown {
            sawDown = true
        } else if type == .keyUp && sawDown {
            sawUp = true
        }

        if sawDown && sawUp {
            print("PASS")
            fflush(stdout)
            CFRunLoopStop(CFRunLoopGetCurrent())
        }
    }

    return Unmanaged.passUnretained(event)
}

let mask =
    (CGEventMask(1) << CGEventType.keyDown.rawValue) |
    (CGEventMask(1) << CGEventType.keyUp.rawValue)

guard let tap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .listenOnly,
    eventsOfInterest: mask,
    callback: callback,
    userInfo: nil
) else {
    fputs("ERROR: event tap unavailable; grant Input Monitoring to the runner\n", stderr)
    exit(3)
}

let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), source, .commonModes)
CGEvent.tapEnable(tap: tap, enable: true)

print("READY")
fflush(stdout)
CFRunLoopRun()

exit(sawDown && sawUp ? 0 : 4)
