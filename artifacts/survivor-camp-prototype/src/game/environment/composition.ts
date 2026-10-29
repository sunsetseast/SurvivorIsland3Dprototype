/** Hand placed massing: open western water, north headland, split eastern
 * buttresses. Northern backdrop rocks remain outside the playable boundary; the southern wall is authored separately. No arena ring.
 * Scale is uniform: scanned rock proportions/erosion are never stretched. */
export const CLIFF_MASSES = [
  { x: -37, y: -3, z: -76, s: 18, turn: 0.4, tilt: 0.05 },
  { x: -19, y: -4, z: -80, s: 24, turn: -0.7, tilt: -0.12 },
  { x: -24, y: 18, z: -79, s: 13, turn: 0.9, tilt: 0.12 },
  { x: 2, y: -3, z: -80, s: 25, turn: 1.7, tilt: -0.07 },
  { x: 5, y: 22, z: -81, s: 16, turn: -0.1, tilt: 0.14 },
  { x: 28, y: 0, z: -86, s: 22, turn: 2.8, tilt: -0.14 },
  { x: -100, y: -7, z: -120, s: 20, turn: 2.3, tilt: 0.04 },
  { x: -151, y: -12, z: -164, s: 25, turn: 0.9, tilt: -0.08 },
];
export const PRIVATE_SPACES = [
  { id: "quiet-beach", x: -42, z: -40, label: "Quiet beach strategy space" },
  { id: "jungle-edge", x: 43, z: 80, label: "Fern bowl clearing" },
  { id: "water-path", x: 104, z: 36, label: "Freshwater conversation" },
  { id: "southern-roof", x: -17, z: 91, label: "Southern limestone roof" },
  { id: "stone-alcove", x: 30, z: 91, label: "Secluded stone alcove" },
];
export const BACKDROP_TREES = [
  ...Array.from({ length: 14 }, (_, i) => [-45 + i * 6, -68, 4.5]),
  ...Array.from({ length: 20 }, (_, i) => [
    141 + Math.sin(i) * 4,
    -18 + i * 6,
    4.4,
  ]),
].map(([x, z, scale], i) => ({
  x: x!,
  z: z!,
  scale: scale!,
  rotation: i * 2.399,
}));
