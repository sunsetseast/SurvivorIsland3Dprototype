import { ZONES, shoreX, type Point } from "./layout";
import { inKarst, TREES, OUTCROPS } from "./environmentLayout";
export { shoreX } from "./layout";

// Shared authored coastline for terrain, wet-sand safety and environmental art.
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function heightAt(x: number, z: number) {
  const d = x - shoreX(z);
  if (d < 0) return Math.max(-9, d * 0.12);
  const coast = 0.14 + Math.min(1.3, d * 0.055);
  const inland = smooth(48, 85, d);
  let h = coast + inland * (1.1 + 0.18 * Math.sin(x * 0.09) * Math.sin(z * 0.08));
  for (const id of ["jungle", "individual"] as const) {
    const c = ZONES[id].center;
    const t = 1 - smooth(18, 28, Math.hypot(x - c.x, z - c.z));
    h = h * (1 - t) + 2.54 * t;
  }
  return h;
}
export function walkable(x: number, z: number) {
  return Number.isFinite(x) && Number.isFinite(z) && x > shoreX(z) + 5 && x < 98 && Math.abs(z) < 101 && !inKarst(x,z,0.75) && !OUTCROPS.some(r=>Math.hypot(x-r.x,z-r.z)<r.r*1.15+0.7) && !TREES.some(t=>Math.hypot(x-t.x,z-t.z)<0.8) && ![7,28].some(b=>Math.abs(x-b)<0.8 && Math.abs(z+58)<3.1);
}
/** Same bounded-substep/axis-slide convention as existing terrain adapters; no physics or second controller. */
export function moveOnTerrain(p: Point, dx: number, dz: number): Point {
  if (![p.x, p.z, dx, dz].every(Number.isFinite)) return { ...p };
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.18));
  if (steps > 2048) return { ...p };
  let { x, z } = p;
  for (let i = 0; i < steps; i++) {
    const nx = x + dx / steps, nz = z + dz / steps;
    if (walkable(nx, nz)) { x = nx; z = nz; }
    else if (walkable(nx, z)) x = nx;
    else if (walkable(x, nz)) z = nz;
  }
  return { x, z };
}
export function zoneAt(x: number, z: number) {
  if (x < -38) return "West Beach · ocean viewing shore";
  if (x > 32 && z > 35) return ZONES.individual.name;
  if (x > 36 && z < 8) return ZONES.jungle.name;
  return x < 10 ? ZONES.beach.name : "Arrival grove and jungle trail";
}
