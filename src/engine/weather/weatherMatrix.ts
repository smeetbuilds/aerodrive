import type { TerrainBiome } from '@/engine/terrain/proceduralRoad';

export type WeatherState = 'clear' | 'rain' | 'snow' | 'storm';

export function weatherGripMultiplier(weather: WeatherState, biome: TerrainBiome, elapsedSeconds: number): number {
  const pulse = 0.92 + Math.sin(elapsedSeconds * 0.18) * 0.04;
  if (weather === 'clear') return 1;
  if (weather === 'rain') return biome === 'asphalt' ? 0.78 * pulse : 0.86 * pulse;
  if (weather === 'snow') return biome === 'snow' ? 0.78 : 0.62 * pulse;
  return biome === 'asphalt' ? 0.64 * pulse : 0.58 * pulse;
}

export function weatherVisualIntensity(weather: WeatherState, phase: number): number {
  if (weather === 'clear') return 0;
  const base = weather === 'rain' ? 0.62 : weather === 'snow' ? 0.48 : 0.9;
  return Math.max(0, Math.min(1, base + Math.sin(phase) * 0.08));
}
