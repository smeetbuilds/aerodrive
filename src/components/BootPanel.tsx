import type { PhysicsSnapshot } from '@/engine/physics/types';
import type { RenderStats } from '@/engine/rendering/webgpuRenderer';
import type { RuntimeHealth } from '@/engine/performance/budget';

type Props = {
  seedLabel: string;
  webGpuReady: boolean;
  renderStats: RenderStats;
  bootLog: string[];
  offlineReady: boolean;
  storageLine: string;
  health: RuntimeHealth;
  telemetry: PhysicsSnapshot;
};

export function BootPanel({ seedLabel, webGpuReady, renderStats, bootLog, offlineReady, storageLine, health, telemetry }: Props) {
  return (
    <aside className="panel boot-panel" aria-label="Local runtime status">
      <p className="eyebrow">Local runtime</p>
      <h2>{seedLabel}</h2>
      <div className="status-row status-row-wide">
        <StatusPill label="GPU" value={webGpuReady ? 'WebGPU' : 'Fallback'} />
        <StatusPill label="Render" value={`${Math.round(renderStats.fps)} FPS`} />
        <StatusPill label="Physics" value={`${Math.round(telemetry.tickRateHz)} Hz`} />
        <StatusPill label="Offline" value={offlineReady ? 'Ready' : 'Warming'} />
        <StatusPill label="Surface" value={telemetry.terrain} />
        <StatusPill label="Health" value={health} />
      </div>
      <p className="storage-line">{storageLine}</p>
      <ul className="boot-log">
        {bootLog.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}
      </ul>
    </aside>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-pill"><span>{label}</span><strong>{value}</strong></div>
  );
}
