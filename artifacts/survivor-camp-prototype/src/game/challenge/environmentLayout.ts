import { ROUTES, ARRIVAL, ZONES, shoreX } from "./layout";

export const KARSTS = [
  { x: -37, z: -108, rx: 24, rz: 17, h: 91, seed: 2 },
  { x: -2, z: -113, rx: 25, rz: 17, h: 113, seed: 9 },
  { x: 35, z: -107, rx: 23, rz: 19, h: 82, seed: 17 },
  { x: 95, z: -91, rx: 27, rz: 24, h: 104, seed: 23 },
  { x: 115, z: -25, rx: 17, rz: 28, h: 72, seed: 32 },
  { x: 112, z: 34, rx: 19, rz: 29, h: 93, seed: 47 },
  { x: 88, z: 109, rx: 28, rz: 19, h: 86, seed: 51 },
  { x: 23, z: 113, rx: 33, rz: 20, h: 101, seed: 62 },
  { x: -28, z: 110, rx: 24, rz: 18, h: 77, seed: 79 },
] as const;
export const segmentDistance = (x: number, z: number, a: {x:number;z:number}, b: {x:number;z:number}) => {
  const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
};
export function trailDistance(x:number,z:number) {
  let d=Infinity;
  for(const route of ROUTES)for(let i=1;i<route.length;i++)d=Math.min(d,segmentDistance(x,z,route[i-1]!,route[i]!));
  return d;
}
export const inKarst = (x:number,z:number,padding=0) => KARSTS.some(k=>((x-k.x)/(k.rx*1.08+padding))**2+((z-k.z)/(k.rz*1.08+padding))**2<1);
const hash = (n:number) => { const x=Math.sin(n*127.1+13.3)*43758.5453;return x-Math.floor(x); };
export const TREES = Array.from({length:650},(_,i)=>({
  x:-48+hash(i*4)*155,z:-101+hash(i*4+1)*205,scale:0.48+hash(i*4+2)*0.5,turn:hash(i*4+3)*Math.PI*2,kind:i%4===0?"palm":"canopy",
})).filter(p=>p.x>shoreX(p.z)+17 && !inKarst(p.x,p.z,1.5) && trailDistance(p.x,p.z)>6 &&
  Math.hypot(p.x-ARRIVAL.x,p.z-ARRIVAL.z)>13 &&
  !(p.x<14 && p.z>-56 && p.z<43) &&
  !(Math.abs(p.x-ZONES.jungle.center.x)<22 && Math.abs(p.z-ZONES.jungle.center.z)<25) &&
  !(Math.abs(p.x-ZONES.individual.center.x)<24 && Math.abs(p.z-ZONES.individual.center.z)<20)
).filter((p,i,a)=>!a.slice(0,i).some(q=>Math.hypot(p.x-q.x,p.z-q.z)<3.8));
