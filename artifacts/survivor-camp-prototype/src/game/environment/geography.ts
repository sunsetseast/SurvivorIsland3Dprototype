import { recordStage } from "./profile";
import rockCollision from "./rockCollision.json";
/** Authored local metres; +X inland/east, +Z toward the southern Tonsai Wall &
 * Roof headland. A compressed fictional camp, not a survey. */
export type SitePoint = { x: number; z: number };
const p = (x: number, z: number): SitePoint => ({ x, z });
export const CAMP_EXTENT = { minX: -63, maxX: 138, minZ: -64, maxZ: 127 };
export const TERRAIN_EXTENT = { minX: -94, maxX: 165, minZ: -88, maxZ: 148 };
export const TERRITORY = [
  p(-70, -62),
  p(25, -62),
  p(66, -49),
  p(116, -22),
  p(135, 22),
  p(125, 74),
  p(96, 111),
  p(50, 124),
  p(0, 119),
  p(-33, 105),
  p(-70, 105),
];
export function territoryContains(x: number, z: number) {
  let inside = false;
  for (let i = 0, j = TERRITORY.length - 1; i < TERRITORY.length; j = i++) {
    const a = TERRITORY[i]!,
      b = TERRITORY[j]!;
    if (
      a.z > z !== b.z > z &&
      x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}
function exactTerritoryDistance(x: number, z: number) {
  let d = Infinity;
  TERRITORY.forEach((a, i) => {
    const b = TERRITORY[(i + 1) % TERRITORY.length]!,
      dx = b.x - a.x,
      dz = b.z - a.z,
      t = Math.max(
        0,
        Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)),
      );
    d = Math.min(d, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
  });
  return territoryContains(x, z) ? d : -d;
}
// Static 1 m signed-distance lattice: exact polygon tests are amortized at module
// load, instead of repeating all boundary edges for every movement substep.
const SDF_X = -100,
  SDF_Z = -90,
  SDF_W = 272,
  SDF_H = 242;
const territoryStageStart = performance.now();
const sdf = new Float32Array(SDF_W * SDF_H);
for (let z = 0; z < SDF_H; z++)
  for (let x = 0; x < SDF_W; x++)
    sdf[z * SDF_W + x] = exactTerritoryDistance(SDF_X + x, SDF_Z + z);
recordStage("territory-distance-field", territoryStageStart);
export function territoryDistance(x: number, z: number) {
  const fx = x - SDF_X,
    fz = z - SDF_Z,
    ix = Math.floor(fx),
    iz = Math.floor(fz);
  if (ix < 0 || iz < 0 || ix >= SDF_W - 1 || iz >= SDF_H - 1)
    return exactTerritoryDistance(x, z);
  const u = fx - ix,
    v = fz - iz,
    i = iz * SDF_W + ix;
  return (
    (sdf[i]! * (1 - u) + sdf[i + 1]! * u) * (1 - v) +
    (sdf[i + SDF_W]! * (1 - u) + sdf[i + SDF_W + 1]! * u) * v
  );
}
export const SPRING = p(108, 36);
export const EXPANDED_PLACES = {
  southernCliff: p(-17, 91),
  cave: p(11, 104),
  rockPassage: p(16, 65),
  clearing: p(43, 80),
  strategy: p(30, 91),
  ancientTree: p(38, 5),
};
export type Trail = {
  id: string;
  label: string;
  width: number;
  points: SitePoint[];
};
export const TRAILS: Trail[] = [
  {
    id: "camp",
    label: "Camp trail",
    width: 2.7,
    points: [
      p(-47, -27),
      p(-38, -26.2),
      p(-28, -27.6),
      p(-19, -26.6),
      p(-9, -28.4),
      p(3, -30.6),
      p(12, -33),
      p(12, -38),
      p(12, -44),
    ],
  },
  {
    id: "spring",
    label: "Freshwater trail",
    width: 2.5,
    points: [
      p(12, -33),
      p(25, -23),
      p(26, -9),
      p(29, -2),
      p(38, 5),
      p(38, 10),
      p(45, 14),
      p(54, 14),
      p(70, 25),
      p(77, 29),
      p(91, 31),
      p(104, 36),
    ],
  },
  {
    id: "loop",
    label: "Interior loop",
    width: 2.1,
    points: [
      p(54, 14),
      p(53, 36),
      p(58, 48),
      p(57, 58),
      p(60, 65),
      p(66, 68),
      p(85, 71),
      p(99, 66),
      p(104, 62),
      p(111, 50),
      p(104, 36),
    ],
  },
  {
    id: "southern",
    label: "Limestone forest trail",
    width: 2.3,
    points: [
      p(-6, -24),
      p(-4, -8),
      p(5, 13),
      p(3, 35),
      p(-5, 35),
      p(-8, 43),
      p(-7, 55),
      p(-14, 72),
      p(-17, 86),
      p(-17, 91),
    ],
  },
  {
    id: "beach",
    label: "Southern beach",
    width: 3.4,
    points: [
      p(-47, -27),
      p(-47, 5),
      p(-43, 30),
      p(-37, 54),
      p(-28, 73),
      p(-17, 86),
    ],
  },
  {
    id: "crossing",
    label: "Root crossing",
    width: 2.1,
    points: [p(5, 13), p(20, 23), p(36, 24), p(54, 14)],
  },
  {
    id: "southern-loop",
    label: "Boulder loop",
    width: 2.1,
    points: [
      p(-7, 55),
      p(6, 58),
      p(25, 59),
      p(29, 71),
      p(43, 80),
      p(56, 78),
      p(66, 68),
    ],
  },
  {
    id: "moss-spur",
    label: "Limestone fissure passage",
    width: 1.9,
    points: [p(6, 58), p(16, 61), p(16, 65)],
  },
  {
    id: "alcoves",
    label: "Cliff base trail",
    width: 2.2,
    points: [p(-17, 91), p(-5, 92), p(4, 94), p(11, 97), p(11, 104)],
  },
  {
    id: "strategy",
    label: "Quiet spur",
    width: 1.9,
    points: [p(43, 80), p(38, 86), p(30, 87), p(30, 91)],
  },
  {
    id: "bridge",
    label: "Leaning roots spur",
    width: 1.9,
    points: [p(70, 25), p(69, 17), p(80, 10), p(89, 4)],
  },
  {
    id: "journey",
    label: "Journey departure",
    width: 2.4,
    points: [p(5, 13), p(-1, 22), p(-6, 26)],
  },
];
export type LandmarkKind =
  | "buttress"
  | "fallen"
  | "boulders"
  | "cave"
  | "overhang"
  | "stump"
  | "leaning"
  | "strangler"
  | "ferns"
  | "bridge"
  | "roots"
  | "alcove";
export const NATURAL_LANDMARKS: {
  id: string;
  label: string;
  kind: LandmarkKind;
  x: number;
  z: number;
}[] = [
  {
    id: "ancient-fig",
    label: "Ancient buttress fig",
    kind: "buttress",
    x: 43,
    z: 5,
  },
  {
    id: "root-crown",
    label: "Intertwined root crown",
    kind: "roots",
    x: 76,
    z: 23,
  },
  {
    id: "fallen-giant",
    label: "Fallen giant and root plate",
    kind: "fallen",
    x: 63,
    z: 56,
  },
  {
    id: "moss-gates",
    label: "Limestone fissure",
    kind: "boulders",
    x: 16,
    z: 65,
  },
  {
    id: "southern-cave",
    label: "Southern limestone cave",
    kind: "cave",
    x: 11,
    z: 104,
  },
  {
    id: "roof-shelter",
    label: "Limestone roof",
    kind: "overhang",
    x: -18,
    z: 95,
  },
  {
    id: "hollow-stump",
    label: "Hollow storm stump",
    kind: "stump",
    x: 31,
    z: -7,
  },
  {
    id: "leaning-tamarind",
    label: "Leaning tamarind",
    kind: "leaning",
    x: -2,
    z: 43,
  },
  {
    id: "strangler-stone",
    label: "Strangler fig and stone",
    kind: "strangler",
    x: 95,
    z: 61,
  },
  { id: "fern-bowl", label: "Fern bowl clearing", kind: "ferns", x: 43, z: 80 },
  {
    id: "root-bridge",
    label: "Fallen root bridge",
    kind: "bridge",
    x: 89,
    z: 1,
  },
  {
    id: "quiet-alcove",
    label: "Quiet stone alcove",
    kind: "alcove",
    x: 30,
    z: 91,
  },
];
/** Shared cliff cross-section. The roof projects over an accessible sandy apron. */
export function cliffFaceZ(x: number, y = 0) {
  return (
    100 +
    3.0 * Math.sin(x * 0.15) +
    1.0 * Math.sin(x * 0.4) -
    5 * Math.exp(-(((y - 8) / 5) ** 2)) * (0.7 + 0.3 * Math.cos(x * 0.12))
  );
}
export const CAVE = { minX: 7, maxX: 15, mouthZ: 97, backZ: 111, height: 5.6 };
export function cliffSolid(x: number, z: number) {
  if (x < -40 || x > 42 || z < cliffFaceZ(x, 1.8) - 0.25) return false;
  return !(x > CAVE.minX + 0.4 && x < CAVE.maxX - 0.4 && z < CAVE.backZ - 0.4);
}
export const FEATURE_SOLIDS: {
  x: number;
  z: number;
  hx: number;
  hz: number;
  kind: string;
  polygon?: number[][];
}[] = NATURAL_LANDMARKS.flatMap((l) => {
  const box = (dx: number, dz: number, hx: number, hz: number) => ({
    x: l.x + dx,
    z: l.z + dz,
    hx,
    hz,
    kind: "landmark:" + l.id,
  });
  if (l.kind === "buttress" || l.kind === "roots")
    return [
      box(
        0,
        0,
        l.kind === "buttress" ? 1.8 : 1,
        l.kind === "buttress" ? 1.8 : 1,
      ),
    ];
  if (l.kind === "fallen" || l.kind === "bridge")
    return [box(0, 0, 4.4, l.kind === "bridge" ? 0.58 : 0.95)];
  if (l.kind === "stump" || l.kind === "leaning") return [box(0, 0, 1, 1)];
  if (["strangler", "boulders", "alcove"].includes(l.kind))
    return rockCollision.filter((c) => c.kind === "landmark:" + l.id);
  return [];
});

/** Root ridges above ankle height are solid; tips remain low ground detail. */
export const ROOT_SOLIDS = NATURAL_LANDMARKS.filter((l) =>
  ["buttress", "roots", "leaning", "strangler"].includes(l.kind),
).flatMap((l) => {
  const n = l.kind === "buttress" ? 9 : 6;
  return Array.from({ length: n }, (_, i) => {
    const a = l.kind === "buttress" ? (i * 6.283) / 9 + 0.2 : i * 1.07;
    return [2.2, 2.8, 3.4].map((r) => ({
      x: l.x + Math.cos(a) * r,
      z: l.z + Math.sin(a) * r,
      hx: 0.33,
      hz: 0.33,
      kind: "root:" + l.id,
    }));
  }).flat();
});

export const cliffTopHeight = (x: number) =>
  67 + 5 * Math.sin(x * 0.12) + 3 * Math.sin(x * 0.43);
