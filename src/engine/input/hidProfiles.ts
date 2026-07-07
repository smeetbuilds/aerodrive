import type { DriverInputState } from './inputController';

export type HidDeviceIdentity = {
  vendorId: number;
  productId: number;
  productName: string;
};

export type HidForceFeedback = {
  roadRumble: number;
  tractionLoss: number;
  centering: number;
};

export type HidProfile = {
  id: string;
  label: string;
  matches: (device: HidDeviceIdentity) => boolean;
  parseInputReport: (reportId: number, data: DataView, previous: DriverInputState) => DriverInputState;
  buildForceFeedbackReport?: (feedback: HidForceFeedback) => { reportId: number; payload: Uint8Array } | null;
};

function normalizeUnsigned(value: number, max: number): number {
  return Math.max(0, Math.min(1, value / max));
}

function signed16(value: number): number {
  return value > 32767 ? value - 65536 : value;
}

function neutralize(value: number, deadZone = 0.035): number {
  return Math.abs(value) < deadZone ? 0 : Math.max(-1, Math.min(1, value));
}

const genericWheelProfile: HidProfile = {
  id: 'generic-hid-wheel',
  label: 'Generic HID wheel/pedals',
  matches: () => true,
  parseInputReport(_reportId, data, previous) {
    if (data.byteLength < 6) return previous;
    const steeringRaw = signed16(data.getUint16(0, true));
    const throttleRaw = data.getUint8(2);
    const brakeRaw = data.getUint8(3);
    const clutchRaw = data.byteLength > 4 ? data.getUint8(4) : 0;
    const buttons = data.byteLength > 5 ? data.getUint8(5) : 0;

    return {
      ...previous,
      steering: neutralize(steeringRaw / 32767),
      throttle: normalizeUnsigned(throttleRaw, 255),
      brake: normalizeUnsigned(brakeRaw, 255),
      clutch: normalizeUnsigned(clutchRaw, 255),
      handbrake: buttons & 0b00000100 ? 1 : previous.handbrake,
      shiftUp: Boolean(buttons & 0b00000001),
      shiftDown: Boolean(buttons & 0b00000010)
    };
  },
  buildForceFeedbackReport(feedback) {
    const rumble = Math.round(Math.max(0, Math.min(1, feedback.roadRumble)) * 255);
    const traction = Math.round(Math.max(0, Math.min(1, feedback.tractionLoss)) * 255);
    const centering = Math.round(Math.max(0, Math.min(1, feedback.centering)) * 255);
    return { reportId: 0x05, payload: new Uint8Array([rumble, traction, centering, 0]) };
  }
};

const logitechLikeProfile: HidProfile = {
  id: 'logitech-like-wheel',
  label: 'Logitech-style wheel profile',
  matches: (device) => device.vendorId === 0x046d || /logitech|g29|g920|g923/i.test(device.productName),
  parseInputReport(_reportId, data, previous) {
    if (data.byteLength < 8) return genericWheelProfile.parseInputReport(_reportId, data, previous);
    const steeringRaw = data.getUint16(0, true);
    const throttleRaw = data.getUint8(4);
    const brakeRaw = data.getUint8(5);
    const clutchRaw = data.getUint8(6);
    const buttons = data.getUint8(7);
    return {
      ...previous,
      steering: neutralize((steeringRaw - 32768) / 32768, 0.025),
      throttle: 1 - normalizeUnsigned(throttleRaw, 255),
      brake: 1 - normalizeUnsigned(brakeRaw, 255),
      clutch: 1 - normalizeUnsigned(clutchRaw, 255),
      handbrake: buttons & 0b00001000 ? 1 : 0,
      shiftUp: Boolean(buttons & 0b00000001),
      shiftDown: Boolean(buttons & 0b00000010)
    };
  },
  buildForceFeedbackReport(feedback) {
    const effect = Math.round(Math.max(0, Math.min(1, feedback.roadRumble + feedback.tractionLoss * 0.6)) * 127);
    const center = Math.round(Math.max(0, Math.min(1, feedback.centering)) * 127);
    return { reportId: 0x11, payload: new Uint8Array([0x0f, effect, center, 0x00, 0x00, 0x00, 0x00]) };
  }
};

export function resolveHidProfile(device: HidDeviceIdentity): HidProfile {
  return [logitechLikeProfile, genericWheelProfile].find((profile) => profile.matches(device)) ?? genericWheelProfile;
}
