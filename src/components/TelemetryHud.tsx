import type { PhysicsSnapshot } from '@/engine/physics/types';
import type { RenderStats } from '@/engine/rendering/webgpuRenderer';

export type HudMode = 'zen' | 'minimal' | 'full';

type Props = {
  mode: HudMode;
  telemetry: PhysicsSnapshot;
  renderStats: RenderStats;
  isSettingsOpen: boolean;
};

export function TelemetryHud({ mode, telemetry, renderStats, isSettingsOpen }: Props) {
  const className = ['hud', mode, isSettingsOpen ? 'settings-active' : ''].filter(Boolean).join(' ');

  return (
    <section className={className} aria-label="Vehicle telemetry">
      <div>
        <div className="speed">{Math.max(0, Math.round(telemetry.speedKph))}</div>
        <div className="unit">KM/H</div>
      </div>
      <div className="gear" aria-label={`Current gear ${telemetry.gear}`}>{telemetry.gear}</div>

      {mode === 'full' ? (
        <div className="telemetry-grid">
          <Metric label="RPM" value={`${Math.round(telemetry.rpm)}`} />
          <Metric label="Physics" value={`${Math.round(telemetry.tickRateHz)} Hz`} />
          <Metric label="FPS" value={`${Math.round(renderStats.fps)}`} />
          <Metric label="Frame" value={`${renderStats.frameTimeMs.toFixed(1)} ms`} />
          <Metric label="Throttle" value={`${Math.round(telemetry.throttle * 100)}%`} />
          <Metric label="Brake" value={`${Math.round(telemetry.brake * 100)}%`} />
          <Metric label="Steering" value={`${telemetry.steering.toFixed(2)}`} />
          <Metric label="Slip" value={`${telemetry.slipRatio.toFixed(2)} / ${telemetry.slipAngle.toFixed(2)}`} />
          <Metric label="G-Load" value={`${telemetry.longitudinalG.toFixed(2)} / ${telemetry.lateralG.toFixed(2)}`} />
          <Metric label="Grip" value={`${telemetry.surfaceGrip.toFixed(2)} ${telemetry.terrain}`} />
          <Metric label="Draw" value={`${renderStats.drawCalls} calls`} />
          <Metric label="VRAM" value={`${renderStats.approximateVramMb} MB`} />
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
