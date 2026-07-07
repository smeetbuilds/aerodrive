export const PERFORMANCE_BUDGET = {
  targetFps: 60,
  minimumOnePercentLowFps: 45,
  failureFps: 30,
  physicsTickHz: 120,
  targetOfflineLoadMs: 3000,
  maximumOfflineLoadMs: 5000,
  targetVramMb: 1536,
  maximumVramMb: 2048
} as const;

export type RuntimeHealth = 'optimal' | 'warning' | 'failure';

export type PerformanceSample = {
  fps: number;
  frameTimeMs: number;
  physicsHz: number;
  offlineReady: boolean;
  approximateMemoryMb?: number;
};

export function classifyRuntimeHealth(sample: PerformanceSample): RuntimeHealth {
  if (sample.fps < PERFORMANCE_BUDGET.failureFps || sample.physicsHz !== PERFORMANCE_BUDGET.physicsTickHz) return 'failure';
  if (sample.fps < PERFORMANCE_BUDGET.minimumOnePercentLowFps) return 'warning';
  if (typeof sample.approximateMemoryMb === 'number' && sample.approximateMemoryMb > PERFORMANCE_BUDGET.maximumVramMb) return 'failure';
  if (!sample.offlineReady) return 'warning';
  return 'optimal';
}

export function formatBudgetLine(sample: PerformanceSample): string {
  const health = classifyRuntimeHealth(sample);
  return `${health.toUpperCase()} · ${Math.round(sample.fps)} FPS · ${Math.round(sample.physicsHz)}Hz physics`;
}
