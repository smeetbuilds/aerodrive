import type { DriverInputState } from '@/engine/input/inputController';
import type { TerrainBiome } from '@/engine/terrain/proceduralRoad';
import type { WeatherState } from '@/engine/weather/weatherMatrix';

export type Vec3 = { x: number; y: number; z: number };

export type PhysicsSnapshot = {
  speedKph: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  clutch: number;
  steering: number;
  handbrake: number;
  suspensionTravel: [number, number, number, number];
  slipRatio: number;
  slipAngle: number;
  lateralG: number;
  longitudinalG: number;
  surfaceGrip: number;
  surfaceRoughness: number;
  terrain: TerrainBiome;
  position: Vec3;
  heading: number;
  tickRateHz: number;
  tickDriftMs: number;
};

export type PhysicsWorkerInbound =
  | { type: 'boot'; seed: string; weather: WeatherState }
  | { type: 'input'; input: DriverInputState }
  | { type: 'weather'; weather: WeatherState }
  | { type: 'pause' }
  | { type: 'resume' };

export type PhysicsWorkerOutbound =
  | { type: 'boot'; message: string }
  | { type: 'snapshot'; snapshot: PhysicsSnapshot }
  | { type: 'warning'; message: string };
