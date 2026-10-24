/**
 * Standalone exploration model. Coordinates are provisional PR362 anchors,
 * not approved geography. No connection to Survivor simulation or saves.
 * +X east, +Z south. One unit is approximately one metre.
 */
export type Point = { x: number; z: number };
export type Collider = Point & { hx: number; hz: number; kind: string };
export const BOUNDS = { minX: -56, maxX: 34, minZ: -60, maxZ: 34 };
export const LANDMARKS = {
  beach: { x: -47, z: -27 },
  campfire: { x: -9, z: -31 },
  shelter: { x: 12, z: -44 },
  well: { x: -34, z: 8 },
} satisfies Record<string, Point>;
export const SPAWN: Point = { x: -6, z: -24 };
export const PATH: Point[] = [
  LANDMARKS.beach, { x: -25, z: -27 }, LANDMARKS.campfire,
  { x: 5, z: -32 }, { x: 12, z: -33 }, { x: 12, z: -12 },
  { x: 18, z: -1 }, { x: 9, z: 15 }, { x: -6, z: 26 },
  { x: -17, z: 20 }, { x: -25, z: 11 }, LANDMARKS.well,
];
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
export function baseHeight(x: number, z: number): number {
  return 0.12 + smooth((x + 55) / 36) * 0.55
    + smooth((z + 17) / 34) * 0.35;
}
export function groundHeight(x: number, z: number): number {
  if (x >= 7 && x <= 17 && z >= -48 && z <= -40) return 1.8;
  if (x >= 10 && x <= 14 && z > -40 && z <= -33) {
    const t = (-33 - z) / 7;
    return baseHeight(x, -33) * (1 - t) + 1.8 * t;
  }
  return baseHeight(x, z);
}
function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}
function reserved(p: Point): boolean {
  if (Math.hypot(p.x + 9, p.z + 31) < 12) return true;
  if (p.x > 2 && p.x < 23 && p.z < -27 && p.z > -55) return true;
  if (Math.hypot(p.x + 34, p.z - 8) < 7) return true;
  return PATH.some((a, i) => i > 0 && segmentDistance(p, PATH[i - 1]!, a) < 4);
}
let seed = 36225;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function scatter(count: number, minX: number, maxX: number) {
  const result: (Point & { scale: number; lean: number; rotation: number })[] = [];
  for (let tries = 0; result.length < count && tries < 5000; tries++) {
    const p = { x: minX + random() * (maxX - minX), z: -57 + random() * 87 };
    if (reserved(p) || result.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 3.5)) continue;
    result.push({ ...p, scale: 0.8 + random() * 0.55, lean: (random() - 0.5) * 0.2, rotation: random() * Math.PI * 2 });
  }
  return result;
}
export const PALMS = scatter(38, -49, 31);
export const BAMBOO = scatter(24, -30, 32);
export const ROCKS = scatter(20, -51, 32).map(p => ({ ...p, scale: p.scale * 1.3 }));
export const SEATING_LOGS: Collider[] = [
  { x: -9, z: -35, hx: 2.5, hz: 0.45, kind: 'log' },
  { x: -13, z: -30, hx: 0.45, hz: 2.5, kind: 'log' },
  { x: -5, z: -30, hx: 0.45, hz: 2.5, kind: 'log' },
];
export const COLLIDERS: Collider[] = [
  ...PALMS.map(p => ({ ...p, hx: 0.32 * p.scale, hz: 0.32 * p.scale, kind: 'palm' })),
  ...BAMBOO.map(p => ({ ...p, hx: 0.55 * p.scale, hz: 0.55 * p.scale, kind: 'bamboo' })),
  ...ROCKS.map(p => ({ ...p, hx: p.scale, hz: p.scale * 0.8, kind: 'rock' })),
  ...SEATING_LOGS,
  { ...LANDMARKS.campfire, hx: 1.25, hz: 1.25, kind: 'fire' },
  { ...LANDMARKS.well, hx: 1.5, hz: 1.5, kind: 'well' },
  { x: 16, z: -41, hx: 0.55, hz: 0.45, kind: 'crate' },
  ...[7.3, 16.7].flatMap(x => [-47.7, -40.3].map(z => ({ x, z, hx: 0.22, hz: 0.22, kind: 'post' }))),
];
export const PLAYER_RADIUS = 0.36;
export function isWalkable(x: number, z: number): boolean {
  const r = PLAYER_RADIUS;
  if (x < BOUNDS.minX + r || x > BOUNDS.maxX - r || z < BOUNDS.minZ + r || z > BOUNDS.maxZ - r) return false;
  return !COLLIDERS.some(c => Math.abs(x - c.x) < c.hx + r && Math.abs(z - c.z) < c.hz + r);
}
/** Substeps prevent tunnelling; axis sliding avoids sticking to obstacle edges. */
export function movePlayer(pos: Point, dx: number, dz: number): Point {
  if (![pos.x, pos.z, dx, dz].every(Number.isFinite)) return { ...SPAWN };
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  // Caller caps frame delta. Bound pathological inputs without blocking Safari.
  if (steps > 1000) return { ...pos };
  let { x, z } = pos;
  const canStep = (nx: number, nz: number) => isWalkable(nx, nz) && Math.abs(groundHeight(nx, nz) - groundHeight(x, z)) < 0.22;
  for (let i = 0; i < steps; i++) {
    const nx = x + dx / steps;
    if (canStep(nx, z)) x = nx;
    const nz = z + dz / steps;
    if (canStep(x, nz)) z = nz;
  }
  return { x, z };
}
export function locationAt(x: number, z: number): string {
  if (x >= 7 && x <= 17 && z >= -48 && z < -33) return 'Thatched shelter';
  if (Math.hypot(x + 34, z - 8) < 7) return 'Water well';
  if (x < -35 && z < -10) return 'West beach';
  if (Math.hypot(x + 9, z + 31) < 15) return 'Campfire clearing';
  return z > -15 ? 'Jungle footpath' : 'Jungle clearing';
}
