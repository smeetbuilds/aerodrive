import { sanitizeSeed } from '@/engine/terrain/seed';
import type { WeatherState } from '@/engine/weather/weatherMatrix';

export type ZenithSettings = {
  hudMode: 'zen' | 'minimal' | 'full';
  graphicsPreset: 'performance' | 'balanced' | 'zenith';
  seed: string;
  weather: WeatherState;
  inputProfile: 'keyboard' | 'hid';
};

const DB_NAME = 'aerodrive-zenith';
const DB_VERSION = 2;
const SETTINGS_KEY = 'settings';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of ['settings', 'lap-times', 'peripheral-mappings']) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export function validateSettings(value: Partial<ZenithSettings> | null | undefined): Partial<ZenithSettings> {
  if (!value || typeof value !== 'object') return {};
  const next: Partial<ZenithSettings> = {};
  if (['zen', 'minimal', 'full'].includes(String(value.hudMode))) next.hudMode = value.hudMode;
  if (['performance', 'balanced', 'zenith'].includes(String(value.graphicsPreset))) next.graphicsPreset = value.graphicsPreset;
  if (['clear', 'rain', 'snow', 'storm'].includes(String(value.weather))) next.weather = value.weather;
  if (['keyboard', 'hid'].includes(String(value.inputProfile))) next.inputProfile = value.inputProfile;
  if (typeof value.seed === 'string') next.seed = sanitizeSeed(value.seed);
  return next;
}

export async function getSettings(): Promise<Partial<ZenithSettings>> {
  if (typeof indexedDB === 'undefined') return {};
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction('settings', 'readonly').objectStore('settings').get(SETTINGS_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(validateSettings(request.result));
  });
}

export async function saveSettings(settings: ZenithSettings): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  const safe = validateSettings(settings);
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction('settings', 'readwrite').objectStore('settings').put(safe, SETTINGS_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function estimateLocalStorage(): Promise<{ usageMb: number; quotaMb: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  return { usageMb: Math.round((estimate.usage ?? 0) / 1024 / 1024), quotaMb: Math.round((estimate.quota ?? 0) / 1024 / 1024) };
}
