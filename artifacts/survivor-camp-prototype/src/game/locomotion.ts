import { angleDelta, ease, movementVector } from "./cameraController";
export const DEADZONE = 0.12;
export function analog(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y))
    return { x: 0, y: 0, pressure: 0 };
  const length = Math.hypot(x, y),
    pressure = Math.max(0, (Math.min(1, length) - DEADZONE) / (1 - DEADZONE));
  return {
    x: length ? (x / length) * pressure : 0,
    y: length ? (y / length) * pressure : 0,
    pressure,
  };
}
export type Drive = { vx: number; vz: number; basis: number; held: boolean; epoch?:number };
export const createDrive = (basis = 0): Drive => ({
  vx: 0,
  vz: 0,
  basis,
  held: false,
});
/** Camera basis is captured per stick gesture: inspection cannot redirect held movement. */
export function drive(
  s: Drive,
  x: number,
  y: number,
  yaw: number,
  run: boolean,
  rawDt: number,
  maxSpeed?: number,
  gestureEpoch?: number,
) {
  const dt = Math.min(0.05, Math.max(0, rawDt)),
    a = analog(x, y);
  if (gestureEpoch !== undefined && s.epoch !== gestureEpoch) {
    s.held = false;
    s.epoch = gestureEpoch;
  }
  if (a.pressure && !s.held) s.basis = yaw;
  s.held = a.pressure > 0;
  const v = movementVector(a.x, a.y, s.basis),
    speed = maxSpeed ?? (run ? 6.4 : 3.25),
    k = ease(dt, a.pressure ? 12 : 18);
  s.vx += (v.x * speed - s.vx) * k;
  s.vz += (v.z * speed - s.vz) * k;
  if (!a.pressure && Math.hypot(s.vx, s.vz) < 0.01) s.vx = s.vz = 0;
  return {
    dx: s.vx * dt,
    dz: s.vz * dt,
    pressure: a.pressure,
    speed: Math.hypot(s.vx, s.vz),
  };
}
export function cancelDrive(s: Drive) {
  s.vx = s.vz = 0;
  s.held = false;
}
export function turnHeading(face: number, dx: number, dz: number, dt: number) {
  if (Math.hypot(dx, dz) < 0.00001) return face;
  const delta = angleDelta(Math.atan2(dx, dz), face);
  return face + Math.max(-8 * dt, Math.min(8 * dt, delta * ease(dt, 15)));
}
/** Shared world-space locomotion adapted to the course's +Z lane frame. */
export function courseAxes(
  s: Drive,
  x: number,
  y: number,
  yaw: number,
  dt: number,
  gestureEpoch?: number,
) {
  drive(s, x, y, yaw, false, dt, 1, gestureEpoch);
  return { x: s.vx, forward: s.vz };
}
