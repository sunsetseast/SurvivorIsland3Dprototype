/** Hand placed massing: open western water, north headland, split eastern
 * buttresses. All hero rocks sit outside the playable boundary. No arena ring.
 * Scale is uniform: scanned rock proportions/erosion are never stretched. */
export const CLIFF_MASSES = [
  { x: -37, y: -3, z: -76, s: 18, turn: 0.4, tilt: 0.05 },
  { x: -19, y: -4, z: -80, s: 24, turn: -0.7, tilt: -0.12 },
  { x: -24, y: 18, z: -79, s: 13, turn: 0.9, tilt: 0.12 },
  { x: 2, y: -3, z: -80, s: 25, turn: 1.7, tilt: -0.07 },
  { x: 5, y: 22, z: -81, s: 16, turn: -0.1, tilt: 0.14 },
  { x: 28, y: 0, z: -86, s: 22, turn: 2.8, tilt: -0.14 },
  { x: 57, y: -2, z: -46, s: 26, turn: 0.8, tilt: 0.03 },
  { x: 58, y: 22, z: -48, s: 17, turn: 2.2, tilt: -0.16 },
  { x: 61, y: 1, z: -15, s: 24, turn: 3.4, tilt: 0.1 },
  { x: 65, y: 17, z: -14, s: 15, turn: 1.3, tilt: -0.1 },
  { x: -100, y: -7, z: -120, s: 20, turn: 2.3, tilt: 0.04 },
  { x: -151, y: -12, z: -164, s: 25, turn: 0.9, tilt: -0.08 },
];
export const PRIVATE_SPACES = [
  { id: "quiet-beach", x: -42, z: -40, label: "Quiet beach strategy space" },
  { id: "jungle-edge", x: -19, z: 17.7, label: "Shaded jungle conversation" },
  { id: "water-path", x: -31.5, z: 8, label: "Water collection conversation" },
];
// Roots remain beyond the playable limits; crowns bridge the gap into the
// larger coastal forest without introducing invisible obstacles on routes.
export const BACKDROP_TREES = [
  [-45, -65, 4.1],
  [-32, -65, 4.7],
  [-19, -66, 4.5],
  [-5, -65, 5.1],
  [11, -66, 4.4],
  [26, -65, 4.6],
  [41, -55, 4.7],
  [42, -40, 5.0],
  [42, -24, 4.3],
  [42, -8, 4.8],
  [43, 9, 4.4],
  [42, 26, 4.8],
  [-39, 42, 4.7],
  [-24, 43, 4.8],
  [-8, 42, 5.0],
  [8, 43, 4.5],
  [25, 42, 4.8],
].map(([x, z, scale], i) => ({
  x: x!,
  z: z!,
  scale: scale!,
  rotation: i * 2.399,
}));
