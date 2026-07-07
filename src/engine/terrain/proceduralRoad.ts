import { seededRandom } from './seed';

export type TerrainBiome = 'asphalt' | 'dirt' | 'mud' | 'snow';

export type RoadPoint = { x: number; y: number; z: number; camber: number };
export type RoadSegment = { index: number; biome: TerrainBiome; grip: number; roughness: number; camber: number; elevation: number; points: RoadPoint[] };

export const MAX_SEGMENT_CACHE_ENTRIES = 160;
const SEGMENT_LENGTH = 80;
const POINTS_PER_SEGMENT = 32;
const segmentCache = new Map<string, RoadSegment>();

export function getRoadSegmentCacheSize(): number {
  return segmentCache.size;
}

export function generateStreamingRoad(seed: string, playerZ: number, radius = 7): RoadSegment[] {
  const center = Math.floor(playerZ / SEGMENT_LENGTH);
  const segments: RoadSegment[] = [];
  for (let i = center - 1; i <= center + radius; i += 1) segments.push(getSegment(seed, i));
  return segments;
}

export function sampleSurface(seed: string, z: number): { biome: TerrainBiome; grip: number; roughness: number; camber: number; elevation: number } {
  const index = Math.floor(z / SEGMENT_LENGTH);
  const local = (z - index * SEGMENT_LENGTH) / SEGMENT_LENGTH;
  const a = getSegment(seed, index);
  const b = getSegment(seed, index + 1);
  return {
    biome: local < 0.5 ? a.biome : b.biome,
    grip: lerp(a.grip, b.grip, smooth(local)),
    roughness: lerp(a.roughness, b.roughness, smooth(local)),
    camber: lerp(a.camber, b.camber, smooth(local)),
    elevation: lerp(a.elevation, b.elevation, smooth(local))
  };
}

function getSegment(seed: string, index: number): RoadSegment {
  const key = `${seed}:${index}`;
  const cached = segmentCache.get(key);
  if (cached) {
    segmentCache.delete(key);
    segmentCache.set(key, cached);
    return cached;
  }
  const segment = createSegment(seed, index);
  segmentCache.set(key, segment);
  while (segmentCache.size > MAX_SEGMENT_CACHE_ENTRIES) segmentCache.delete(segmentCache.keys().next().value as string);
  return segment;
}

function createSegment(seed: string, index: number): RoadSegment {
  const biomeRoll = seededRandom(seed, index * 11);
  const biome: TerrainBiome = biomeRoll > 0.82 ? 'snow' : biomeRoll > 0.64 ? 'mud' : biomeRoll > 0.42 ? 'dirt' : 'asphalt';
  const gripMap = { asphalt: 1, dirt: 0.72, mud: 0.48, snow: 0.36 } satisfies Record<TerrainBiome, number>;
  const roughnessMap = { asphalt: 0.06, dirt: 0.24, mud: 0.42, snow: 0.32 } satisfies Record<TerrainBiome, number>;
  const camber = (seededRandom(seed, index * 19) - 0.5) * 0.12;
  const elevation = Math.sin(index * 0.42 + seededRandom(seed, 4) * 8) * 7;
  const curvature = (seededRandom(seed, index * 37) - 0.5) * 18;
  const points: RoadPoint[] = [];
  for (let p = 0; p < POINTS_PER_SEGMENT; p += 1) {
    const t = p / (POINTS_PER_SEGMENT - 1);
    points.push({ x: Math.sin(index * 0.7 + t * Math.PI) * curvature, y: elevation + Math.sin(t * Math.PI) * 2, z: index * SEGMENT_LENGTH + t * SEGMENT_LENGTH, camber });
  }
  return { index, biome, grip: gripMap[biome], roughness: roughnessMap[biome], camber, elevation, points };
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
