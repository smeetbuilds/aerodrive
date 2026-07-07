import type { DriverInputState } from '@/engine/input/inputController';
import type { PhysicsSnapshot } from '@/engine/physics/types';
import { generateStreamingRoad } from '@/engine/terrain/proceduralRoad';
import type { WeatherState } from '@/engine/weather/weatherMatrix';
import { weatherVisualIntensity } from '@/engine/weather/weatherMatrix';

export type RenderMode = 'booting' | 'webgpu' | 'canvas';
export type RenderStats = { fps: number; frameTimeMs: number; mode: RenderMode; drawCalls: number; approximateVramMb: number };
export type RendererHandle = { mode: RenderMode; render: (frame: { physics: PhysicsSnapshot; input: DriverInputState; seed: string; weather: WeatherState }) => RenderStats; dispose: () => void };
type RendererOptions = { graphicsPreset: 'performance' | 'balanced' | 'zenith'; seed: string; weather: WeatherState };

export async function createRenderer(canvas: HTMLCanvasElement, options: RendererOptions): Promise<RendererHandle> {
  return createCanvasRenderer(canvas, options);
}

function createCanvasRenderer(canvas: HTMLCanvasElement, _options: RendererOptions): RendererHandle {
  const ctx = canvas.getContext('2d', { alpha: false });
  let last = performance.now();
  let fps = 0;
  return {
    mode: 'canvas',
    render({ physics, input, seed, weather }) {
      resizeCanvas(canvas);
      const now = performance.now();
      const frameTimeMs = now - last;
      last = now;
      fps = fps * 0.92 + (1000 / Math.max(1, frameTimeMs)) * 0.08;
      if (!ctx) return { fps, frameTimeMs, mode: 'canvas', drawCalls: 0, approximateVramMb: 24 };
      const { width, height } = canvas;
      drawSky(ctx, width, height, weather, physics.position.z);
      drawTerrain(ctx, width, height, physics, seed);
      drawRoad(ctx, width, height, physics, input, seed);
      drawCockpitHints(ctx, width, height, physics);
      drawWeather(ctx, width, height, weather, physics.position.z);
      return { fps, frameTimeMs, mode: 'canvas', drawCalls: 5, approximateVramMb: 24 };
    },
    dispose() {}
  };
}

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number, weather: WeatherState, z: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, weather === 'clear' ? '#0b2233' : '#111820');
  sky.addColorStop(0.48, weather === 'snow' ? '#182532' : '#08121a');
  sky.addColorStop(1, '#040506');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#d7f7ff';
  ctx.beginPath();
  ctx.arc(width * 0.72 + Math.sin(z * 0.002) * 30, height * 0.18, Math.min(width, height) * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTerrain(ctx: CanvasRenderingContext2D, width: number, height: number, physics: PhysicsSnapshot, seed: string) {
  const segments = generateStreamingRoad(seed, physics.position.z, 8);
  const horizon = height * 0.47;
  ctx.fillStyle = physics.terrain === 'snow' ? '#17232b' : physics.terrain === 'mud' ? '#16100d' : physics.terrain === 'dirt' ? '#1b160f' : '#111b18';
  ctx.fillRect(0, horizon, width, height - horizon);
  ctx.strokeStyle = 'rgba(215,247,255,0.10)';
  ctx.lineWidth = 1;
  for (const segment of segments) {
    const y = horizon + (segment.index * 80 - physics.position.z) * 0.11;
    if (y < horizon - 20 || y > height + 40) continue;
    ctx.beginPath();
    ctx.moveTo(0, y + segment.elevation * 0.8);
    ctx.lineTo(width, y + segment.elevation * 0.8 + segment.camber * 180);
    ctx.stroke();
  }
}

function drawRoad(ctx: CanvasRenderingContext2D, width: number, height: number, physics: PhysicsSnapshot, input: DriverInputState, seed: string) {
  const segments = generateStreamingRoad(seed, physics.position.z, 5);
  const horizon = height * 0.48;
  ctx.save();
  ctx.translate(width / 2 - physics.position.x * 14 - input.steering * 36, horizon);
  const road = ctx.createLinearGradient(0, 0, 0, height * 0.52);
  road.addColorStop(0, '#20252c');
  road.addColorStop(1, '#090b0e');
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(-width * 0.08, 0);
  ctx.lineTo(width * 0.08, 0);
  ctx.lineTo(width * 0.36, height * 0.52);
  ctx.lineTo(-width * 0.36, height * 0.52);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.26)';
  ctx.lineWidth = Math.max(2, width * 0.002);
  ctx.beginPath();
  ctx.moveTo(-width * 0.08, 0);
  ctx.lineTo(-width * 0.36, height * 0.52);
  ctx.moveTo(width * 0.08, 0);
  ctx.lineTo(width * 0.36, height * 0.52);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(215,247,255,0.34)';
  ctx.setLineDash([18, 22]);
  ctx.lineWidth = Math.max(2, width * 0.0015);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, height * 0.52);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(215,247,255,0.16)';
  ctx.lineWidth = 2;
  for (const segment of segments) {
    for (let i = 0; i < segment.points.length; i += 18) {
      const p = segment.points[i];
      if (!p) continue;
      const y = (p.z - physics.position.z) * 0.12;
      ctx.beginPath();
      ctx.moveTo(p.x * 2 - 22, y);
      ctx.lineTo(p.x * 2 + 22, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCockpitHints(ctx: CanvasRenderingContext2D, width: number, height: number, physics: PhysicsSnapshot) {
  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = 'rgba(215,247,255,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.86, Math.min(width, height) * 0.12, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.fillStyle = 'rgba(215,247,255,0.72)';
  ctx.font = `${Math.max(12, Math.floor(width * 0.012))}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(physics.speedKph)} KM/H · G${physics.gear} · ${physics.terrain.toUpperCase()}`, width * 0.5, height * 0.9);
  ctx.restore();
}

function drawWeather(ctx: CanvasRenderingContext2D, width: number, height: number, weather: WeatherState, z: number) {
  const intensity = weatherVisualIntensity(weather, z * 0.01);
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalAlpha = intensity * 0.35;
  ctx.strokeStyle = weather === 'snow' ? '#eaf8ff' : '#9bc7ff';
  for (let i = 0; i < 80 * intensity; i += 1) {
    const x = (i * 97 + z * 4) % width;
    const y = (i * 53 + z * 8) % height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (weather === 'snow' ? 1 : 8), y + (weather === 'snow' ? 1 : 24));
    ctx.stroke();
  }
  ctx.restore();
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
