import {
  ARRIVAL,
  COUNCIL,
  TRIBAL,
  occupiedSeats,
  tribalHeight,
} from "./layout";
import type { Point } from "../world";
export type IntroMode = "intro" | "seated" | "explore";
export const CAST = [4, 11, 13, 18, 0];
export const CAST_SEATS = occupiedSeats(CAST.length);
export const INTRO_SHOTS = [
  {
    start: 0,
    end: 6,
    label: "The forgotten sanctuary",
    from: [0, 38, 9],
    to: [12, 20, 15],
    target: [-2, 5, -12],
  },
  {
    start: 6,
    end: 10,
    label: "Stone remembers",
    from: [-5, 3.3, -14],
    to: [-3, 4.1, -13],
    target: [1, 11, -25],
  },
  {
    start: 10,
    end: 14,
    label: "Jeff Probst · Host",
    from: [2.7, 2.1, -0.8],
    to: [3.7, 2.1, 0.8],
    target: [COUNCIL.host.x, 1.75, COUNCIL.host.z],
  },
  {
    start: 14,
    end: 24,
    label: "Bring in the survivors",
    from: [-7, 3, -6],
    to: [-8, 3.2, -8],
    target: [-16.5, 1.4, -15],
  },
  {
    start: 24,
    end: 40,
    label: "Take a seat",
    from: [9, 3.6, 0],
    to: [5, 2.6, -0.5],
    target: [0, 1, -6.8],
  },
];
export function stagedRoute(index: number): Point[] {
  const seat = CAST_SEATS[index]!,
    [x, , z] = seat.position;
  return [
    ...ARRIVAL,
    { x: -10, z: COUNCIL.aisleZ },
    { x, z: COUNCIL.aisleZ },
    { x, z: z + 1.05 },
  ];
}
function length(path: Point[]) {
  return path
    .slice(1)
    .reduce(
      (sum, b, i) => sum + Math.hypot(b.x - path[i]!.x, b.z - path[i]!.z),
      0,
    );
}
export const INTRO_DURATION = Math.max(
  ...CAST.map((_, i) => 2 + i * 1.1 + length(stagedRoute(i)) / 2.8 + 1.6),
);
export function stageAt(time: number, index: number) {
  const path = stagedRoute(index),
    seat = CAST_SEATS[index]!,
    total = length(path),
    distance = Math.max(0, time - 2 - index * 1.1) * 2.8;
  let remain = Math.min(distance, total),
    position = { ...path[0]! },
    facing = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!,
      b = path[i]!,
      len = Math.hypot(b.x - a.x, b.z - a.z);
    const t = Math.min(1, remain / (len || 1));
    position = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    facing = Math.atan2(b.x - a.x, b.z - a.z);
    if (remain < len) break;
    remain -= len;
  }
  const sit = Math.max(0, Math.min(1, (distance - total) / (2.8 * 1.3)));
  if (distance >= total) {
    position.x += Math.sin(seat.facing) * 0.37 * sit;
    position.z += (Math.cos(seat.facing) * 0.37 - 1.05) * sit;
    facing +=
      Math.atan2(
        Math.sin(seat.facing - facing),
        Math.cos(seat.facing - facing),
      ) * Math.min(1, sit * 2);
  }
  return {
    ...position,
    y: tribalHeight(position.x, position.z),
    facing,
    distance: Math.min(distance, total),
    speed: distance > 0 && distance < total ? 2.8 : 0,
    seated: sit > 0.35,
    arrived: sit >= 1,
  };
}
class Intro {
  time = 0;
  ceremonyTime = 0;
  private mode: IntroMode = "intro";
  private listeners = new Set<() => void>();
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.mode;
  private emit() {
    this.listeners.forEach((f) => f());
  }
  reset() {
    this.time = 0;
    this.ceremonyTime = 0;
    this.mode = "intro";
    this.emit();
  }
  step(dt: number) {
    this.ceremonyTime += Math.min(0.05, Math.max(0, dt));
    if (this.mode !== "intro") return;
    this.time += Math.min(0.05, Math.max(0, dt));
    if (this.time >= INTRO_DURATION) this.skip();
  }
  skip = () => {
    this.time = INTRO_DURATION + 1;
    this.mode = "seated";
    this.emit();
  };
  sit = () => {
    this.skip();
  };
  stand = () => {
    this.mode = "explore";
    this.emit();
  };
}
export const tribalIntro = new Intro();
