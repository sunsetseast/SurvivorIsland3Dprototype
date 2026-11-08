/** Shared, allocation-free control math; heading and orbit are distinct authorities. */
export const angleDelta = (to: number, from: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));
export const ease = (dt: number, rate: number) =>
  1 - Math.exp(-Math.max(0, dt) * rate);
export type CameraOwner =
  | "follow"
  | "manual-look"
  | "voting-transition"
  | "voting-portrait"
  | "ceremony"
  | "dialogue";
export function followYaw(
  yaw: number,
  face: number,
  moving: boolean,
  manual: boolean,
  grace: number,
  dt: number,
) {
  return moving && !manual && grace <= 0
    ? yaw + angleDelta(face + Math.PI, yaw) * ease(dt, 3.2)
    : yaw;
}
export function votingZone(
  x: number,
  z: number,
  face: number,
  active: boolean,
  writing: { x: number; z: number; facing: number },
) {
  const d = Math.hypot(x - writing.x, z - writing.z);
  return active
    ? d < 1.55 && z > writing.z - 0.55
    : d < 0.86 &&
        z > writing.z - 0.45 &&
        Math.abs(angleDelta(face, writing.facing)) < 0.8;
}
export function movementVector(ix: number, iy: number, basis: number) {
  return {
    x: -Math.sin(basis) * iy + Math.cos(basis) * ix,
    z: -Math.cos(basis) * iy - Math.sin(basis) * ix,
  };
}

export type ThirdPersonMode='exploration-follow'|'challenge-follow'|'obstacle-interaction'|'puzzle-inspection'|'cinematic-introduction'|'results-presentation';
export const LOOK_IDLE_SECONDS=1.6;
export function cameraMode(phase:string,stage:string):ThirdPersonMode {
 if(phase==='results')return 'results-presentation';
 if(['introduction','tutorial','countdown'].includes(phase))return 'cinematic-introduction';
 if(stage==='puzzle')return 'puzzle-inspection';
 if(['crawl','beam','net'].includes(stage))return 'obstacle-interaction';
 return 'challenge-follow';
}
export function recenterYaw(yaw:number,face:number,manual:boolean,grace:number,dt:number){
 const delta=angleDelta(face+Math.PI,yaw);
 return manual||grace>0||Math.abs(delta)<.015?yaw:yaw+delta*ease(dt,3.2);
}
