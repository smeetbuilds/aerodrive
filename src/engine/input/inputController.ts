import { resolveHidProfile, type HidForceFeedback, type HidProfile } from './hidProfiles';

export type DriverInputState = {
  throttle: number;
  brake: number;
  clutch: number;
  steering: number;
  handbrake: number;
  shiftUp: boolean;
  shiftDown: boolean;
};

type Listener = (state: DriverInputState) => void;

type InputController = {
  getState: () => DriverInputState;
  connectHidDevice: () => Promise<string>;
  applyForceFeedback: (feedback: HidForceFeedback) => Promise<void>;
  dispose: () => void;
};

const initialState: DriverInputState = { throttle: 0, brake: 0, clutch: 0, steering: 0, handbrake: 0, shiftUp: false, shiftDown: false };

function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
function clampAxis(value: number): number { return Math.max(-1, Math.min(1, value)); }
function smoothAxis(current: number, target: number, speed: number): number { return current + (target - current) * speed; }

export function createInputController(listener: Listener): InputController {
  const keys = new Set<string>();
  let state = { ...initialState };
  let hidDevice: HIDDevice | null = null;
  let hidProfile: HidProfile | null = null;
  let animationFrame: number | null = null;
  let disposed = false;

  const publish = (next: DriverInputState) => {
    state = { throttle: clamp01(next.throttle), brake: clamp01(next.brake), clutch: clamp01(next.clutch), steering: clampAxis(next.steering), handbrake: clamp01(next.handbrake), shiftUp: next.shiftUp, shiftDown: next.shiftDown };
    listener(state);
  };

  const keyboardTarget = (): DriverInputState => ({
    throttle: keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0,
    brake: keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0,
    clutch: keys.has('KeyC') ? 1 : 0,
    steering: (keys.has('ArrowLeft') || keys.has('KeyA') ? -1 : 0) + (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0),
    handbrake: keys.has('Space') ? 1 : 0,
    shiftUp: keys.has('KeyE'),
    shiftDown: keys.has('KeyQ')
  });

  const keyboardLoop = () => {
    if (disposed || hidDevice) return;
    const target = keyboardTarget();
    publish({ throttle: smoothAxis(state.throttle, target.throttle, 0.16), brake: smoothAxis(state.brake, target.brake, 0.22), clutch: smoothAxis(state.clutch, target.clutch, 0.24), steering: smoothAxis(state.steering, target.steering, target.steering === 0 ? 0.2 : 0.14), handbrake: target.handbrake, shiftUp: target.shiftUp, shiftDown: target.shiftDown });
    animationFrame = window.requestAnimationFrame(keyboardLoop);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
  };
  const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.code); };

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  animationFrame = window.requestAnimationFrame(keyboardLoop);

  return {
    getState: () => state,
    async connectHidDevice(): Promise<string> {
      const hid = navigator.hid;
      if (!hid) return 'WebHID is not available in this browser.';
      const devices = await hid.requestDevice({ filters: [{ usagePage: 0x01, usage: 0x04 }, { usagePage: 0x01, usage: 0x05 }] });
      const selected = devices[0];
      if (!selected) return 'No HID device selected.';
      hidDevice = selected;
      hidProfile = resolveHidProfile({ vendorId: selected.vendorId, productId: selected.productId, productName: selected.productName });
      await hidDevice.open();
      hidDevice.addEventListener('inputreport', (event: HIDReportEvent) => {
        if (!hidProfile) return;
        publish(hidProfile.parseInputReport(event.reportId, event.data, state));
      });
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      return `Connected ${hidProfile.label}: ${hidDevice.productName || 'Unknown wheel/pedal set'}`;
    },
    async applyForceFeedback(feedback: HidForceFeedback): Promise<void> {
      if (!hidDevice || !hidProfile?.buildForceFeedbackReport || !('sendReport' in hidDevice)) return;
      const report = hidProfile.buildForceFeedbackReport(feedback);
      if (!report) return;
      await hidDevice.sendReport(report.reportId, report.payload).catch(() => undefined);
    },
    dispose() {
      disposed = true;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      void hidDevice?.close();
      hidDevice = null;
      hidProfile = null;
    }
  };
}
