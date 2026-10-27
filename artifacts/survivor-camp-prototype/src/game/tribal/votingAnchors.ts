/** Metres, world axes. All voting presentation consumes these named datums. */
export const VOTING = {
  entrance: { x: -34, y: 0.35, z: 21.35 },
  writing: { x: -34, y: 0.35, z: 18.25, facing: Math.PI },
  table: { x: -34, y: 1.49, z: 16.8, width: 3.1, depth: 1.25 },
  parchment: { x: -34.12, y: 1.505, z: 17.07 },
  pen: { x: -33.47, y: 1.54, z: 17.1 },
  urn: { x: -35.13, y: 1.49, z: 16.68 },
  bag: { x: -32.95, y: 1.49, z: 16.78 },
  camera: { x: -34, y: 2.4, z: 15.52 },
  look: { x: -34, y: 1.8, z: 18.25 },
} as const;
