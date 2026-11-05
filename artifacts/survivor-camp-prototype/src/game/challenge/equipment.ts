import type { Pose } from "../locations/registry";
import type { ZoneId } from "./layout";
export type V3 = [number,number,number];
export type Piece =
  | { kind:"box"; at:V3; size:V3; color:string; turn?:number }
  | { kind:"beam"; a:V3; b:V3; radius:number; color:string }
  | { kind:"sphere"; at:V3; size:V3; color:string };
export const box = (at:V3,size:V3,color:string,turn=0):Piece => ({kind:"box",at,size,color,turn});
export const beam = (a:V3,b:V3,radius:number,color:string):Piece => ({kind:"beam",a,b,radius,color});
export const sphere = (at:V3,size:V3,color:string):Piece => ({kind:"sphere",at,size,color});
export const WOOD="#92704a", CUT="#b38b54", ROPE="#d4bc88", DARK="#594537", TEAL="#267f86", OCHRE="#c2763f";
export type Solid = {x:number;z:number;hx:number;hz:number};
export type ChallengeSetup = {
  id:string; zone:ZoneId; name:string; pieces:Piece[]; solids:Solid[];
  starts:Pose[]; contestants:Pose[]; host:Pose; finish:Pose; view:Pose;
  assets:readonly string[]; movement:"walking"|"swimming-deferred";
  cleanup:"unmount-and-dispose";
};
export const blockedBy = (x:number,z:number,solids:readonly Solid[]) => solids.some(s=>Math.abs(x-s.x)<s.hx+0.55 && Math.abs(z-s.z)<s.hz+0.55);
const lerp=(a:V3,b:V3,t:number):V3=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
export function net(p:Piece[],a:V3,b:V3,c:V3,d:V3,rows=8,columns=8) {
  for(let i=0;i<=rows;i++)p.push(beam(lerp(a,c,i/rows),lerp(b,d,i/rows),0.025,ROPE));
  for(let i=0;i<=columns;i++)p.push(beam(lerp(a,b,i/columns),lerp(c,d,i/columns),0.025,ROPE));
}
export function binding(p:Piece[],x:number,y:number,z:number) {
  for(let i=0;i<3;i++){const yy=y+(i-1)*0.055;p.push(beam([x-0.16,yy,z-0.15],[x+0.16,yy,z-0.15],0.026,ROPE),beam([x+0.16,yy,z-0.15],[x+0.16,yy,z+0.15],0.026,ROPE),beam([x+0.16,yy,z+0.15],[x-0.16,yy,z+0.15],0.026,ROPE));}
}
/** A deck has individual planks, a visible subframe, embedded legs and diagonal bracing. */
export function deck(p:Piece[],x:number,z:number,y:number,width:number,depth:number,top:number,color=CUT) {
  const n=Math.ceil(depth/0.28);
  for(let i=0;i<n;i++)p.push(box([x,y+top-0.08,z-depth/2+(i+0.5)*depth/n],[width,0.16,depth/n-0.025],color));
  for(const side of [-1,1]){
    const xx=x+side*(width/2-0.2);p.push(beam([xx,y+top-0.24,z-depth/2],[xx,y+top-0.24,z+depth/2],0.1,WOOD));
    for(const end of [-1,1]){const zz=z+end*(depth/2-0.25);p.push(beam([xx,y-0.18,zz],[xx,y+top-0.13,zz],0.12,WOOD));binding(p,xx,y+top-0.2,zz);}
    if(top>0.65)p.push(beam([xx,y+0.1,z-depth/2+0.25],[xx,y+top-0.25,z+depth/2-0.25],0.065,WOOD));
  }
}
