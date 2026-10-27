import { corridorClear, tribalHeight, trailDistance } from "./layout";
import { rng } from "../world";

export type KitAsset =
  | "elephant_guardian"
  | "naga_terminal"
  | "voting_roof"
  | "root_column"
  | "ceremonial_urn"
  | "fallen_relief"
  | "fern_cluster"
  | "hanging_vine"
  | "lotus_relief";
export type Placement = {
  asset: KitAsset;
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
  radius: number;
  elevated?: boolean;
};

/** Decorative only. Route/camera collision continues to use layout.ts, never render geometry. */
export function sanctuaryPlacements(low = false): Placement[] {
  const all: Placement[] = [];
  const place = (
    asset: KitAsset,
    x: number,
    z: number,
    yaw = 0,
    scale = 1,
    radius = 0.5,
    y = tribalHeight(x, z),
    elevated = false,
  ) => {
    all.push({ asset, x, y, z, yaw, scale, radius, elevated });
  };
  place("voting_roof", -34, 18, 0, 1, 0, 4.15, true);
  place("elephant_guardian", -7.5, -16.3, Math.PI + 0.35, 1.15, 2.7);
  place("elephant_guardian", 12, -15.5, Math.PI - 0.35, 1.15, 2.7);
  for (const [x, z, yaw] of [
    [-28.2, -28.6, -0.7],
    [-32.7, -25.9, -0.7],
    [16.2, 6.7, -1.0],
    [21.5, -1.8, 2.1],
  ])
    if (corridorClear(x!, z!, 0.9))
      place("naga_terminal", x!, z!, yaw!, 1, 0.9);
  for (const [x, z] of [
    [-8, -18.8],
    [7.9, -18.8],
    [14.8, -12],
    [-23.5, -8.5],
    [-23.5, 2.5],
    [-37.2, 21],
  ])
    if (corridorClear(x!, z!, 1.4))
      place("root_column", x!, z!, 0.08, 1.1, 1.4);
  for (const [x, z] of [
    [-27, 20],
    [-39, 16],
    [-13.3, -13.5],
    [12, -10.5],
    [13, 9],
    [-25, 3],
  ])
    if (corridorClear(x!, z!, 0.7))
      place("ceremonial_urn", x!, z!, 0, 1.1, 0.7);
  for (const x of [-9, -5, 4, 9])
    place("lotus_relief", x, -17.85, Math.PI, 1, 0, 0.1, true);
  for (const x of [-12, -6, 0, 6, 12]) {
    place("lotus_relief", x, -19.02, Math.PI, 0.65, 0, 1.6, true);
    place("hanging_vine", x + 1.4, -18.8, 0, 0.78, 0, 5.7, true);
  }
  const random = rng(70413);
  // Curated ruin edges, with conservative footprint exclusion around every ceremony route.
  for (let i = 0; i < 22; i++) {
    const x = -15 + random() * 31,
      z = -18 + random() * 5;
    if (corridorClear(x, z, 1.6) && Math.hypot(x, z) > 13)
      place(
        "fallen_relief",
        x,
        z,
        random() * 6.28,
        0.65 + random() * 0.35,
        1.6,
      );
  }
  // Low understory hugs the back wall, framing seated faces below the skyline.
  for (const [x, z] of [
    [-12, -16],
    [-5.5, -14],
    [1, -14],
    [6, -14],
    [10, -13],
    [14, -9],
    [-13, -10],
  ])
    if (corridorClear(x!, z!, 1.4))
      place("fern_cluster", x!, z!, random() * 6.28, 1.1, 1.4);
  for (let i = 0; i < (low ? 75 : 145); i++) {
    const x = -44 + random() * 85,
      z = -40 + random() * 68;
    const edge = Math.hypot(x / 1.2, z);
    const nearMasonry = z < -10 || x < -26 || x > 13;
    if (!nearMasonry || edge < 13 || edge > 45 || !corridorClear(x, z, 1.6))
      continue;
    if (x > -24 && x < -13 && z > -8 && z < 4) continue;
    if (x > -38 && x < -30 && z > 13 && z < 23) continue;
    place("fern_cluster", x, z, random() * 6.28, 0.65 + random() * 0.65, 1.6);
  }
  // Attached vines hang above the front entrance and above the actor/ballot sightlines.
  for (const [x, z, y] of [
    [-37.6, 15, 5.4],
    [-37.5, 21, 5.1],
    [-34, 14, 6],
    [-31.5, 21.2, 5],
    [-7, -18.6, 4.4],
    [9, -18.7, 4.2],
    [-19.3, -14.7, 5.7],
  ])
    place("hanging_vine", x!, z!, 0, 0.65, 0, y!, true);
  return all;
}

/** Tread remains clear; leaf litter is flat and roots stay at the margins. */
export function reclaimedStone(x: number, z: number) {
  const n =
    Math.sin(x * 0.72 + Math.sin(z * 0.44) * 1.7) *
    Math.sin(z * 0.53 + x * 0.12);
  const route = trailDistance(x, z) < 1.5;
  const seats = z < -5 && z > -9 && Math.abs(x) < 9;
  const host = x > 2 && x < 11 && z > 0 && z < 7;
  const voting = x < -30 && z > 14 && z < 22;
  return {
    missing: !route && !seats && !host && !voting && n > 0.18,
    moss: n < -0.42,
  };
}
