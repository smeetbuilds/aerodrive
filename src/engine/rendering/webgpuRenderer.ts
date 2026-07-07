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
  const webgpu = await tryCreateWebGpuRenderer(canvas, options).catch(() => null);
  return webgpu ?? createCanvasRenderer(canvas, options);
}

async function tryCreateWebGpuRenderer(canvas: HTMLCanvasElement, _options: RendererOptions): Promise<RendererHandle | null> {
  if (!navigator.gpu) return null;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) return null;
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });
  const shader = device.createShaderModule({
    label: 'zenith-procedural-road',
    code: `@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f { var p = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3)); return vec4f(p[i], 0, 1); } @fragment fn fs() -> @location(0) vec4f { return vec4f(0.02, 0.035, 0.055, 1.0); }`
  });
  const pipeline = device.createRenderPipeline({ label: 'zenith-background-pipeline', layout: 'auto', vertex: { module: shader, entryPoint: 'vs' }, fragment: { module: shader, entryPoint: 'fs', targets: [{ format }] }, primitive: { topology: 'triangle-list' } });
  let last = performance.now();
  let fps = 0;
  return {
    mode: 'webgpu',
    render() {
      resizeCanvas(canvas);
      const now = performance.now();
      const frameTimeMs = now - last;
      last = now;
      fps = fps * 0.92 + (1000 / Math.max(1, frameTimeMs)) * 0.08;
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: 0.02, g: 0.03, b: 0.045, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
      pass.setPipeline(pipeline);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
      return { fps, frameTimeMs, mode: 'webgpu', drawCalls: 1, approximateVramMb: 96 };
    },
    dispose() { device.destroy(); }
  };
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
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#0a1720');
      sky.addColorStop(1, '#050607');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);
      drawRoad(ctx, width, height, physics, input, seed);
      drawWeather(ctx, width, height, weather, physics.position.z);
      return { fps, frameTimeMs, mode: 'canvas', drawCalls: 3, approximateVramMb: 24 };
    },
    dispose() {}
  };
}

function drawRoad(ctx: CanvasRenderingContext2D, width: number, height: number, physics: PhysicsSnapshot, input: DriverInputState, seed: string) {
  const segments = generateStreamingRoad(seed, physics.position.z, 4);
  ctx.save();
  ctx.translate(width / 2 - physics.position.x * 14 - input.steering * 36, height * 0.58);
  ctx.fillStyle = '#171b20';
  ctx.beginPath();
  ctx.moveTo(-width * 0.07, -height * 0.02);
  ctx.lineTo(width * 0.07, -height * 0.02);
  ctx.lineTo(width * 0.33, height * 0.46);
  ctx.lineTo(-width * 0.33, height * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(215,247,255,.16)';
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
