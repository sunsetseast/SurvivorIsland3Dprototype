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
  { x: -29, z: -25 },
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
export const EXIT_PATH: Point[] = [
  { x: 9, z: 6.5 },
  { x: 16, z: 8 },
  { x: 21, z: 12 },
  { x: 27, z: 14 },
  { x: 31, z: 21 },
  { x: 38, z: 25 },
];
export const JURY_PATH: Point[] = [
  { x: -25, z: -21 },
  { x: -28, z: -15 },
  { x: -27, z: -9 },
  { x: -25, z: -7 },
  { x: -24, z: -4 },
  { x: -22.25, z: -4 },
];
export const PATHS = [ARRIVAL, VOTING_PATH, EXIT_PATH, JURY_PATH];
export const TRIBAL = {
  id: "forgotten-island-sanctuary",
  version: 1,
  arrival: anchor("contestant-arrival", -38, -43, 0, -2.55),
  entrance: anchor("sanctuary-gateway", -17, -16),
  host: anchor("host-seat", 11.5, 4.8, 0.5, -2.25),
  urn: anchor("voting-urn", 9.1, 4.2, 0.5),
  snuff: anchor("torch-snuff", 13.1, 6.9, 0.5, -2.25),
  juryEntrance: anchor("jury-entrance", -25, -7),
  votingApproach: anchor("voting-approach", -29, 12),
  vote: anchor("voting-interaction", -34, 18, 0.35, Math.PI),
  exit: anchor("elimination-exit", 38, 25),
  fire: anchor("council-fire", 0, 0),
  // Owner-locked stagger: alternate forward/back along a broad curved formation.
  seats: Array.from({ length: 12 }, (_, i) => {
    const x = (i - 5.5) * 1.65,
      setback = i % 2 ? 2.25 : 0;
    const z = -9.5 - setback - 1.1 * (1 - (x / 10) ** 2);
    return anchor(`stump-${i + 1}`, x, z, 0.6, Math.atan2(11.5 - x, 4.8 - z));
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
    reveal: { position: [-15, 4.2, -13] as const, target: [1, 2, 0] as const },
    council: { position: [18, 10, 24] as const, target: [-2, 3, -6] as const },
    contestants: {
      position: [4, 3.4, -4] as const,
      target: [0, 1.1, -12] as const,
    },
    jury: { position: [-8, 4, 6] as const, target: [-20, 2, -3] as const },
    vote: {
      position: [-31.8, 2.7, 20.5] as const,
      target: [-34, 1.5, 16.5] as const,
    },
    host: { position: [4, 3.4, 13] as const, target: [12, 2, 5] as const },
    sky: { position: [4, 4, 15] as const, target: [0, 10, -15] as const },
  },
};

export type Solid = {
  id: string;
  x: number;
  z: number;
  hx: number;
  hz: number;
  yaw?: number;
};
export const STRUCTURES: Solid[] = [
  { id: "backdrop", x: 0, z: -18.6, hx: 14, hz: 1.4 },
  { id: "backdrop-east", x: 14.8, z: -13.2, hx: 1.1, hz: 5.8 },
  { id: "arrival-gate-west", x: -19.2, z: -14.5, hx: 0.85, hz: 0.85 },
  { id: "arrival-gate-east", x: -14.8, z: -17.5, hx: 0.85, hz: 0.85 },
  { id: "booth-back", x: -34, z: 14.5, hx: 3.7, hz: 0.45 },
  { id: "booth-west", x: -37.3, z: 18, hx: 0.45, hz: 3.1 },
  { id: "booth-east-front", x: -30.7, z: 19.6, hx: 0.45, hz: 1.5 },
  { id: "booth-privacy-return", x: -30.7, z: 15.6, hx: 0.45, hz: 1.1 },
  { id: "writing-table", x: -34, z: 16, hx: 1.55, hz: 0.55 },
  { id: "privacy-wall", x: -24, z: 11.5, hx: 3.3, hz: 0.5 },
  { id: "privacy-wall-west", x: -30, z: 8.1, hx: 0.6, hz: 2.4 },
  { id: "host-person", x: 12.5, z: 6.3, hx: 0.25, hz: 0.25 },
  { id: "host-seat", x: 11.5, z: 4.8, hx: 0.55, hz: 0.55 },
  { id: "urn-pedestal", x: 9.1, z: 4.2, hx: 0.5, hz: 0.5 },
  { id: "exit-gate-left", x: 18.1, z: 13, hx: 0.7, hz: 0.7 },
  { id: "exit-gate-right", x: 21.9, z: 9, hx: 0.7, hz: 0.7 },
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
export function trailDistance(x: number, z: number) {
  let d = Infinity;
  for (const path of PATHS)
    for (let i = 1; i < path.length; i++)
      d = Math.min(d, segmentDistance(x, z, path[i - 1]!, path[i]!));
  return d;
}
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export function tribalHeight(x: number, z: number) {
  // Walkable gallery tiers; 1.6m connecting grades flank the visible stone risers.
  if (x > -24 && x < -13 && z > -8 && z < 3.8) {
    const edge =
      clamp((x + 24) / 1.3) * clamp((3.8 - z) / 1.6) * clamp((z + 8) / 0.8);
    return (
      edge * (0.75 + clamp((-x - 17) / 2.2, 0, 2) * 0.42) * clamp((-x - 13) / 2)
    );
  }
  if (x > 6 && x < 16 && z > 1 && z < 9)
    return (
      0.5 *
      Math.min(
        clamp((x - 6) / 2),
        clamp((16 - x) / 2),
        clamp((z - 1) / 2),
        clamp((9 - z) / 2),
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
    trailDistance(t.x, t.z) > 3.6 &&
    !(t.x < -29 && t.x > -39 && t.z > 12 && t.z < 24) &&
    !(t.x < -12 && t.x > -29 && t.z > -10 && t.z < 6),
);
export const SOLIDS: Solid[] = [
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
  if (x < -48 || x > 45 || z < -49 || z > 35 || Math.hypot(x, z) < 2.5 + radius)
    return true;
  return SOLIDS.some((b) => {
    const c = Math.cos(b.yaw || 0),
      s = Math.sin(b.yaw || 0),
      dx = x - b.x,
      dz = z - b.z;
    const lx = dx * c - dz * s,
      lz = dx * s + dz * c;
    return (
      Math.hypot(
        Math.max(0, Math.abs(lx) - b.hx),
        Math.max(0, Math.abs(lz) - b.hz),
      ) < radius
    );
  });
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
  if (x > 21) return "The Last Walk";
  if (x > 6 && z > 1) return "The Host Terrace";
  if (z < -8 && x > -12) return "Contestant Stumps";
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
