import type { DriverInputState } from '@/engine/input/inputController';
import { createVehicleState, integrateVehicle, PHYSICS_DT, PHYSICS_TICK_HZ } from '@/engine/physics/vehicleModel';
import type { PhysicsWorkerInbound, PhysicsWorkerOutbound } from '@/engine/physics/types';
import { loadWasmPhysicsCore, type PhysicsMathCore } from '@/engine/physics/wasmPhysicsBridge';
import type { WeatherState } from '@/engine/weather/weatherMatrix';

const MAX_CATCHUP_TICKS = 8;
const blankInput: DriverInputState = { throttle: 0, brake: 0, clutch: 0, steering: 0, handbrake: 0, shiftUp: false, shiftDown: false };

let vehicle = createVehicleState();
let input = blankInput;
let seed = 'alpha-bravo';
let weather: WeatherState = 'clear';
let paused = false;
let accumulator = 0;
let lastTime = performance.now();
let startTime = lastTime;
let mathCore: PhysicsMathCore | null = null;

function post(message: PhysicsWorkerOutbound) {
  self.postMessage(message);
}

async function boot(nextSeed: string, nextWeather: WeatherState) {
  seed = nextSeed;
  weather = nextWeather;
  vehicle = createVehicleState();
  accumulator = 0;
  lastTime = performance.now();
  startTime = lastTime;
  mathCore = await loadWasmPhysicsCore();
  post({ type: 'boot', message: mathCore ? `Wasm physics core v${mathCore.version} online.` : 'TypeScript physics fallback online.' });
  loop();
}

function loop() {
  if (paused) {
    setTimeout(loop, 1000 / PHYSICS_TICK_HZ);
    return;
  }
  const now = performance.now();
  accumulator += Math.min(0.08, (now - lastTime) / 1000);
  lastTime = now;
  let steps = 0;
  let snapshot = null;
  while (accumulator >= PHYSICS_DT && steps < MAX_CATCHUP_TICKS) {
    snapshot = integrateVehicle(vehicle, input, { seed, weather, elapsedSeconds: (now - startTime) / 1000, tickDriftMs: Math.max(0, accumulator * 1000), mathCore });
    accumulator -= PHYSICS_DT;
    steps += 1;
  }
  if (steps >= MAX_CATCHUP_TICKS) {
    accumulator = 0;
    post({ type: 'warning', message: 'Physics catch-up guard triggered to prevent spiral of death.' });
  }
  if (snapshot) post({ type: 'snapshot', snapshot });
  setTimeout(loop, 1000 / PHYSICS_TICK_HZ);
}

self.onmessage = (event: MessageEvent<PhysicsWorkerInbound>) => {
  const message = event.data;
  if (message.type === 'boot') void boot(message.seed, message.weather);
  if (message.type === 'input') input = message.input;
  if (message.type === 'weather') weather = message.weather;
  if (message.type === 'pause') paused = true;
  if (message.type === 'resume') paused = false;
};
