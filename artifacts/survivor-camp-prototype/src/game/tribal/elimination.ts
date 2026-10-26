import { COUNCIL, EXIT_PATH, tribalHeight, TRIBAL } from "./layout";

import type { Point } from "../world";

const SPEED = 1.65;
export const SNUFF_HOLD = 3.2;
export function eliminationApproach(index: number): Point[] {
  const seat = TRIBAL.seats[index];
  if (!seat) throw new RangeError("No attending contestant at this seat");
  return [
    { x: seat.position[0], z: seat.position[2] + 1.05 },
    { x: seat.position[0], z: COUNCIL.aisleZ },
    { x: 10, z: COUNCIL.aisleZ },
    { x: 10, z: 2.5 },
    COUNCIL.snuffMark,
  ];
}
export const eliminationDeparture = [COUNCIL.snuffMark, ...EXIT_PATH];
function length(path: Point[]) {
  return path
    .slice(1)
    .reduce((s, p, i) => s + Math.hypot(p.x - path[i]!.x, p.z - path[i]!.z), 0);
}
function sample(path: Point[], distance: number) {
  let remaining = Math.max(0, distance);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!,
      b = path[i]!,
      d = Math.hypot(b.x - a.x, b.z - a.z);
    if (remaining <= d || i === path.length - 1) {
      const t = Math.min(1, remaining / d);
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        facing: Math.atan2(b.x - a.x, b.z - a.z),
      };
    }
    remaining -= d;
  }
  throw new Error("Empty ceremony route");
}
/** Presentation only. A future season adapter supplies the resolved contestant;
 * original TribalCouncilView's `snuff` -> `tribal-exit` beats remain the authority. */
export function eliminationAt(time: number, index = Math.max(0, TRIBAL.seats.length - 1)) {
  const approach = eliminationApproach(index),
    before = length(approach) / SPEED;
  const leaving = Math.max(0, time - before - SNUFF_HOLD);
  const phase =
    time < before ? "approach" : time < before + SNUFF_HOLD ? "snuff" : "exit";
  const p = sample(
    phase === "exit" ? eliminationDeparture : approach,
    phase === "exit" ? leaving * SPEED : Math.min(time, before) * SPEED,
  );
  // Turn toward Jeff during the hold, then blend onto the side route without snapping.
  if (phase === "snuff") {
    const facing = Math.atan2(COUNCIL.host.x - p.x, COUNCIL.host.z - p.z);
    const k = Math.min(1, (time - before) / 0.65);
    p.facing +=
      Math.atan2(Math.sin(facing - p.facing), Math.cos(facing - p.facing)) * k;
  }
  return {
    ...p,
    y: tribalHeight(p.x, p.z),
    phase,
    holdTime: Math.max(0, Math.min(SNUFF_HOLD, time - before)),
    speed: phase === "snuff" ? 0 : SPEED,
    distance: Math.min(time, before) * SPEED + leaving * SPEED,
    lit: time < before + 1.7,
    done: leaving * SPEED >= length(eliminationDeparture),
  };
}
