'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { MobileInputState } from '@/engine/input/inputController';

type OrientationPermissionState = 'unsupported' | 'available' | 'enabled' | 'denied';

type ControlState = Required<Pick<MobileInputState, 'throttle' | 'brake' | 'clutch' | 'steering' | 'handbrake'>> & {
  shiftUp: boolean;
  shiftDown: boolean;
  active: boolean;
};

const neutralControl: ControlState = {
  throttle: 0,
  brake: 0,
  clutch: 0,
  steering: 0,
  handbrake: 0,
  shiftUp: false,
  shiftDown: false,
  active: true
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function publishMobileInput(input: MobileInputState) {
  window.dispatchEvent(new CustomEvent<MobileInputState>('aerodrive:mobile-input', { detail: input }));
}

function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

export function MobileControls() {
  const [isGameShellStarted, setGameShellStarted] = useState(false);
  const [tiltState, setTiltState] = useState<OrientationPermissionState>('unsupported');
  const [control, setControl] = useState<ControlState>(neutralControl);
  const steeringPadRef = useRef<HTMLDivElement | null>(null);
  const activeSteeringPointer = useRef<number | null>(null);

  useEffect(() => {
    const detectShellState = () => {
      const shell = document.querySelector<HTMLElement>('.zenith-shell');
      setGameShellStarted(shell?.dataset.started === 'true');
    };
    detectShellState();
    const timer = window.setInterval(detectShellState, 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const hasOrientation = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    setTiltState(hasOrientation ? 'available' : 'unsupported');
  }, []);

  useEffect(() => {
    if (!isGameShellStarted) {
      publishMobileInput({ ...neutralControl, active: false });
      return;
    }
    publishMobileInput(control);
  }, [control, isGameShellStarted]);

  useEffect(() => {
    const resetTransientInput = () => {
      activeSteeringPointer.current = null;
      setControl((current) => ({ ...neutralControl, steering: tiltState === 'enabled' ? current.steering : 0 }));
    };
    const onVisibilityChange = () => {
      if (document.hidden) resetTransientInput();
    };
    window.addEventListener('blur', resetTransientInput);
    window.addEventListener('pagehide', resetTransientInput);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', resetTransientInput);
      window.removeEventListener('pagehide', resetTransientInput);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [tiltState]);

  useEffect(() => {
    if (tiltState !== 'enabled') return;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0;
      setControl((current) => ({ ...current, steering: clamp(gamma / 32, -1, 1), active: true }));
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [tiltState]);

  const setAxis = useCallback((axis: keyof Pick<ControlState, 'throttle' | 'brake' | 'clutch' | 'handbrake'>, value: number) => {
    vibrate(axis === 'brake' ? 18 : 10);
    setControl((current) => ({ ...current, [axis]: clamp(value, 0, 1), active: true }));
  }, []);

  const releaseAxis = useCallback((axis: keyof Pick<ControlState, 'throttle' | 'brake' | 'clutch' | 'handbrake'>) => {
    setControl((current) => ({ ...current, [axis]: 0, active: true }));
  }, []);

  const updateSteeringFromPointer = useCallback((clientX: number) => {
    const rect = steeringPadRef.current?.getBoundingClientRect();
    if (!rect) return;
    const center = rect.left + rect.width / 2;
    const steering = clamp((clientX - center) / (rect.width / 2), -1, 1);
    setControl((current) => ({ ...current, steering, active: true }));
  }, []);

  const pulseShift = useCallback((direction: 'up' | 'down') => {
    vibrate([8, 12, 8]);
    setControl((current) => ({ ...current, shiftUp: direction === 'up', shiftDown: direction === 'down', active: true }));
    window.setTimeout(() => setControl((current) => ({ ...current, shiftUp: false, shiftDown: false })), 120);
  }, []);

  const toggleTilt = useCallback(async () => {
    if (tiltState === 'enabled') {
      setTiltState('available');
      setControl((current) => ({ ...current, steering: 0 }));
      vibrate(8);
      return;
    }
    if (!('DeviceOrientationEvent' in window)) {
      setTiltState('unsupported');
      return;
    }
    const requestPermission = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> }).requestPermission;
    if (typeof requestPermission === 'function') {
      const result = await requestPermission().catch(() => 'denied' as const);
      setTiltState(result === 'granted' ? 'enabled' : 'denied');
      if (result === 'granted') vibrate(12);
      return;
    }
    setTiltState('enabled');
    vibrate(12);
  }, [tiltState]);

  const captureAndSetAxis = useCallback((event: PointerEvent<HTMLButtonElement>, axis: keyof Pick<ControlState, 'throttle' | 'brake' | 'clutch' | 'handbrake'>, value: number) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setAxis(axis, value);
  }, [setAxis]);

  const steeringRotation = useMemo(() => `${Math.round(control.steering * 62)}deg`, [control.steering]);

  if (!isGameShellStarted) return null;

  return (
    <aside className="mobile-controls" aria-label="Mobile driving controls">
      <div className="mobile-steering-zone">
        <button className="mobile-small-button" type="button" onClick={toggleTilt} aria-pressed={tiltState === 'enabled'} aria-label={`Tilt steering ${tiltState}`}>
          {tiltState === 'enabled' ? 'Tilt On' : tiltState === 'denied' ? 'Tilt Denied' : 'Tilt'}
        </button>
        <div
          ref={steeringPadRef}
          className="mobile-wheel-pad"
          role="slider"
          aria-label="Steering"
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-valuenow={Math.round(control.steering * 100)}
          onPointerDown={(event) => {
            activeSteeringPointer.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            vibrate(8);
            updateSteeringFromPointer(event.clientX);
          }}
          onPointerMove={(event) => {
            if (activeSteeringPointer.current === event.pointerId) updateSteeringFromPointer(event.clientX);
          }}
          onPointerUp={(event) => {
            if (activeSteeringPointer.current === event.pointerId) {
              activeSteeringPointer.current = null;
              setControl((current) => ({ ...current, steering: tiltState === 'enabled' ? current.steering : 0 }));
            }
          }}
          onPointerCancel={() => {
            activeSteeringPointer.current = null;
            setControl((current) => ({ ...current, steering: 0 }));
          }}
        >
          <div className="mobile-wheel" style={{ transform: `rotate(${steeringRotation})` }}>
            <span />
          </div>
        </div>
        <div className="mobile-gear-row">
          <button type="button" onClick={() => pulseShift('down')} aria-label="Shift down">− Gear</button>
          <button type="button" onClick={() => pulseShift('up')} aria-label="Shift up">+ Gear</button>
        </div>
      </div>

      <div className="mobile-pedal-zone">
        <button className="mobile-pedal brake" type="button" onPointerDown={(event) => captureAndSetAxis(event, 'brake', 1)} onPointerUp={() => releaseAxis('brake')} onPointerCancel={() => releaseAxis('brake')} onPointerLeave={() => releaseAxis('brake')}>
          Brake
        </button>
        <button className="mobile-pedal throttle" type="button" onPointerDown={(event) => captureAndSetAxis(event, 'throttle', 1)} onPointerUp={() => releaseAxis('throttle')} onPointerCancel={() => releaseAxis('throttle')} onPointerLeave={() => releaseAxis('throttle')}>
          Accelerate
        </button>
        <button className="mobile-small-button handbrake" type="button" onPointerDown={(event) => captureAndSetAxis(event, 'handbrake', 1)} onPointerUp={() => releaseAxis('handbrake')} onPointerCancel={() => releaseAxis('handbrake')}>
          Handbrake
        </button>
      </div>
    </aside>
  );
}
