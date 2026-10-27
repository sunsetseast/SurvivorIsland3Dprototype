import { COAST, edgeDistance, trailDistance } from "../geography";
import { heightAt, slopeAt } from "../terrain";
import { cliffFootDistance, inTonsai } from "./domain";
import { random } from "../vegetation";
export type Debris = {
  x: number;
  y: number;
  z: number;
  radius: number;
  turn: number;
  variant: number;
  wood: boolean;
};
let cache: Debris[] | undefined;
export function coastalDebris() {
  if (cache) return cache;
  const r = random(80593),
    out: Debris[] = [];
  for (let i = 0; i < 9000; i++) {
    const x = -1250 + r() * 1290,
      z = -1470 + r() * 1120,
      shore = edgeDistance(x, z, COAST),
      foot = cliffFootDistance(x, z),
      h = heightAt(x, z),
      td = trailDistance(x, z);
    if (
      !inTonsai(x, z) ||
      h < 0.18 ||
      h > 8 ||
      slopeAt(x, z) > 0.55 ||
      td < 5 ||
      shore > 60 ||
      foot < 3 ||
      (foot > 45 && r() > 0.06)
    )
      continue;
    const wood = foot > 25 && r() < 0.35,
      radius = wood ? 0.35 : 0.3 + r() ** 2 * 2.4;
    if (out.some((p) => Math.hypot(p.x - x, p.z - z) < p.radius + radius + 1.5))
      continue;
    out.push({
      x,
      z,
      y: h - 0.18,
      radius,
      turn: r() * 6.283,
      variant: Math.floor(r() * 3),
      wood,
    });
  }
  cache = out;
  return out;
}
/** The same footprint used by visible boulders. Pebbles and driftwood don't
 * create invisible broad collision zones. Trail / spawn clearances are authored. */
export function coastalBlocked(x: number, z: number) {
  if (!inTonsai(x, z)) return false;
  return coastalDebris().some(
    (p) =>
      !p.wood &&
      p.radius > 0.75 &&
      Math.hypot(x - p.x, z - p.z) < p.radius * 0.91 + 0.38,
  );
}
