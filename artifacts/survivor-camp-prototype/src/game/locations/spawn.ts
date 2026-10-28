import type { Pose } from "./registry";
export type Surface = {
  height: (x: number, z: number) => number;
  walkable: (x: number, z: number) => boolean;
};
/** Fail closed rather than guessing a nearby cliff/water spawn. Includes a body ring and camera corridor. */
export function validateSpawn(p: Pose, s: Surface): Pose {
  if (!Object.values(p).every(Number.isFinite))
    throw Error("Invalid arrival coordinates.");
  const h = s.height(p.x, p.z);
  if (!Number.isFinite(h) || h <= 0.12 || !s.walkable(p.x, p.z))
    throw Error("Arrival point is outside safe ground.");
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      x = p.x + Math.sin(a) * 0.65,
      z = p.z + Math.cos(a) * 0.65;
    if (!s.walkable(x, z) || Math.abs(s.height(x, z) - h) > 0.55)
      throw Error("Arrival point has insufficient body clearance.");
  }
  for (let d = 1; d <= 6; d++) {
    const x = p.x + Math.sin(p.yaw) * d,
      z = p.z + Math.cos(p.yaw) * d;
    if (s.height(x, z) > h + 1.5 + d * 0.35)
      throw Error("Arrival camera is obstructed by terrain.");
  }
  return { ...p };
}
