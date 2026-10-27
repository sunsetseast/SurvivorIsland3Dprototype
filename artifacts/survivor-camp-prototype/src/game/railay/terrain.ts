import { karstDistance } from "./tonsai/karstField";
import { rockInterior, inTonsai } from "./tonsai/domain";
import { coastalBlocked } from "./tonsai/coastal";
import baked from "./height-grid.json";
import {
  COAST,
  ISLETS,
  LAGOON,
  KARSTS,
  CAVE,
  inside,
  edgeDistance,
  noise,
  smooth,
  trailDistance,
  type P,
} from "./geography";
export const GRID = { min: -2100, max: 1500, step: 6, chunk: 300 };
export const SIZE = (GRID.max - GRID.min) / GRID.step + 1;
let heights: Float32Array | undefined, shores: Float32Array | undefined;
export const isMud = (x: number, z: number) => x > 270 && z < 440 && z > -220;
export function naturalHeight(x: number, z: number) {
  const mainland = inside(x, z, COAST),
    island = ISLETS.find((p) => inside(x, z, p));
  const land = mainland || !!island,
    d = edgeDistance(x, z, island || COAST);
  if (!land) return -Math.min(35, 0.1 * d + 0.05);
  let h =
    0.04 +
    Math.min(5.8, d * 0.065) +
    Math.max(0, noise(x, z)) * 0.3 * smooth(10, 70, d);
  const baseHeight = h;
  for (const k of KARSTS)
    if (inside(x, z, k.outline)) {
      const e = edgeDistance(x, z, k.outline),
        top =
          k.height *
          Math.min(
            1,
            0.72 +
              0.15 * noise(x * 0.45 + k.seed * 10, z * 0.45) +
              0.1 * Math.sin(x * 0.005 + z * 0.007),
          );
      const crown =
        k.id === "tonsai-divider" || k.id === "northwest-wall"
          ? k.height *
            (0.78 +
              0.085 * Math.sin(x * 0.013 + k.seed) * Math.cos(z * 0.011) +
              0.055 * Math.sin(x * 0.031 + z * 0.022 + k.seed))
          : top;
      h = Math.max(h, 5 + smooth(0, 14, e) * crown);
      if ((k.id === "tonsai-divider" || k.id === "northwest-wall") && e < 9)
        h = baseHeight;
    }
  // Natural lowland trails only smooth low ground; never cut roads through karst walls.
  const td = trailDistance(x, z);
  if (h < 16 && td < 5) h = h * (0.94 + 0.06 * smooth(1, 5, td));
  if (inside(x, z, LAGOON)) h = -2.4 + 0.6 * noise(x, z);
  const ld = edgeDistance(x, z, LAGOON);
  if (!inside(x, z, LAGOON) && ld < 20)
    h = Math.min(h, 2 + smooth(1, 20, ld) * 95);
  if (Math.hypot(x - CAVE.x, z - CAVE.z) < CAVE.radius) h = 1.1;
  return h;
}
export function prepareTerrain() {
  if (heights && shores) return { heights, shores };
  // Offline-baked 1 cm elevation / 10 cm shore distances keep mobile entry off the GIS hot path.
  heights = Float32Array.from(baked.height, (v) => v / 100 - 40);
  shores = Float32Array.from(baked.shore, (v) => v / 10);
  return { heights, shores };
}
export function gridHeight(i: number, j: number) {
  return prepareTerrain().heights[
    Math.max(0, Math.min(SIZE - 1, j)) * SIZE +
      Math.max(0, Math.min(SIZE - 1, i))
  ]!;
}
/** Same diagonal and linear interpolation as terrain mesh triangles (not bilinear). */
export function heightAt(x: number, z: number) {
  const u = Math.max(0, Math.min(SIZE - 1.001, (x - GRID.min) / GRID.step)),
    v = Math.max(0, Math.min(SIZE - 1.001, (z - GRID.min) / GRID.step)),
    i = Math.floor(u),
    j = Math.floor(v),
    a = u - i,
    b = v - j;
  const h00 = gridHeight(i, j),
    h10 = gridHeight(i + 1, j),
    h01 = gridHeight(i, j + 1),
    h11 = gridHeight(i + 1, j + 1);
  return a + b <= 1
    ? h00 + (h10 - h00) * a + (h01 - h00) * b
    : h11 + (h01 - h11) * (1 - a) + (h10 - h11) * (1 - b);
}
export function slopeAt(x: number, z: number) {
  return (
    Math.hypot(
      heightAt(x + 3, z) - heightAt(x - 3, z),
      heightAt(x, z + 3) - heightAt(x, z - 3),
    ) / 6
  );
}
export function walkable(x: number, z: number) {
  if (
    !Number.isFinite(x + z) ||
    x < GRID.min + 20 ||
    z < GRID.min + 20 ||
    x > GRID.max - 20 ||
    z > GRID.max - 20
  )
    return false;
  if (
    inTonsai(x, z) &&
    (rockInterior(x, z) ||
      karstDistance(x, heightAt(x, z) + 1.2, z) < 0.45 ||
      coastalBlocked(x, z))
  )
    return false;
  return heightAt(x, z) > 0.12 && slopeAt(x, z) < 0.9;
}
export function moveOnTerrain(p: P, dx: number, dz: number): P {
  if (!Number.isFinite(dx + dz) || Math.hypot(dx, dz) > 10) return p;
  const parts = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.35));
  let out = { ...p };
  const accept = (x: number, z: number) =>
    walkable(x, z) && Math.abs(heightAt(x, z) - heightAt(out.x, out.z)) < 0.6;
  for (let i = 0; i < parts; i++) {
    const sx = dx / parts,
      sz = dz / parts;
    if (accept(out.x + sx, out.z + sz)) out = { x: out.x + sx, z: out.z + sz };
    else if (accept(out.x + sx, out.z)) out = { x: out.x + sx, z: out.z };
    else if (accept(out.x, out.z + sz)) out = { x: out.x, z: out.z + sz };
  }
  return out;
}
export function chunkLod(distance: number, low: boolean) {
  return distance < (low ? 380 : 580) ? 1 : 2;
}
export function releaseTerrain() {
  heights = undefined;
  shores = undefined;
}
