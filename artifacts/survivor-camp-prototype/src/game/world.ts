import {
  CAMP_EXTENT,
  TRAILS,
  SPRING,
  NATURAL_LANDMARKS,
  FEATURE_SOLIDS,
  ROOT_SOLIDS,
  territoryDistance,
  cliffSolid,
} from "./environment/geography";
/**
 * Authored Tonsai territory, shared by rendering, movement, NPC navigation and map.
 * Coast/headland relationships are source-informed; local metre detail is fictional.
 * +X east, +Z south, ocean to the west. One unit is about one metre.
 */
export type Point = { x: number; z: number };
export type Collider = Point & { hx: number; hz: number; kind: string };
export type Veg = Point & {
  scale: number;
  lean: number;
  rotation: number;
  variant: number;
};
export type Waypoint = Point & { name?: string };

export const BOUNDS = CAMP_EXTENT;
export const LANDMARKS = {
  beach: { x: -47, z: -27 },
  campfire: { x: -9, z: -31 },
  shelter: { x: 12, z: -44 },
  well: SPRING,
} satisfies Record<string, Point>;
export const SPAWN: Point = { x: -6, z: -24 };
/** Shelter geometry shared by collision, ground height and visuals. */
export const SHELTER = {
  deck: { x0: 7, x1: 17, z0: -48, z1: -40, y: 1.8 },
  ramp: { x0: 10, x1: 14, z0: -40, z1: -33 },
  eave: 3.9,
  ridge: 7.0,
};
export const PLAYER_RADIUS = 0.36;

export const clamp = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));
export const smooth = (n: number) => {
  const t = clamp(n, 0, 1);
  return t * t * (3 - 2 * t);
};
export const smoothstep = (a: number, b: number, x: number) =>
  smooth((x - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function h2(ix: number, iz: number) {
  const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
export function noise2(x: number, z: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = x - ix,
    fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx),
    uz = fz * fz * (3 - 2 * fz);
  const a = h2(ix, iz),
    b = h2(ix + 1, iz),
    c = h2(ix, iz + 1),
    d = h2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/** Irregular waterline (height 0 contour). */
export function shorelineX(z: number): number {
  return (
    -55.5 +
    Math.max(0, z - 25) * 0.2 +
    2.6 * Math.sin(z * 0.07 + 0.6) +
    1.4 * Math.sin(z * 0.17 + 2.0) +
    0.7 * Math.sin(z * 0.41 + 0.3)
  );
}

function raw(x: number, z: number): number {
  const d = x - shorelineX(z);
  let h =
    d < 0
      ? d * 0.15 + d * Math.abs(d) * 0.006
      : 0.04 * Math.min(d, 8) + smooth((d - 6) / 44) * 0.8;
  h += smooth(d / 14) * smooth((z + 17) / 34) * 0.32;
  const land = smoothstep(4, 16, d);
  h +=
    land * (noise2(x * 0.045, z * 0.045) - 0.5) * 1.1 +
    land * (noise2(x * 0.13 + 9, z * 0.13) - 0.5) * 0.35;
  h +=
    smoothstep(26, 122, x) * 8 +
    smoothstep(20, 100, z) * smoothstep(-25, 60, x) * 2.5;
  h +=
    smoothstep(-58, -72, z) *
    (6 + noise2(x * 0.09 + 4, z * 0.09) * 3) *
    smoothstep(-52, -40, x + 12);
  h +=
    (1 - smoothstep(-3, 7, territoryDistance(x, z))) *
    smoothstep(18, 35, d) *
    8;
  h -= 0.8 * Math.exp(-(((x - 89) / 3.4) ** 2) - ((z - 1) / 2) ** 2);
  return h;
}
const PADS = [
  { ...LANDMARKS.campfire, r: 6, f: 5, h: 0 },
  { ...LANDMARKS.well, r: 3.8, f: 4, h: 0 },
  { ...LANDMARKS.beach, r: 3, f: 5, h: 0 },
];
PADS.forEach((p) => {
  p.h = raw(p.x, p.z);
});
const SHELTER_PAD = raw(12, -38);

export function baseHeight(x: number, z: number): number {
  let h = raw(x, z);
  for (const p of PADS) {
    const m = 1 - smoothstep(p.r, p.r + p.f, Math.hypot(x - p.x, z - p.z));
    if (m > 0) h = lerp(h, p.h, m);
  }
  const dx = Math.max(5 - x, 0, x - 19),
    dz = Math.max(-50 - z, 0, z + 31);
  const m = 1 - smoothstep(0, 6, Math.hypot(dx, dz));
  if (m > 0) h = lerp(h, SHELTER_PAD, m);
  return h;
}
export function groundHeight(x: number, z: number): number {
  const { deck, ramp } = SHELTER;
  if (x >= deck.x0 && x <= deck.x1 && z >= deck.z0 && z <= deck.z1)
    return deck.y;
  if (x >= ramp.x0 && x <= ramp.x1 && z > ramp.z0 && z <= ramp.z1) {
    const t = (-33 - z) / 7;
    return baseHeight(x, -33) * (1 - t) + deck.y * t;
  }
  return baseHeight(x, z);
}

/* ---------- Path network ---------- */
export const WAYPOINTS: Waypoint[] = TRAILS[0]!.points;
export const PATH: Point[] = WAYPOINTS;
export { TRAILS };
const SPURS: Point[][] = [[SPAWN, { x: -9, z: -28.4 }]];

type Seg = {
  width: number;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
};
const SEGS: Seg[] = [];
[...TRAILS, ...SPURS.map((points) => ({ points, width: 2.4 }))].forEach(
  ({ points: pts, width }) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!,
        b = pts[i]!;
      SEGS.push({
        width,
        ax: a.x,
        az: a.z,
        bx: b.x,
        bz: b.z,
        x0: Math.min(a.x, b.x),
        x1: Math.max(a.x, b.x),
        z0: Math.min(a.z, b.z),
        z1: Math.max(a.z, b.z),
      });
    }
  },
);
export function pathDistance(x: number, z: number, cut = Infinity): number {
  let best = cut;
  for (const s of SEGS) {
    if (
      x < s.x0 - best ||
      x > s.x1 + best ||
      z < s.z0 - best ||
      z > s.z1 + best
    )
      continue;
    const dx = s.bx - s.ax,
      dz = s.bz - s.az;
    const t = clamp(
      ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz || 1),
      0,
      1,
    );
    const d = Math.hypot(x - s.ax - dx * t, z - s.az - dz * t);
    if (d < best) best = d;
  }
  return best;
}
/** Variable-width wear, shared by the material mask and authored trail data. */
export function trailWear(x: number, z: number) {
  let wear = 0;
  for (const s of SEGS) {
    if (x < s.x0 - 3 || x > s.x1 + 3 || z < s.z0 - 3 || z > s.z1 + 3) continue;
    const dx = s.bx - s.ax,
      dz = s.bz - s.az,
      t = clamp(
        ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz || 1),
        0,
        1,
      ),
      d = Math.hypot(x - s.ax - dx * t, z - s.az - dz * t),
      w = s.width * (1 + 0.1 * Math.sin(x * 0.3 + z * 0.2));
    wear = Math.max(wear, 1 - smoothstep(w * 0.33, w * 0.72, d));
  }
  return wear;
}
function segDist(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = clamp(
    ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1),
    0,
    1,
  );
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}

/* ---------- Props (shared with visuals) ---------- */
export const PROPS = {
  canoe: { x: -49.6, z: -32, yaw: 0.12 },
  driftwood: { x: -45, z: -35.2 },
  totem: { x: -44.2, z: -21.5 },
  crates: { x: -6.2, z: -36.6 },
  basket: { x: -11.4, z: -36.2 },
  spit: [
    { x: -10.8, z: -31 },
    { x: -7.2, z: -31 },
  ],
  rack: [
    { x: 4, z: -37.2 },
    { x: 4, z: -42 },
  ],
  barrel: { x: 8.3, z: -35.3 },
  trough: { x: SPRING.x - 3.2, z: SPRING.z + 2.6 },
  signs: [
    { text: "West Beach", x: -43, z: -29.5, yaw: 0.5 },
    { text: "Campfire", x: -14.5, z: -24.6, yaw: 0.2 },
    { text: "Shelter", x: 6.5, z: -29.4, yaw: -0.3 },
    { text: "Freshwater", x: 28, z: -21, yaw: 0.6 },
  ],
};
export const SEATING_LOGS: (Collider & { len: number; yaw: number })[] = [
  { x: -9, z: -35.2, hx: 1.7, hz: 0.42, kind: "log", len: 3.4, yaw: 0 },
  {
    x: -13.4,
    z: -30.3,
    hx: 0.42,
    hz: 1.3,
    kind: "log",
    len: 2.6,
    yaw: Math.PI / 2,
  },
  {
    x: -4.7,
    z: -31.4,
    hx: 0.42,
    hz: 1.2,
    kind: "log",
    len: 2.4,
    yaw: Math.PI / 2,
  },
];

/* ---------- Vegetation ---------- */
const fire = LANDMARKS.campfire,
  wellP = LANDMARKS.well,
  beachP = LANDMARKS.beach;
const SIGHT: [Point, Point][] = [
  [SPAWN, fire],
  [fire, { x: 12, z: -33 }],
  [beachP, fire],
  [SPAWN, { x: 12, z: -38 }],
  [SPAWN, { x: -14, z: -14 }],
  [fire, { x: 12, z: -42 }],
];
function structureFree(x: number, z: number, m: number) {
  if (NATURAL_LANDMARKS.some((l) => Math.hypot(x - l.x, z - l.z) < 8 + m))
    return false;
  if (Math.hypot(x - fire.x, z - fire.z) < 8 + m) return false;
  if (x > 1.5 - m && x < 22.5 + m && z > -55 - m && z < -29.5 + m) return false;
  if (Math.hypot(x - wellP.x, z - wellP.z) < 6.5 + m) return false;
  if (Math.hypot(x - beachP.x, z - beachP.z) < 5) return false;
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 12) return false;
  if (Math.hypot(x - PROPS.canoe.x, z - PROPS.canoe.z) < 4.5) return false;
  if (Math.hypot(x - PROPS.driftwood.x, z - PROPS.driftwood.z) < 3)
    return false;
  if (Math.hypot(x - PROPS.totem.x, z - PROPS.totem.z) < 3) return false;
  return true;
}
function treeOk(x: number, z: number, m = 0) {
  if (x < shorelineX(z) + 6 || cliffSolid(x, z)) return false;
  if (pathDistance(x, z, 3.2 + m) < 3.1 + m) return false;
  if (!structureFree(x, z, m)) return false;
  for (const [a, b] of SIGHT) if (segDist({ x, z }, a, b) < 3.6) return false;
  return true;
}
function lowOk(x: number, z: number) {
  if (
    x < shorelineX(z) + 3.5 ||
    cliffSolid(x, z) ||
    NATURAL_LANDMARKS.some((l) => Math.hypot(x - l.x, z - l.z) < 5)
  )
    return false;
  if (pathDistance(x, z, 1.4) < 1.25) return false;
  if (
    Math.hypot(x - fire.x, z - fire.z) < 2.6 ||
    Math.hypot(x - wellP.x, z - wellP.z) < 2.6
  )
    return false;
  if (x > 5.5 && x < 18.5 && z > -49.5 && z < -31.5) return false;
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 4.5) return false;
  return true;
}

const R = rng(36225);
const SOLIDS: { x: number; z: number; r: number }[] = [];
function scatter(
  count: number,
  tries: number,
  box: number[],
  accept: (x: number, z: number) => number,
  radius: number,
  vFn: (x: number, z: number) => { scale: number; variant: number },
  solid = true,
): Veg[] {
  const out: Veg[] = [];
  for (let t = 0; t < tries && out.length < count; t++) {
    const x = box[0]! + R() * (box[1]! - box[0]!),
      z = box[2]! + R() * (box[3]! - box[2]!);
    const p = accept(x, z);
    if (p <= 0 || R() > p) continue;
    const v = vFn(x, z),
      rr = radius * v.scale;
    if (solid && SOLIDS.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + rr))
      continue;
    if (solid) SOLIDS.push({ x, z, r: rr });
    out.push({
      x,
      z,
      ...v,
      lean: (R() - 0.5) * 0.2,
      rotation: R() * Math.PI * 2,
    });
  }
  return out;
}
const rimF = (x: number, z: number) =>
  Math.max(
    smoothstep(16, 30, x),
    smoothstep(-44, -58, z),
    smoothstep(14, 28, z),
  );
const BOX = [-62, 148, -77, 139];

export const ROCKS: Veg[] = [
  ...scatter(
    26,
    6000,
    BOX,
    (x, z) => {
      const d = x - shorelineX(z);
      return d > 1.2 &&
        d < 12 &&
        pathDistance(x, z, 3) > 2.6 &&
        structureFree(x, z, 0)
        ? 0.5
        : 0;
    },
    0.8,
    () => ({ scale: 0.5 + R() * 0.9, variant: Math.floor(R() * 3) }),
  ),
  ...scatter(
    45,
    8000,
    BOX,
    (x, z) =>
      structureFree(x, z, 1) &&
      territoryDistance(x, z) < 6 &&
      pathDistance(x, z, 4) > 3.5 &&
      x > shorelineX(z) + 4
        ? 0.7
        : 0,
    0.8,
    () => ({ scale: 1.6 + R() * 2.4, variant: Math.floor(R() * 3) }),
  ),
  ...scatter(
    16,
    6000,
    BOX,
    (x, z) => (treeOk(x, z, 0.5) ? 0.4 : 0),
    0.8,
    () => ({ scale: 0.5 + R() * 0.6, variant: Math.floor(R() * 3) }),
  ),
];
export const PALMS: Veg[] = scatter(
  100,
  24000,
  BOX,
  (x, z) => {
    if (!treeOk(x, z)) return 0;
    const d = x - shorelineX(z);
    let p = 0.1 + 0.9 * smoothstep(0.5, 0.66, noise2(x * 0.055 + 3, z * 0.055));
    if (d < 40) p += 0.6 * smoothstep(6, 12, d) * (1 - smoothstep(28, 40, d));
    return Math.min(1, p);
  },
  1.6,
  (x, z) => {
    const q = R(),
      d = x - shorelineX(z);
    return {
      scale: 0.85 + R() * 0.3,
      variant:
        d < 30
          ? q < 0.2
            ? 0
            : q < 0.55
              ? 1
              : 2
          : q < 0.35
            ? 0
            : q < 0.75
              ? 1
              : 2,
    };
  },
);
export const BROADLEAF: Veg[] = scatter(
  210,
  34000,
  BOX,
  (x, z) => {
    if (!treeOk(x, z, 0.5) || x - shorelineX(z) < 16) return 0;
    return (
      0.2 +
      0.8 *
        Math.max(
          rimF(x, z),
          smoothstep(0.5, 0.62, noise2(x * 0.05 + 30, z * 0.05 + 9)),
        )
    );
  },
  2.4,
  () => {
    const q = R();
    return { scale: 0.9 + R() * 0.5, variant: q < 0.4 ? 0 : q < 0.8 ? 1 : 2 };
  },
);
export const BAMBOO: Veg[] = scatter(
  24,
  12000,
  BOX,
  (x, z) => {
    if (
      !treeOk(x, z, 0.5) ||
      x < -26 ||
      Math.hypot(x - SPAWN.x, z - SPAWN.z) < 19
    )
      return 0;
    return smoothstep(0.52, 0.68, noise2(x * 0.06 + 11, z * 0.06));
  },
  2.2,
  () => ({ scale: 0.9 + R() * 0.4, variant: 0 }),
);

export const SHRUBS: Veg[] = scatter(
  380,
  19000,
  BOX,
  (x, z) =>
    lowOk(x, z) && x - shorelineX(z) > 9
      ? 0.2 + 0.8 * smoothstep(0.42, 0.6, noise2(x * 0.09 + 5, z * 0.09))
      : 0,
  0,
  () => ({ scale: 0.7 + R() * 0.7, variant: Math.floor(R() * 6) }),
  false,
);
export const FERNS: Veg[] = scatter(
  620,
  19000,
  BOX,
  (x, z) =>
    lowOk(x, z) && x - shorelineX(z) > 14
      ? 0.3 + 0.7 * smoothstep(0.4, 0.6, noise2(x * 0.11 + 2, z * 0.11 + 20))
      : 0,
  0,
  () => ({ scale: 0.7 + R() * 0.8, variant: Math.floor(R() * 3) }),
  false,
);
export const GRASS: Veg[] = scatter(
  500,
  19000,
  BOX,
  (x, z) => (lowOk(x, z) && x - shorelineX(z) > 6 ? 0.8 : 0),
  0,
  () => ({ scale: 0.7 + R() * 0.8, variant: Math.floor(R() * 4) }),
  false,
);
// understory hugging the trail so the route reads as a narrow cut through growth
(function edgePlants() {
  for (const trail of TRAILS)
    for (let i = 1; i < trail.points.length; i++) {
      const a = trail.points[i - 1]!,
        b = trail.points[i]!,
        len = Math.hypot(b.x - a.x, b.z - a.z);
      const nx = -(b.z - a.z) / len,
        nz = (b.x - a.x) / len;
      for (let s = 0; s < len; s += 1.1) {
        for (const side of [-1, 1]) {
          if (R() < 0.35) continue;
          const o = side * (1.55 + R() * 1.5),
            x = a.x + (b.x - a.x) * (s / len) + nx * o,
            z = a.z + (b.z - a.z) * (s / len) + nz * o;
          if (!lowOk(x, z) || x - shorelineX(z) < 12) continue;
          const k = R(),
            item = {
              x,
              z,
              scale: 0.7 + R() * 0.7,
              lean: 0,
              rotation: R() * 6.28,
              variant: Math.floor(R() * 6),
            };
          (k < 0.4 ? FERNS : k < 0.7 ? SHRUBS : GRASS).push({
            ...item,
            variant: item.variant % (k < 0.4 ? 3 : k < 0.7 ? 6 : 4),
          });
        }
      }
    }
})();
for (let z = BOUNDS.minZ; z < BOUNDS.maxZ; z += 2.4)
  for (let x = BOUNDS.minX; x < BOUNDS.maxX; x += 2.4) {
    const edge = territoryDistance(x, z);
    if (
      edge > -0.5 &&
      edge < 3.6 &&
      x > shorelineX(z) + 18 &&
      !cliffSolid(x, z) &&
      pathDistance(x, z, 4) > 3.5
    )
      SHRUBS.push({
        x,
        z,
        scale: 1.1 + R() * 0.4,
        rotation: R() * 6.28,
        lean: 0,
        variant: 99,
      });
  }
// The fern bowl is authored around a clear social centre, rather than a gap
// left to random scatter. Its inner branches screen three future search sites.
for (let i = 0; i < 22; i++) {
  const a = i * 2.399,
    r = i % 4 === 0 ? 2.8 : 4.8;
  FERNS.push({
    x: 43 + Math.cos(a) * r,
    z: 80 + Math.sin(a) * r,
    scale: 1 + (i % 3) * 0.12,
    rotation: a,
    lean: 0,
    variant: i % 3,
  });
}
export const FLOWERS: Veg[] = SHRUBS.filter(
  (s) => s.variant >= 4 && s.variant < 99,
).map((s) => ({
  ...s,
  variant: s.variant - 4,
}));

export const COLLIDERS: Collider[] = [
  ...FEATURE_SOLIDS,
  ...ROOT_SOLIDS,
  ...PALMS.map((p) => ({
    ...p,
    hx: 0.3 * p.scale,
    hz: 0.3 * p.scale,
    kind: "palm",
  })),
  ...BROADLEAF.map((p) => ({
    ...p,
    hx: 1.25 * p.scale,
    hz: 1.25 * p.scale,
    kind: "tree",
  })),
  ...BAMBOO.map((p) => ({
    ...p,
    hx: 0.65 * p.scale,
    hz: 0.65 * p.scale,
    kind: "bamboo",
  })),
  ...ROCKS.map((p) => ({
    ...p,
    hx: p.scale * 0.85,
    hz: p.scale * 0.85,
    kind: "rock",
  })),
  ...SEATING_LOGS.map(({ x, z, hx, hz, kind }) => ({ x, z, hx, hz, kind })),
  { ...LANDMARKS.campfire, hx: 1.0, hz: 1.0, kind: "fire" },
  { ...LANDMARKS.well, hx: 1.65, hz: 1.35, kind: "spring-pool" },
  { x: PROPS.canoe.x, z: PROPS.canoe.z, hx: 0.7, hz: 2.1, kind: "canoe" },
  {
    x: PROPS.driftwood.x,
    z: PROPS.driftwood.z,
    hx: 1.9,
    hz: 0.3,
    kind: "driftwood",
  },
  { ...PROPS.totem, hx: 0.3, hz: 0.3, kind: "totem" },
  { ...PROPS.crates, hx: 0.55, hz: 0.5, kind: "crate" },
  { ...PROPS.basket, hx: 0.35, hz: 0.35, kind: "basket" },
  ...PROPS.spit.map((p) => ({ ...p, hx: 0.12, hz: 0.12, kind: "post" })),
  ...PROPS.rack.map((p) => ({ ...p, hx: 0.14, hz: 0.14, kind: "post" })),
  { ...PROPS.barrel, hx: 0.5, hz: 0.5, kind: "barrel" },
  ...PROPS.signs.map((s) => ({
    x: s.x,
    z: s.z,
    hx: 0.12,
    hz: 0.12,
    kind: "sign",
  })),
  { x: 16, z: -41, hx: 0.55, hz: 0.45, kind: "crate" },
  ...[7.3, 16.7].flatMap((x) =>
    [-47.7, -40.3, -44].map((z) => ({
      x,
      z,
      hx: 0.22,
      hz: 0.22,
      kind: "post",
    })),
  ),
].filter(
  (c) =>
    c.x > BOUNDS.minX - 3 &&
    c.x < BOUNDS.maxX + 3 &&
    c.z > BOUNDS.minZ - 3 &&
    c.z < BOUNDS.maxZ + 3,
);

/** Soft ground-contact darkening baked into the terrain texture. */
export const SHADE: { x: number; z: number; r: number; s: number }[] = [
  ...PALMS.map((p) => ({ x: p.x, z: p.z, r: 1.5 * p.scale, s: 0.4 })),
  ...BROADLEAF.map((p) => ({ x: p.x, z: p.z, r: 3.4 * p.scale, s: 0.34 })),
  ...BAMBOO.map((p) => ({ x: p.x, z: p.z, r: 2.2 * p.scale, s: 0.4 })),
  ...ROCKS.map((p) => ({ x: p.x, z: p.z, r: p.scale * 1.5, s: 0.4 })),
  { ...fire, r: 3, s: 0.25 },
  { ...wellP, r: 2.8, s: 0.3 },
  { ...PROPS.canoe, r: 3, s: 0.35 },
  { x: 12, z: -44, r: 6, s: 0.3 },
];

const COLLIDER_CELL = 8;
const colliderGrid = new Map<string, Collider[]>();
for (const c of COLLIDERS)
  for (
    let ix = Math.floor((c.x - c.hx - PLAYER_RADIUS) / COLLIDER_CELL);
    ix <= Math.floor((c.x + c.hx + PLAYER_RADIUS) / COLLIDER_CELL);
    ix++
  )
    for (
      let iz = Math.floor((c.z - c.hz - PLAYER_RADIUS) / COLLIDER_CELL);
      iz <= Math.floor((c.z + c.hz + PLAYER_RADIUS) / COLLIDER_CELL);
      iz++
    ) {
      const k = ix + "," + iz,
        list = colliderGrid.get(k) ?? [];
      list.push(c);
      colliderGrid.set(k, list);
    }
function nearbyColliders(x: number, z: number) {
  return (
    colliderGrid.get(
      Math.floor(x / COLLIDER_CELL) + "," + Math.floor(z / COLLIDER_CELL),
    ) ?? []
  );
}
export function isWalkable(x: number, z: number): boolean {
  const r = PLAYER_RADIUS;
  if (
    x < BOUNDS.minX + r ||
    x > BOUNDS.maxX - r ||
    z < BOUNDS.minZ + r ||
    z > BOUNDS.maxZ - r
  )
    return false;
  if (
    x < shorelineX(z) + 1.0 ||
    territoryDistance(x, z) < r ||
    cliffSolid(x, z)
  )
    return false;
  return !nearbyColliders(x, z).some(
    (c) => Math.abs(x - c.x) < c.hx + r && Math.abs(z - c.z) < c.hz + r,
  );
}
export function movePlayer(pos: Point, dx: number, dz: number): Point {
  if (![pos.x, pos.z, dx, dz].every(Number.isFinite)) return { ...SPAWN };
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  if (steps > 1000) return { ...pos };
  let { x, z } = pos;
  const canStep = (nx: number, nz: number) =>
    isWalkable(nx, nz) &&
    Math.abs(groundHeight(nx, nz) - groundHeight(x, z)) < 0.22;
  for (let i = 0; i < steps; i++) {
    const nx = x + dx / steps;
    if (canStep(nx, z)) x = nx;
    const nz = z + dz / steps;
    if (canStep(x, nz)) z = nz;
  }
  return { x, z };
}
export function locationAt(x: number, z: number): string {
  if (x >= 7 && x <= 17 && z >= -48 && z < -33) return "Thatched shelter";
  if (Math.hypot(x - wellP.x, z - wellP.z) < 7) return "Freshwater spring";
  const landmark = NATURAL_LANDMARKS.find(
    (l) => Math.hypot(l.x - x, l.z - z) < 8,
  );
  if (landmark) return landmark.label;
  if (x - shorelineX(z) < 22) return "West beach";
  if (Math.hypot(x - fire.x, z - fire.z) < 15) return "Campfire clearing";
  return x > 48
    ? "Deep Tonsai jungle"
    : z > 65
      ? "Southern limestone trail"
      : z > -15
        ? "Jungle footpath"
        : "Jungle clearing";
}
