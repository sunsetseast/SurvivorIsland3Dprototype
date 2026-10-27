/** Metres: +X east, +Y up, +Z south. OSM-derived data is ODbL; see data/railay. */
import source from "./geography.json";
export type P = { x: number; z: number };
export const ORIGIN = source.origin;
const DEG = Math.PI / 180,
  R = source.radius;
export const project = (lon: number, lat: number): P => ({
  x: (lon - ORIGIN[0]) * DEG * R * Math.cos(ORIGIN[1] * DEG),
  z: (ORIGIN[1] - lat) * DEG * R,
});
export const unproject = (x: number, z: number) => [
  ORIGIN[0] + x / (DEG * R * Math.cos(ORIGIN[1] * DEG)),
  ORIGIN[1] - z / (DEG * R),
];
const poly = (p: number[][]) => p.map(([lon, lat]) => project(lon!, lat!));
export const COAST = poly(source.mainland);
export const ISLETS = source.islets.map(poly);
export const LAGOON = poly(source.lagoon);
export const inside = (x: number, z: number, p: P[]) => {
  let yes = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i]!,
      b = p[j]!;
    if (
      a.z > z !== b.z > z &&
      x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x
    )
      yes = !yes;
  }
  return yes;
};
export function segmentDistance(x: number, z: number, a: P, b: P) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    t = Math.max(
      0,
      Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)),
    );
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
}
export function edgeDistance(x: number, z: number, p: P[]) {
  let d = Infinity;
  for (let i = 0; i < p.length; i++)
    d = Math.min(d, segmentDistance(x, z, p[i]!, p[(i + 1) % p.length]!));
  return d;
}
export const noise = (x: number, z: number) =>
  Math.sin(x * 0.037 + Math.sin(z * 0.023)) * Math.cos(z * 0.029) +
  0.4 * Math.sin(x * 0.113 + z * 0.087) +
  0.15 * Math.sin(x * 0.67 - z * 0.43);
export const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const ZONES = [
  {
    id: "tonsai",
    name: "Tonsai Beach",
    point: project(98.83335, 8.01675),
    spawn: project(98.83375, 8.01755),
  },
  {
    id: "west",
    name: "Railay West",
    point: project(98.8375, 8.01125),
    spawn: project(98.83785, 8.0112),
  },
  {
    id: "east",
    name: "Railay East · Mangrove Shore",
    point: project(98.8413, 8.01015),
    spawn: project(98.84105, 8.01015),
  },
  {
    id: "phra",
    name: "Phra Nang Beach",
    point: project(98.8387, 8.00515),
    spawn: project(98.83885, 8.00545),
  },
  {
    id: "lagoon",
    name: "Sa Phra Nang · Hidden Lagoon",
    point: project(98.84265, 8.0048),
    spawn: project(98.84214, 8.00535),
  },
] as const;
export const ANCHORS = {
  tribeTonsai: { ...project(98.8344, 8.0174), radius: 24 },
  tribeSouth: { ...project(98.839, 8.0064), radius: 24 },
  challengeWest: {
    ...project(98.83808, 8.011),
    radius: 28,
    width: 20,
    length: 52,
  },
  councilAccess: { ...project(98.8401, 8.0144), radius: 16 },
  journey: { ...project(98.8389, 8.0174), radius: 18 },
};
const osmCliff = (id: number) =>
  poly(source.cliffs.find((c) => c.id === id)!.coordinates);
/** Mapped walls + explicitly authored inland closures; heights are artistic estimates except marked OSM peaks. */
export const KARSTS = [
  { id: "southern-massif", height: 95, outline: osmCliff(243244854), seed: 4 },
  {
    id: "thaiwand",
    height: 58,
    outline: poly([
      [98.83528, 8.00885],
      [98.83548, 8.00813],
      [98.8362, 8.00794],
      [98.8372, 8.00815],
      [98.83765, 8.00865],
      [98.8374, 8.00925],
      [98.8366, 8.0096],
      [98.8356, 8.00935],
    ]),
    seed: 8,
  },
  {
    id: "tonsai-divider",
    height: 155,
    outline: poly([
      [98.83512, 8.01418],
      [98.83558, 8.01425],
      [98.83558, 8.01555],
      [98.8351, 8.0165],
      [98.8343, 8.0174],
      [98.83485, 8.0181],
      [98.8366, 8.0192],
      [98.8382, 8.0189],
      [98.8383, 8.0164],
      [98.8373, 8.01465],
      [98.8365, 8.01432],
    ]),
    seed: 19,
  },
  {
    id: "diamond-ridge",
    height: 185,
    outline: poly([
      [98.8386, 8.0149],
      [98.8397, 8.01355],
      [98.8408, 8.013],
      [98.842, 8.0139],
      [98.8431, 8.0164],
      [98.8427, 8.0208],
      [98.8401, 8.0214],
      [98.8394, 8.0182],
    ]),
    seed: 27,
  },
  {
    id: "northwest-wall",
    height: 210,
    outline: poly([
      [98.8268, 8.0176],
      [98.8271, 8.016],
      [98.8286, 8.01555],
      [98.8295, 8.0161],
      [98.8301, 8.0172],
      [98.8303, 8.0186],
      [98.83065, 8.0196],
      [98.8318, 8.0235],
      [98.8294, 8.0245],
      [98.8276, 8.0226],
      [98.8275, 8.0205],
      [98.828, 8.0193],
    ]),
    seed: 34,
  },
  ...ISLETS.map((outline, i) => ({
    id: `mapped-islet-${i}`,
    height: i === 0 ? 58 : i === 2 ? 84 : 18 + i * 3,
    outline,
    seed: 50 + i,
  })),
];
export const CAVE = { ...project(98.84018, 8.00372), radius: 16, roof: 13 };
/** Natural-route plan through lowland corridors. No modern paths/infrastructure imported. */
export const TRAILS = [
  [
    [98.83375, 8.01755],
    [98.8342, 8.0176],
    [98.834, 8.0183],
    [98.835, 8.01955],
    [98.8368, 8.0201],
    [98.8386, 8.0194],
    [98.83875, 8.017],
    [98.8387, 8.0154],
    [98.838, 8.0141],
    [98.8381, 8.0126],
    [98.83785, 8.0112],
  ],
  [
    [98.83785, 8.0112],
    [98.839, 8.01125],
    [98.8401, 8.0109],
    [98.84105, 8.01015],
  ],
  [
    [98.84105, 8.01015],
    [98.8412, 8.0092],
    [98.84115, 8.0083],
    [98.8407, 8.0077],
    [98.84015, 8.0068],
    [98.84015, 8.0056],
    [98.8393, 8.0054],
    [98.83885, 8.00545],
  ],
].map(poly);
export function trailDistance(x: number, z: number) {
  let d = Infinity;
  for (const t of TRAILS)
    for (let i = 1; i < t.length; i++)
      d = Math.min(d, segmentDistance(x, z, t[i - 1]!, t[i]!));
  return d;
}
export function zoneAt(x: number, z: number) {
  return [...ZONES].sort(
    (a, b) =>
      Math.hypot(x - a.point.x, z - a.point.z) -
      Math.hypot(x - b.point.x, z - b.point.z),
  )[0]!.name;
}
