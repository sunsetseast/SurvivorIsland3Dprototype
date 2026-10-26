import type { Point } from "../world";

/** Metres. +X = map right, +Z = map bottom. Never rotate this owner-approved layout. */
export type Anchor = {
  id: string;
  position: [number, number, number];
  facing: number;
};
const anchor = (
  id: string,
  x: number,
  z: number,
  y = 0,
  facing = 0,
): Anchor => ({ id, position: [x, y, z], facing });
export const ARRIVAL: Point[] = [
  { x: -38, z: -43 },
  { x: -34, z: -37 },
  { x: -36, z: -30 },
  { x: -30.5, z: -25.5 },
  { x: -25, z: -21 },
  { x: -21, z: -20 },
  { x: -17, z: -16 },
  { x: -12, z: -13 },
  { x: -11, z: -8 },
];
export const VOTING_PATH: Point[] = [
  { x: -10, z: -7 },
  { x: -12, z: 3 },
  { x: -18, z: 8 },
  { x: -25, z: 8 },
  { x: -29, z: 12 },
  { x: -29, z: 17.5 },
  { x: -34, z: 17.5 },
];
// Screenshot 3: the open apron on the north/east SIDE of Jeff's terrace.
// The procession turns away from the snuff receiver before entering this route.
export const EXIT_ORIGIN: Point = { x: 10.8, z: 0.6 };
export const EXIT_PATH: Point[] = [
  EXIT_ORIGIN,
  { x: 16, z: -0.5 },
  { x: 21, z: 2.5 },
  { x: 27, z: 8 },
  { x: 32, z: 17 },
  { x: 38, z: 25 },
];
export const JURY_PATH: Point[] = [
  { x: -21, z: -20 },
  { x: -19.8, z: -19.5 },
  { x: -19.8, z: -17 },
  { x: -23, z: -17 },
  { x: -28, z: -15 },
  { x: -27, z: -9 },
  { x: -25, z: -7 },
  { x: -24, z: -4 },
  { x: -22.25, z: -4 },
];
export const PATHS = [ARRIVAL, VOTING_PATH, EXIT_PATH, JURY_PATH];
// Static warm bounce in remote circulation areas; no extra per-pixel point lights.
export const PATH_FILLS = [
  { ...VOTING_PATH[3]!, radius: 17, strength: 0.36 },
  { ...EXIT_PATH[2]!, radius: 18, strength: 0.32 },
];
// One source of truth for furniture, actors, lights, collision and cinematic targets.
export const COUNCIL = {
  aisleZ: -4.25,
  fireRadius: 1.7,
  podium: { x: 5.8, z: 3.25, y: 0.22, yaw: -2.62 },
  host: { x: 6.37, z: 4.25, y: 0.22 },
  urn: { x: 4.55, z: 4.1, y: 0.22 },
  snuff: { x: 8.25, z: 4.7, y: 0.22 },
  snuffMark: { x: 8.9, z: 3.55 },
};
export const TOWERS = [
  { kind: "prang", x: 1, z: -25, height: 23, radius: 4.2 },
  { kind: "prang", x: -10, z: -23.5, height: 14.5, radius: 2.6 },
  { kind: "chedi", x: 13, z: -27, height: 17, radius: 3.2 },
  { kind: "prang", x: -18, z: -33, height: 11, radius: 2.2 },
] as const;
export const TRIBAL = {
  id: "forgotten-island-sanctuary",
  version: 3,
  arrival: anchor("contestant-arrival", -38, -43, 0, -2.55),
  entrance: anchor("sanctuary-gateway", -17, -16),
  host: anchor(
    "host-standing",
    COUNCIL.host.x,
    COUNCIL.host.z,
    COUNCIL.host.y,
    COUNCIL.podium.yaw,
  ),
  urn: anchor("voting-urn", COUNCIL.urn.x, COUNCIL.urn.z, COUNCIL.urn.y),
  snuff: anchor(
    "torch-snuff",
    COUNCIL.snuff.x,
    COUNCIL.snuff.z,
    COUNCIL.snuff.y,
    COUNCIL.podium.yaw,
  ),
  juryEntrance: anchor("jury-entrance", -25, -7),
  votingApproach: anchor("voting-approach", -29, 12),
  vote: anchor("voting-interaction", -34, 17.3, 0.35, Math.PI),
  exitOrigin: anchor("elimination-exit-origin", EXIT_ORIGIN.x, EXIT_ORIGIN.z),
  exit: anchor("elimination-exit", EXIT_PATH.at(-1)!.x, EXIT_PATH.at(-1)!.z),
  fire: anchor("council-fire", 0, 0),
  // Owner-locked stagger: alternate forward/back along a broad curved formation.
  seats: Array.from({ length: 12 }, (_, i) => {
    const x = (i - 5.5) * 1.35,
      setback = i % 2 ? 0.8 : 0;
    const z = -5.9 - setback - 0.5 * (1 - (x / 8) ** 2);
    return anchor(
      `stump-${i + 1}`,
      x,
      z,
      0.6,
      Math.atan2(COUNCIL.host.x - x, COUNCIL.host.z - z),
    );
  }),
  jurors: Array.from({ length: 12 }, (_, i) => {
    const tier = Math.floor(i / 4),
      x = -17 - tier * 2.2,
      z = -5.8 + (i % 4) * 1.75;
    return anchor(
      `juror-${i + 1}`,
      x,
      z,
      0.75 + tier * 0.42 + 0.45,
      Math.PI / 2,
    );
  }),
  cameras: {
    reveal: { position: [-15, 3.2, -13], target: [0, 2, -2] },
    council: { position: [14, 6.5, 16], target: [-1, 6, -9] },
    contestants: { position: [5, 2.6, 1], target: [0, 1.1, -6.8] },
    jury: { position: [-8, 4, 6], target: [-20, 2, -3] },
    vote: { position: [-31.8, 2.2, 20.5], target: [-34, 1.5, 16.5] },
    host: { position: [1, 2.2, -3], target: [6.2, 1.8, 4] },
    sky: { position: [4, 3, 8], target: [1, 11, -24] },
    contestantEye: { position: [1.1, 1.55, -5.75], target: [6.2, 1.7, 4] },
    hostEye: { position: [6.12, 1.85, 3.83], target: [-0.6, 1.1, -6.8] },
    fireSide: { position: [-6, 2, 3], target: [3.4, 1.5, -1] },
    entrance: { position: [-32, 3.5, -28], target: [-24, 1.5, -21] },
    exitOrigin: { position: [16, 4.2, -8], target: [9.2, 1.2, 3.2] },
    lastWalk: { position: [21, 3.4, -4], target: [21, 1.3, 4] },
    votingApproach: { position: [-24, 3.3, 20], target: [-32, 2.3, 17] },
  },
};

export type Solid = {
  id: string;
  x: number;
  z: number;
  hx: number;
  hz: number;
  yaw?: number;
  height?: number;
};
export const STRUCTURES: Solid[] = [
  { id: "backdrop", x: 0, z: -18.6, hx: 14, hz: 0.65 },
  ...TOWERS.map((t) => ({
    id: `tower-${t.x}`,
    x: t.x,
    z: t.z,
    hx: t.radius * 1.2,
    hz: t.radius * 1.2,
  })),
  { id: "backdrop-east", x: 14.8, z: -13.2, hx: 1.1, hz: 5.8 },
  { id: "arrival-gate-west", x: -19.2, z: -14.5, hx: 0.85, hz: 0.85 },
  { id: "arrival-gate-east", x: -14.8, z: -17.5, hx: 0.85, hz: 0.85 },
  { id: "booth-back", x: -34, z: 14.5, hx: 3.7, hz: 0.45 },
  { id: "booth-west", x: -37.3, z: 18, hx: 0.45, hz: 3.1 },
  { id: "booth-east-front", x: -30.7, z: 19.6, hx: 0.45, hz: 1.5 },
  { id: "booth-privacy-return", x: -30.7, z: 15.6, hx: 0.45, hz: 1.1 },
  { id: "writing-table", x: -34, z: 16, hx: 1.55, hz: 0.55 },
  // Guardian footprint includes trunk, plinth and ears; scenery is physical.
  {
    id: "guardian-west",
    x: -10.3,
    z: -16.3,
    hx: 1.55,
    hz: 2.6,
    height: 3.4,
    yaw: Math.PI + 0.35,
  },
  {
    id: "guardian-east",
    x: 12,
    z: -15.5,
    hx: 1.55,
    hz: 2.6,
    height: 3.4,
    yaw: Math.PI - 0.35,
  },
  {
    id: "host-person",
    x: COUNCIL.host.x,
    z: COUNCIL.host.z,
    hx: 0.24,
    hz: 0.24,
  },
  {
    id: "host-podium",
    x: COUNCIL.podium.x,
    z: COUNCIL.podium.z,
    hx: 0.8,
    hz: 0.46,
    yaw: COUNCIL.podium.yaw,
  },
  {
    id: "urn-pedestal",
    x: COUNCIL.urn.x,
    z: COUNCIL.urn.z,
    hx: 0.43,
    hz: 0.43,
  },
  {
    id: "snuff-receiver",
    x: COUNCIL.snuff.x,
    z: COUNCIL.snuff.z,
    hx: 0.4,
    hz: 0.4,
  },
  { id: "exit-gate-left", x: 19.68, z: 4.7, hx: 0.65, hz: 0.65 },
  { id: "exit-gate-right", x: 22.32, z: 0.3, hx: 0.65, hz: 0.65 },
  ...ARRIVAL.slice(1, 6).flatMap((_, i) =>
    [-1, 1].flatMap((side) => {
      if (i === 4 && side === 1) return [];
      const a = offsetPath(ARRIVAL, i + 1, side * 1.65),
        b = offsetPath(ARRIVAL, i + 2, side * 1.65);
      const dx = b.x - a.x,
        dz = b.z - a.z,
        len = Math.hypot(dx, dz),
        n = Math.ceil(len / 0.7);
      return Array.from({ length: n }, (_, j) => ({
        id: `approach-rail-${i}-${j}-${side}`,
        x: a.x + (dx * (j + 0.5)) / n,
        z: a.z + (dz * (j + 0.5)) / n,
        hx: len / n / 2 + 0.02,
        hz: 0.12,
        yaw: Math.atan2(-dz, dx),
      }));
    }),
  ),
  ...TRIBAL.seats.map((s) => ({
    id: s.id,
    x: s.position[0],
    z: s.position[2],
    hx: 0.53,
    hz: 0.53,
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `jury-bench-${i}`,
    x: -17 - i * 2.2,
    z: -3.2,
    hx: 0.32,
    hz: 3.6,
  })),
  { id: "jury-rear-rail-north", x: -23.1, z: -6.1, hx: 0.12, hz: 0.9 },
  { id: "jury-rear-rail-south", x: -23.1, z: -0.9, hx: 0.12, hz: 1.9 },
  { id: "jury-column-north", x: -23.5, z: -8.5, hx: 0.9, hz: 0.9, height: 5.7 },
  { id: "jury-column-south", x: -23.5, z: 2.5, hx: 0.9, hz: 0.9, height: 5.7 },
  { id: "jury-north-rail", x: -19.5, z: -7.2, hx: 3.7, hz: 0.12 },
];

export function segmentDistance(x: number, z: number, a: Point, b: Point) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = Math.max(
    0,
    Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)),
  );
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
}
export function pathDistance(path: Point[], x: number, z: number) {
  return Math.min(
    ...path.slice(1).map((b, i) => segmentDistance(x, z, path[i]!, b)),
  );
}
/** Reserved 2.2m processional corridor, including camera/body allowance.
 * Pass the entire horizontal footprint (leaves, roots, flame baskets), not a prop's centre. */
export function corridorClear(x: number, z: number, footprint = 0) {
  return trailDistance(x, z) >= 1.1 + footprint;
}
export function offsetPath(
  path: Point[],
  index: number,
  offset: number,
): Point {
  const p = path[index]!,
    a = path[Math.max(0, index - 1)]!,
    b = path[Math.min(path.length - 1, index + 1)]!;
  const l1 = Math.hypot(p.x - a.x, p.z - a.z) || 1,
    l2 = Math.hypot(b.x - p.x, b.z - p.z) || 1;
  let n1 = { x: -(p.z - a.z) / l1, z: (p.x - a.x) / l1 },
    n2 = { x: -(b.z - p.z) / l2, z: (b.x - p.x) / l2 };
  if (index === 0) n1 = n2;
  if (index === path.length - 1) n2 = n1;
  const len = Math.hypot(n1.x + n2.x, n1.z + n2.z) || 1;
  const nx = (n1.x + n2.x) / len,
    nz = (n1.z + n2.z) / len;
  const m = offset / Math.max(0.5, nx * n2.x + nz * n2.z);
  return { x: p.x + nx * m, z: p.z + nz * m };
}
export function trailDistance(x: number, z: number) {
  let d = Infinity;
  for (const path of PATHS)
    for (let i = 1; i < path.length; i++)
      d = Math.min(d, segmentDistance(x, z, path[i - 1]!, path[i]!));
  return d;
}
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
function terrainHeight(x: number, z: number) {
  // Walkable gallery tiers; 1.6m connecting grades flank the visible stone risers.
  if (x > -24 && x < -13 && z > -8 && z < 3.8) {
    const edge =
      clamp((x + 24) / 1.3) * clamp((3.8 - z) / 1.6) * clamp((z + 8) / 0.8);
    return (
      edge * (0.75 + clamp((-x - 17) / 2.2, 0, 2) * 0.42) * clamp((-x - 13) / 2)
    );
  }
  if (x > 3 && x < 10 && z > 1 && z < 7)
    return (
      0.22 *
      Math.min(
        clamp((x - 3) / 1),
        clamp((10 - x) / 1),
        clamp((z - 1) / 1),
        clamp((7 - z) / 1),
      )
    );
  if (x > -38 && x < -30 && z > 14 && z < 22)
    return (
      0.35 *
      Math.min(
        clamp((x + 38) / 1),
        clamp((-30 - x) / 1),
        clamp((z - 14) / 1),
        clamp((22 - z) / 1),
      )
    );
  // A real descent from the jungle ridge into the sanctuary. Raised forest banks
  // frame the winding approach; the ceremonial floor stays level for future staging.
  const rim = clamp((Math.hypot(x, z) - 21) / 12);
  const approach = clamp((-z - 15) / 28) * 2.8;
  const bank = clamp((trailDistance(x, z) - 2.8) / 4) * rim;
  const rolling =
    2.5 + Math.sin(x * 0.13 + z * 0.08) * 1.2 + Math.sin(z * 0.22) * 0.6;
  return (
    rim * approach +
    bank * rolling +
    rim * 0.08 * Math.sin(x * 0.32) * Math.sin(z * 0.24)
  );
}

/** The approach mesh and grounding both sample these exact tread and bridge profiles. */
export function approachSurface(x: number, z: number) {
  let best = { distance: Infinity, height: 0, segment: -1, t: 0 };
  for (let i = 1; i < 6; i++) {
    const a = ARRIVAL[i]!,
      b = ARRIVAL[i + 1]!;
    const dx = b.x - a.x,
      dz = b.z - a.z,
      len2 = dx * dx + dz * dz;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / len2);
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    let height: number;
    if (i === 1) height = 2.2 - t * 0.4;
    else if (i === 2) height = 1.8 - Math.min(6, Math.floor(t * 6)) * 0.1;
    else if (i === 3) height = 1.2 - Math.min(6, Math.floor(t * 6)) * 0.1;
    else if (i === 4)
      height = 0.6; // Actual bridge deck over the drainage channel.
    else height = 0.6 * (1 - t);
    if (d < best.distance) best = { distance: d, height, segment: i, t };
  }
  return best;
}
export function drainageBed(x: number, z: number) {
  const a = ARRIVAL[4]!,
    b = ARRIVAL[5]!,
    dx = b.x - a.x,
    dz = b.z - a.z,
    len = Math.hypot(dx, dz);
  const px = x - (a.x + b.x) / 2,
    pz = z - (a.z + b.z) / 2;
  const along = (px * dx + pz * dz) / len,
    across = (-px * dz + pz * dx) / len;
  const weight =
    clamp((1.5 - Math.abs(along)) / 0.55) * clamp((4 - Math.abs(across)) / 0.8);
  const base = terrainHeight(x, z);
  return { height: base - (base + 0.23) * weight, weight, across };
}
export function tribalHeight(x: number, z: number) {
  const a = approachSurface(x, z),
    base = terrainHeight(x, z);
  const bed = drainageBed(x, z);
  if (bed.weight > 0 && Math.abs(bed.across) > 1.65) return bed.height;
  const blend = clamp((2.7 - a.distance) / 1.2);
  return base + (a.height - base) * blend;
}
export function occupiedSeats(count: number) {
  const n = Math.max(0, Math.min(12, Math.floor(count)));
  const start = Math.floor((12 - n) / 2);
  return TRIBAL.seats.slice(start, start + n);
}

// Deterministic foliage; the SAME trunk positions feed collision and rendering.
export const TREES = Array.from({ length: 150 }, (_, i) => {
  const a = i * 2.39996323,
    r = 24 + ((i * 13.7) % 32);
  return {
    x: Math.cos(a) * r - 3,
    z: Math.sin(a) * r - 2,
    size: 0.7 + ((i * 0.371) % 1.2),
    seed: i,
  };
}).filter(
  (t) =>
    corridorClear(t.x, t.z, Math.max(2.7, t.size * 0.8)) &&
    !(t.z < -18 && t.z > -38 && Math.abs(t.x) < 21) &&
    !(t.x < -29 && t.x > -39 && t.z > 12 && t.z < 24) &&
    !(t.x < -12 && t.x > -29 && t.z > -10 && t.z < 6),
);
export type Practical = Point & { id: string; height: number; radius: number };
// Canonical practicals feed geometry, flames, movement and camera collision.
const candidates: Practical[] = [
  ...[0, 2, 4, 6, 8].map((i) => ({
    ...offsetPath(ARRIVAL, i, i < 6 ? -2.3 : 2.1),
    id: `arrival-torch-${i}`,
    height: 2.35,
    radius: 0.26,
  })),
  ...[1, 2, 3, 4].map((i) => ({
    ...offsetPath(VOTING_PATH, i, -2.1),
    id: `vote-torch-${i}`,
    height: 2.3,
    radius: 0.26,
  })),
  ...[1, 2, 3, 4].map((i) => ({
    ...offsetPath(EXIT_PATH, i, -2.2),
    id: `exit-torch-${i}`,
    height: 2.3,
    radius: 0.26,
  })),
  { id: "jury-torch", x: -15.4, z: -7.5, height: 2.8, radius: 0.26 },
  { id: "writing-torch", x: -36.5, z: 16.1, height: 2.05, radius: 0.26 },
  ...TRIBAL.seats.map((s, i) => ({
    id: `personal-torch-${i}`,
    x: s.position[0],
    z: -9.65 - (i % 2) * 0.15,
    height: 2.15,
    radius: 0.21,
  })),
];
export const PRACTICALS = candidates.filter(
  (p) =>
    corridorClear(p.x, p.z, p.radius) &&
    !STRUCTURES.some((b) => solidDistance(p.x, p.z, b) < p.radius + 0.08),
);
export const SOLIDS: Solid[] = [
  ...PRACTICALS.map((p) => ({
    id: p.id,
    x: p.x,
    z: p.z,
    hx: 0.12,
    hz: 0.12,
    height: p.height + 0.6,
  })),
  ...STRUCTURES,
  ...TREES.map((t) => ({
    id: `tree-${t.seed}`,
    x: t.x,
    z: t.z,
    hx: 0.48 * t.size,
    hz: 0.48 * t.size,
  })),
];
export function tribalBlocked(x: number, z: number, radius = 0.36) {
  if (
    x < -48 ||
    x > 45 ||
    z < -49 ||
    z > 35 ||
    Math.hypot(x, z) < COUNCIL.fireRadius + radius
  )
    return true;
  return SOLIDS.some((b) => solidDistance(x, z, b) < radius);
}
export function solidDistance(x: number, z: number, b: Solid) {
  const c = Math.cos(b.yaw || 0),
    s = Math.sin(b.yaw || 0),
    dx = x - b.x,
    dz = z - b.z;
  return Math.hypot(
    Math.max(0, Math.abs(dx * c - dz * s) - b.hx),
    Math.max(0, Math.abs(dx * s + dz * c) - b.hz),
  );
}
export function moveTribal(p: Point, dx: number, dz: number): Point {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  let { x, z } = p;
  for (let i = 0; i < steps; i++) {
    if (!tribalBlocked(x + dx / steps, z)) x += dx / steps;
    if (!tribalBlocked(x, z + dz / steps)) z += dz / steps;
  }
  return { x, z };
}
export function tribalLocation(x: number, z: number) {
  if (x < -29 && z > 13) return "The Voting Chamber";
  if (z < -18) return "The Torchlit Approach";
  if (x < -13 && z < 4 && z > -10) return "The Jury Gallery";
  if (pathDistance(EXIT_PATH, x, z) < 2.5 && x > 10) return "The Last Walk";
  if (x > 3 && x < 11 && z > 1) return "The Host Terrace";
  if (z < -5 && z > -10 && x > -10 && x < 10) return "Contestant Stumps";
  if (x < -17 && z > 5) return "The Private Passage";
  return "Tribal Council";
}
export const tribalWorld = {
  spawn: { x: TRIBAL.arrival.position[0], z: TRIBAL.arrival.position[2] },
  yaw: TRIBAL.arrival.facing,
  height: tribalHeight,
  move: moveTribal,
  location: tribalLocation,
};
