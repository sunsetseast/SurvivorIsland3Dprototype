import type { CameraOwner } from "./cameraController";
export const input = {
  joyX: 0,
  joyY: 0,
  run: false,
  yaw: -0.48,
  pitch: 0.34,
  looking: false,
  lookGrace: 0,
  epoch: 0,
};
export const dbg = {
  tribalFrames: 0,
  calls: 0,
  triangles: 0,
  teleportRequested: null as { x: number; z: number } | null,
  x: 0,
  y: 0,
  z: 0,
  cx: 0,
  cy: 0,
  cz: 0,
  location: "",
  moving: false,
  running: false,
  fps: 0,
  resetRequested: false,
  face: 0,
  cameraOwner: "ceremony" as CameraOwner,
  votingBlend: 0,
  cameraCpuMs: 0,
  speed: 0,
  cameraDistance: 7.4,
  cameraBlocked: false,
};

export function clearInput() {
  input.joyX = input.joyY = 0;
  input.run = false;
  input.looking = false;
  input.lookGrace = 0;
  input.epoch++;
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("survivor-input-clear"));
}
