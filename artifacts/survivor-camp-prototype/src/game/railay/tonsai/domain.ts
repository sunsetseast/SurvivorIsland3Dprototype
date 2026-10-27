import { KARSTS, inside, edgeDistance, smooth } from "../geography";
/** One continuous world. Only these existing massifs receive replacement art. */
export const TONSAI_KARSTS = KARSTS.filter(
  (k) => k.id === "tonsai-divider" || k.id === "northwest-wall",
);
export const inTonsai = (x: number, z: number) =>
  x < 55 && x > -1310 && z < -335 && z > -1570;
export function tonsaiWeight(x: number, z: number) {
  return (
    (1 - smooth(-90, 55, x)) *
    smooth(-1590, -1450, z) *
    (1 - smooth(-430, -335, z))
  );
}
export function rockInterior(x: number, z: number, margin = 0) {
  return TONSAI_KARSTS.some(
    (k) => inside(x, z, k.outline) && edgeDistance(x, z, k.outline) > margin,
  );
}
/** Visual feet are inset ~1m into the preserved slope envelope, never beachward. */
export function cliffFootDistance(x: number, z: number) {
  let d = Infinity;
  for (const k of TONSAI_KARSTS)
    d = Math.min(
      d,
      edgeDistance(x, z, k.outline) * (inside(x, z, k.outline) ? -1 : 1),
    );
  return d;
}
