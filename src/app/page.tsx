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
  const [bootLog, setBootLog] = useState<string[]>(['Booting local application shell...']);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [webGpuReady, setWebGpuReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [storageLine, setStorageLine] = useState('IndexedDB pending');

  const seed = useMemo(() => sanitizeSeed(settings.seed) || DEFAULT_SETTINGS.seed, [settings.seed]);
  const seedLabel = useMemo(() => seedToLabel(seed), [seed]);
  const health = classifyRuntimeHealth({
    fps: renderStats.fps,
    frameTimeMs: renderStats.frameTimeMs,
    physicsHz: telemetry.tickRateHz,
    offlineReady,
    approximateMemoryMb: renderStats.approximateVramMb
  });

  const appendBoot = useCallback((line: string) => {
    setBootLog((current) => [...current.slice(-8), line]);
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
    if (!canvasRef.current) return;

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
        appendBoot(rendererRef.current.mode === 'webgpu' ? 'WebGPU renderer online.' : 'Canvas fallback renderer online.');
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
  }, [appendBoot, seed, settings.graphicsPreset, settings.weather]);

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

  return (
    <main className="zenith-shell" data-health={health}>
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

      {isSettingsOpen ? (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onEnableHid={enableHid}
        />
      ) : null}
    </main>
  );
}
