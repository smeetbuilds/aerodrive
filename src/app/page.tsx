'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TelemetryHud, type HudMode } from '@/components/TelemetryHud';
import { BootPanel } from '@/components/BootPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { isOfflineReady, registerServiceWorker } from '@/engine/storage/pwa';
import { estimateLocalStorage, getSettings, saveSettings, type ZenithSettings } from '@/engine/storage/indexedDb';
import { sanitizeSeed, seedToLabel } from '@/engine/terrain/seed';
import { createRenderer, type RendererHandle, type RenderStats } from '@/engine/rendering/webgpuRenderer';
import { createInputController, type DriverInputState } from '@/engine/input/inputController';
import { createAudioEngine } from '@/engine/audio/audioEngine';
import { classifyRuntimeHealth } from '@/engine/performance/budget';
import type { PhysicsSnapshot, PhysicsWorkerInbound, PhysicsWorkerOutbound } from '@/engine/physics/types';

const DEFAULT_SETTINGS: ZenithSettings = {
  hudMode: 'zen',
  graphicsPreset: 'balanced',
  seed: 'alpha-bravo',
  weather: 'clear',
  inputProfile: 'keyboard'
};

const initialTelemetry: PhysicsSnapshot = {
  speedKph: 0,
  rpm: 900,
  gear: 1,
  throttle: 0,
  brake: 0,
  clutch: 0,
  steering: 0,
  handbrake: 0,
  suspensionTravel: [0, 0, 0, 0],
  slipRatio: 0,
  slipAngle: 0,
  lateralG: 0,
  longitudinalG: 0,
  surfaceGrip: 1,
  surfaceRoughness: 0.08,
  terrain: 'asphalt',
  position: { x: 0, y: 0, z: 0 },
  heading: 0,
  tickRateHz: 120,
  tickDriftMs: 0
};

const initialRenderStats: RenderStats = {
  fps: 0,
  frameTimeMs: 0,
  mode: 'booting',
  drawCalls: 0,
  approximateVramMb: 0
};

const blankInput: DriverInputState = { throttle: 0, brake: 0, clutch: 0, steering: 0, handbrake: 0, shiftUp: false, shiftDown: false };
type ScreenOrientationLock = 'any' | 'natural' | 'landscape' | 'portrait' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary';

export default function ZenithPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<RendererHandle | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<ReturnType<typeof createInputController> | null>(null);
  const audioRef = useRef<ReturnType<typeof createAudioEngine> | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPhysicsRef = useRef<PhysicsSnapshot>(initialTelemetry);
  const lastInputRef = useRef<DriverInputState>(blankInput);

  const [settings, setSettings] = useState<ZenithSettings>(DEFAULT_SETTINGS);
  const [telemetry, setTelemetry] = useState<PhysicsSnapshot>(initialTelemetry);
  const [renderStats, setRenderStats] = useState<RenderStats>(initialRenderStats);
  const [bootLog, setBootLog] = useState<string[]>(['Preparing cockpit systems...']);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [webGpuReady, setWebGpuReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [storageLine, setStorageLine] = useState('IndexedDB pending');
  const [hasStarted, setHasStarted] = useState(false);
  const [isMobileLike, setIsMobileLike] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);

  const seed = useMemo(() => sanitizeSeed(settings.seed) || DEFAULT_SETTINGS.seed, [settings.seed]);
  const seedLabel = useMemo(() => seedToLabel(seed), [seed]);
  const orientationBlocked = isMobileLike && !isLandscape;
  const health = classifyRuntimeHealth({
    fps: renderStats.fps,
    frameTimeMs: renderStats.frameTimeMs,
    physicsHz: telemetry.tickRateHz,
    offlineReady,
    approximateMemoryMb: renderStats.approximateVramMb
  });
  const shellHealth = hasStarted ? health : 'warning';

  const appendBoot = useCallback((line: string) => {
    setBootLog((current) => [...current.slice(-8), line]);
  }, []);

  useEffect(() => {
    const syncDeviceState = () => {
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const narrowScreen = window.matchMedia('(max-width: 900px)').matches;
      const hasTouch = navigator.maxTouchPoints > 0;
      const orientationType = screen.orientation?.type;
      const landscapeByApi = typeof orientationType === 'string' ? orientationType.includes('landscape') : false;
      const landscapeByViewport = window.innerWidth >= window.innerHeight;

      setIsMobileLike(coarsePointer || hasTouch || narrowScreen);
      setIsLandscape(landscapeByApi || landscapeByViewport);
    };

    syncDeviceState();
    window.addEventListener('resize', syncDeviceState);
    window.addEventListener('orientationchange', syncDeviceState);
    screen.orientation?.addEventListener?.('change', syncDeviceState);

    return () => {
      window.removeEventListener('resize', syncDeviceState);
      window.removeEventListener('orientationchange', syncDeviceState);
      screen.orientation?.removeEventListener?.('change', syncDeviceState);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    void registerServiceWorker((message) => appendBoot(message)).then(async () => {
      const ready = await isOfflineReady().catch(() => false);
      if (mounted) setOfflineReady(ready);
      if (ready) appendBoot('Offline shell cache verified.');
    });
    void estimateLocalStorage().then((storage) => {
      if (!mounted || !storage) return;
      setStorageLine(`${storage.usageMb} MB used / ${storage.quotaMb} MB quota`);
    });
    void getSettings().then((stored) => {
      if (!mounted) return;
      const hashSeed = sanitizeSeed(new URLSearchParams(window.location.hash.replace(/^#/, '')).get('seed') ?? '');
      setSettings({ ...DEFAULT_SETTINGS, ...stored, seed: hashSeed || stored?.seed || DEFAULT_SETTINGS.seed });
      appendBoot('IndexedDB settings loaded and validated.');
    });
    return () => {
      mounted = false;
    };
  }, [appendBoot]);

  useEffect(() => {
    if (!hasStarted || orientationBlocked || !canvasRef.current) return;

    let isDisposed = false;

    const boot = async () => {
      try {
        rendererRef.current?.dispose();
        rendererRef.current = await createRenderer(canvasRef.current!, {
          graphicsPreset: settings.graphicsPreset,
          seed,
          weather: settings.weather
        });
        setWebGpuReady(rendererRef.current.mode === 'webgpu');
        appendBoot(rendererRef.current.mode === 'webgpu' ? 'WebGPU renderer online.' : 'Canvas gameplay renderer online.');
      } catch (error) {
        appendBoot(`Renderer boot failed: ${(error as Error).message}`);
      }

      inputRef.current?.dispose();
      inputRef.current = createInputController((state) => {
        lastInputRef.current = state;
      });
      appendBoot('Input profile active. WebHID is permission-gated from settings.');

      audioRef.current?.dispose();
      audioRef.current = createAudioEngine();
      appendBoot('Local HRTF-style Web Audio graph armed.');

      workerRef.current?.terminate();
      workerRef.current = new Worker(new URL('../workers/physics.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current.onmessage = (event: MessageEvent<PhysicsWorkerOutbound>) => {
        if (event.data.type === 'snapshot') {
          lastPhysicsRef.current = event.data.snapshot;
          setTelemetry(event.data.snapshot);
          audioRef.current?.update(event.data.snapshot);
        } else if (event.data.type === 'boot' || event.data.type === 'warning') {
          appendBoot(event.data.message);
        }
      };
      workerRef.current.postMessage({ type: 'boot', seed, weather: settings.weather } satisfies PhysicsWorkerInbound);

      const renderLoop = () => {
        if (isDisposed) return;
        const physics = lastPhysicsRef.current;
        const stats = rendererRef.current?.render({
          physics,
          input: lastInputRef.current,
          seed,
          weather: settings.weather
        });
        if (stats) setRenderStats(stats);
        void inputRef.current?.applyForceFeedback({
          roadRumble: Math.min(1, physics.surfaceRoughness * 1.3 + Math.abs(physics.longitudinalG) * 0.08),
          tractionLoss: Math.min(1, Math.abs(physics.slipRatio) * 0.62 + Math.abs(physics.slipAngle) * 0.42),
          centering: Math.min(1, 0.22 + physics.surfaceGrip * 0.48)
        });
        workerRef.current?.postMessage({ type: 'input', input: lastInputRef.current } satisfies PhysicsWorkerInbound);
        rafRef.current = requestAnimationFrame(renderLoop);
      };
      rafRef.current = requestAnimationFrame(renderLoop);
    };

    void boot();

    return () => {
      isDisposed = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
      workerRef.current?.terminate();
      inputRef.current?.dispose();
      audioRef.current?.dispose();
    };
  }, [appendBoot, hasStarted, orientationBlocked, seed, settings.graphicsPreset, settings.weather]);

  const updateSettings = async (next: Partial<ZenithSettings>) => {
    const merged = { ...settings, ...next };
    const sanitized: ZenithSettings = { ...merged, seed: sanitizeSeed(merged.seed) || DEFAULT_SETTINGS.seed };
    setSettings(sanitized);
    await saveSettings(sanitized);
    if (next.seed) window.history.replaceState(null, '', `#seed=${encodeURIComponent(sanitized.seed)}`);
  };

  const enableHid = async () => {
    const result = await inputRef.current?.connectHidDevice();
    await updateSettings({ inputProfile: 'hid' });
    appendBoot(result ?? 'WebHID unavailable in this browser.');
  };

  const lockLandscape = async () => {
    try {
      const element = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
      if (document.fullscreenElement == null && element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (document.fullscreenElement == null && element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      }
    } catch {
      appendBoot('Fullscreen request skipped by browser policy.');
    }

    try {
      const orientationApi = screen.orientation as ScreenOrientation & { lock?: (orientation: ScreenOrientationLock) => Promise<void> };
      if (orientationApi?.lock) {
        await orientationApi.lock('landscape');
        appendBoot('Landscape orientation requested.');
      }
    } catch {
      appendBoot('Landscape lock not supported; manual rotate fallback active.');
    }
  };

  const startExperience = async () => {
    if (isMobileLike && !isLandscape) return;
    await lockLandscape();
    setHasStarted(true);
    appendBoot('Pilot launch acknowledged. Starting simulation...');
  };

  return (
    <main className="zenith-shell" data-health={shellHealth} data-started={hasStarted ? 'true' : 'false'}>
      <canvas ref={canvasRef} className="zenith-canvas" aria-label="AeroDrive Zenith driving simulation canvas" />

      <div className="topbar" aria-label="Application controls">
        <div>
          <p className="eyebrow">Aahav Labs / Offline PWA</p>
          <h1>AeroDrive Zenith</h1>
        </div>
        <button className="settings-button" type="button" onClick={() => setSettingsOpen((value) => !value)}>
          {isSettingsOpen ? 'Close' : 'Settings'}
        </button>
      </div>

      {hasStarted ? (
        <>
          <TelemetryHud
            mode={settings.hudMode as HudMode}
            telemetry={telemetry}
            renderStats={renderStats}
            isSettingsOpen={isSettingsOpen}
          />

          <BootPanel
            seedLabel={seedLabel}
            webGpuReady={webGpuReady}
            renderStats={renderStats}
            bootLog={bootLog}
            offlineReady={offlineReady}
            storageLine={storageLine}
            health={health}
            telemetry={telemetry}
          />
        </>
      ) : null}

      {isSettingsOpen ? (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onEnableHid={enableHid}
        />
      ) : null}

      {!hasStarted && orientationBlocked ? (
        <section className="startup-overlay startup-overlay-portrait" aria-label="Rotate device before launch">
          <div className="startup-backdrop" />
          <div className="orientation-card startup-rotate-card">
            <div className="orientation-phone animated-phone" aria-hidden="true"><span /></div>
            <p className="orientation-eyebrow">Landscape required</p>
            <h3>Turn your phone sideways to start</h3>
            <p>AeroDrive Zenith uses a wide cockpit, pedals, steering, and telemetry layout. Rotate to landscape, then the Play button unlocks.</p>
            <button className="ghost-button" type="button" onClick={() => setSettingsOpen(true)}>
              Open Settings
            </button>
          </div>
        </section>
      ) : null}

      {!hasStarted && !orientationBlocked ? (
        <section className="startup-overlay" aria-label="Game launch screen">
          <div className="startup-backdrop" />
          <div className="startup-card">
            <div className="startup-badge">Cinematic Browser Driving Preview</div>
            <p className="startup-kicker">Offline-first performance · deterministic terrain · local telemetry</p>
            <h2>Start your AeroDrive Zenith run</h2>
            <p className="startup-copy">
              Enter a polished cockpit launch flow, tune the seed and weather, then drive a clean local-first road experience with desktop, mobile, and WebHID-ready controls.
            </p>

            <div className="startup-highlights">
              <div><span>Render</span><strong>Ready on Play</strong></div>
              <div><span>Seed</span><strong>{seedLabel}</strong></div>
              <div><span>Offline</span><strong>{offlineReady ? 'Primed' : 'Checking'}</strong></div>
            </div>

            <div className="startup-cta-group">
              <button className="play-button" type="button" onClick={() => void startExperience()}>
                <span className="play-icon" aria-hidden="true">▶</span>
                <span>Play Now</span>
              </button>
              <button className="ghost-button" type="button" onClick={() => setSettingsOpen(true)}>
                Open Settings
              </button>
            </div>

            <div className="startup-footer-grid">
              <div>
                <span>Controls</span>
                <strong>W/A/S/D · Arrows · Touch · WebHID</strong>
              </div>
              <div>
                <span>Mobile Rule</span>
                <strong>{isMobileLike ? 'Landscape required to start' : 'Desktop free orientation'}</strong>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {hasStarted && orientationBlocked ? (
        <section className="orientation-overlay" aria-label="Landscape required notice">
          <div className="orientation-card">
            <div className="orientation-phone animated-phone" aria-hidden="true"><span /></div>
            <p className="orientation-eyebrow">Landscape required</p>
            <h3>Rotate your device to continue driving</h3>
            <p>AeroDrive Zenith uses a wide cockpit layout on mobile. Turn your phone sideways, then continue the experience.</p>
            <button className="play-button compact" type="button" onClick={() => void lockLandscape()}>
              Try Landscape Lock Again
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
