import type { ZenithSettings } from '@/engine/storage/indexedDb';
import { sanitizeSeed } from '@/engine/terrain/seed';

type Props = {
  settings: ZenithSettings;
  onUpdate: (next: Partial<ZenithSettings>) => Promise<void>;
  onEnableHid: () => Promise<void>;
};

export function SettingsPanel({ settings, onUpdate, onEnableHid }: Props) {
  return (
    <aside className="panel settings-panel" aria-label="Simulation settings">
      <p className="eyebrow">Zenith Control</p>
      <h2>Settings</h2>
      <p>Preferences, lap records, and peripheral mappings stay in local IndexedDB. No login, telemetry, analytics, or external runtime calls are used.</p>

      <label>
        HUD Mode
        <select value={settings.hudMode} onChange={(event) => void onUpdate({ hudMode: event.target.value as ZenithSettings['hudMode'] })}>
          <option value="zen">Zen</option>
          <option value="minimal">Minimal</option>
          <option value="full">Full Telemetry</option>
        </select>
      </label>

      <label>
        Seed
        <input
          value={settings.seed}
          inputMode="text"
          maxLength={48}
          onChange={(event) => void onUpdate({ seed: sanitizeSeed(event.target.value) })}
          aria-describedby="seed-help"
        />
        <span id="seed-help" className="field-help">Letters, numbers, and hyphens only. The URL hash is sanitized before use.</span>
      </label>

      <label>
        Weather
        <select value={settings.weather} onChange={(event) => void onUpdate({ weather: event.target.value as ZenithSettings['weather'] })}>
          <option value="clear">Clear</option>
          <option value="rain">Rain / reflection pass</option>
          <option value="snow">Snow accumulation pass</option>
          <option value="storm">Storm transition</option>
        </select>
      </label>

      <label>
        Graphics
        <select value={settings.graphicsPreset} onChange={(event) => void onUpdate({ graphicsPreset: event.target.value as ZenithSettings['graphicsPreset'] })}>
          <option value="performance">Performance</option>
          <option value="balanced">Balanced</option>
          <option value="zenith">Zenith</option>
        </select>
      </label>

      <button type="button" onClick={() => void onEnableHid()}>Enable Racing Wheel / WebHID</button>
      <p className="field-help">Force feedback is sent only when a browser exposes WebHID output reports and a guarded device profile is matched.</p>
    </aside>
  );
}
