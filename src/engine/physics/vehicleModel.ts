import type { DriverInputState } from '@/engine/input/inputController';
import type { PhysicsSnapshot } from './types';
import { sampleSurface, type TerrainBiome } from '@/engine/terrain/proceduralRoad';
import type { WeatherState } from '@/engine/weather/weatherMatrix';
import { weatherGripMultiplier } from '@/engine/weather/weatherMatrix';
import type { PhysicsMathCore } from './wasmPhysicsBridge';

export const PHYSICS_TICK_HZ = 120;
export const PHYSICS_DT = 1 / PHYSICS_TICK_HZ;

const G = 9.80665;
const MASS = 1420;
const WHEELBASE = 2.72;
const COM_H = 0.54;
const REDLINE = 7800;
const IDLE = 850;
const FINAL_DRIVE = 3.42;
const WHEEL_R = 0.335;
const GEARS = [0, 3.31, 2.09, 1.47, 1.1, 0.88, 0.71] as const;

export type VehicleState = {
  velocity: number;
  lateralVelocity: number;
  heading: number;
  yawRate: number;
  x: number;
  y: number;
  z: number;
  gear: number;
  rpm: number;
  slipRatio: number;
  slipAngle: number;
  shiftLatchUp: boolean;
  shiftLatchDown: boolean;
};

export type VehicleStepContext = {
  seed: string;
  weather: WeatherState;
  elapsedSeconds: number;
  tickDriftMs: number;
  mathCore?: PhysicsMathCore | null;
};

export function createVehicleState(): VehicleState {
  return { velocity: 0, lateralVelocity: 0, heading: 0, yawRate: 0, x: 0, y: 0, z: 0, gear: 1, rpm: 900, slipRatio: 0, slipAngle: 0, shiftLatchUp: false, shiftLatchDown: false };
}

export function pacejkaMagicFormula(slip: number, surfaceGrip: number): number {
  const x = clamp(slip, -1.4, 1.4);
  const b = 10.8;
  const c = 1.86;
  const e = 0.97;
  return surfaceGrip * Math.sin(c * Math.atan(b * x - e * (b * x - Math.atan(b * x))));
}

export function engineTorqueAt(rpm: number): number {
  const n = clamp((rpm - IDLE) / (REDLINE - IDLE), 0, 1);
  const falloff = n > 0.72 ? 1 - (n - 0.72) * 0.82 : 1;
  return 365 * (0.48 + n * 0.52) * Math.max(0.58, falloff);
}

export function integrateVehicle(state: VehicleState, input: DriverInputState, context: VehicleStepContext): PhysicsSnapshot {
  if (input.shiftUp && !state.shiftLatchUp) state.gear = Math.min(6, state.gear + 1);
  if (input.shiftDown && !state.shiftLatchDown) state.gear = Math.max(1, state.gear - 1);
  state.shiftLatchUp = input.shiftUp;
  state.shiftLatchDown = input.shiftDown;

  const surface = sampleSurface(context.seed, state.z);
  const grip = clamp(surface.grip * weatherGripMultiplier(context.weather, surface.biome, context.elapsedSeconds), 0.22, 1.08);
  const gearRatio = GEARS[state.gear] ?? GEARS[1];
  const drivetrainRpm = (state.velocity / WHEEL_R) * gearRatio * FINAL_DRIVE * 60 / (2 * Math.PI);
  state.rpm = clamp(Math.max(IDLE + input.throttle * 420, drivetrainRpm), IDLE, REDLINE);

  const torque = (context.mathCore?.engineTorqueAt ?? engineTorqueAt)(state.rpm) * input.throttle * (1 - input.clutch * 0.86);
  const drive = (torque * gearRatio * FINAL_DRIVE * 0.86) / WHEEL_R;
  const brake = input.brake * 14500 + input.handbrake * 6800;
  const drag = 0.5 * 1.225 * 0.68 * state.velocity * state.velocity;
  const rolling = MASS * G * 0.014 * (1 + surface.roughness * 0.8);
  const steer = clamp(input.steering, -1, 1) * 0.46;
  const slipRatio = clamp((drive - brake) / Math.max(3500, MASS * G * grip), -1.25, 1.25);
  const slipAngle = clamp(Math.atan2(state.lateralVelocity + state.yawRate * WHEELBASE * 0.5, Math.max(1, state.velocity)) - steer, -1.1, 1.1);
  const pacejka = context.mathCore?.pacejkaMagicFormula ?? pacejkaMagicFormula;
  const longitudinal = pacejka(slipRatio, grip);
  const lateral = pacejka(slipAngle, grip);
  const combined = Math.max(1, Math.hypot(longitudinal, lateral) / grip);
  const accel = ((longitudinal / combined) * MASS * G + drive * 0.18 - brake - drag - rolling) / MASS;
  const latAccel = (-(lateral / combined) * MASS * G * clamp(state.velocity / 16, 0.2, 1)) / MASS;

  state.velocity = Math.max(0, state.velocity + accel * PHYSICS_DT);
  state.lateralVelocity = (state.lateralVelocity + latAccel * PHYSICS_DT) * 0.92;
  state.yawRate = ((state.velocity / WHEELBASE) * Math.tan(steer) * grip + state.lateralVelocity * 0.035) * 0.94;
  state.heading += state.yawRate * PHYSICS_DT;
  state.x += (Math.sin(state.heading) * state.velocity + Math.cos(state.heading) * state.lateralVelocity) * PHYSICS_DT;
  state.z += Math.cos(state.heading) * state.velocity * PHYSICS_DT;
  state.y = surface.elevation;

  const pitch = clamp((MASS * accel * COM_H / WHEELBASE) / (MASS * G * 0.25), -0.12, 0.14);
  const roll = clamp(latAccel / G * 0.045 + surface.camber * 0.12, -0.12, 0.14);
  return { speedKph: state.velocity * 3.6, rpm: state.rpm, gear: state.gear, throttle: input.throttle, brake: input.brake, clutch: input.clutch, steering: input.steering, handbrake: input.handbrake, suspensionTravel: [pitch + roll, pitch - roll, -pitch + roll * 0.7, -pitch - roll * 0.7], slipRatio, slipAngle, lateralG: latAccel / G, longitudinalG: accel / G, surfaceGrip: grip, surfaceRoughness: surface.roughness, terrain: surface.biome as TerrainBiome, position: { x: state.x, y: state.y, z: state.z }, heading: state.heading, tickRateHz: PHYSICS_TICK_HZ, tickDriftMs: context.tickDriftMs };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
