import type { Pose } from "../locations/registry";

export type Point = { x: number; z: number };
export const pose = (x: number, z: number, yaw = 0): Pose => ({ x, z, yaw, facing: yaw + Math.PI });
export const ARRIVAL = pose(20, -58, 0.35);
export const RETURN_EXIT = pose(20, -66, 0);
export const ZONES = {
  beach: { name: "Main Challenge Beach", center: { x: -18, z: -12 }, view: pose(9, -43, 0.9) },
  ocean: { name: "Ocean Relay", center: { x: -78, z: -12 }, view: pose(-42, -47, 1.45) },
  jungle: { name: "Jungle Challenge Clearing", center: { x: 61, z: -23 }, view: pose(43, -41, -2.1) },
  individual: { name: "Individual Clearing", center: { x: 49, z: 61 }, view: pose(30, 49, -2.0) },
} as const;
export type ZoneId = keyof typeof ZONES;
export const ROUTES: Point[][] = [
  [ARRIVAL, { x: 10, z: -36 }, { x: -40, z: -36 }, { x: -40, z: 20 }],
  [ARRIVAL, { x: 35, z: -43 }, { x: 43, z: -41 }, { x: 45, z: -23 }],
  [{ x: 8, z: 20 }, { x: 27, z: 26 }, { x: 34, z: 51 }, { x: 30, z: 49 }],
  [{ x: 45, z: -23 }, { x: 43, z: 3 }, { x: 27, z: 26 }],
  [{ x: -40, z: -36 }, { x: -42, z: -47 }],
  [ARRIVAL, RETURN_EXIT],
];
export const ARRIVAL_STAGING = Array.from({ length: 10 }, (_, i) => pose(12 + (i % 5) * 2.2, -63 + Math.floor(i / 5) * 2.6, 0));
export const ARRIVAL_HOST = pose(15, -54, Math.PI);
