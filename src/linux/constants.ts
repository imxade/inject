// Linux input event families.
export const EV_SYN = 0x00
export const EV_KEY = 0x01
export const EV_REL = 0x02
export const EV_ABS = 0x03

// Synchronization event used to flush an input frame.
export const SYN_REPORT = 0x00

// uinput ioctl requests.
export const UI_SET_EVBIT = 0x40045564
export const UI_SET_KEYBIT = 0x40045565
export const UI_SET_RELBIT = 0x40045566
export const UI_SET_ABSBIT = 0x40045567
export const UI_SET_PROPBIT = 0x4004556e
export const UI_DEV_SETUP = 0x405c5503
export const UI_ABS_SETUP = 0x401c5504
export const UI_DEV_CREATE = 0x5501
export const UI_DEV_DESTROY = 0x5502

export const UINPUT_PATH = "/dev/uinput"
export const UINPUT_MAX_NAME_SIZE = 80
