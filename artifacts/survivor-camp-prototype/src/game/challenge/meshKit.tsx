import { useEffect, useMemo } from "react";
import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type V3 = [number,number,number];
export type Piece =
  | { kind:"box"; at:V3; size:V3; color:string; turn?:number }
  | { kind:"beam"; a:V3; b:V3; radius:number; color:string }
  | { kind:"sphere"; at:V3; size:V3; color:string };
export const box = (at:V3,size:V3,color:string,turn=0):Piece => ({kind:"box",at,size,color,turn});
export const beam = (a:V3,b:V3,radius:number,color:string):Piece => ({kind:"beam",a,b,radius,color});
export const sphere = (at:V3,size:V3,color:string):Piece => ({kind:"sphere",at,size,color});
export const WOOD="#92704a", CUT="#b38b54", ROPE="#d4bc88", DARK="#594537", TEAL="#267f86", OCHRE="#c2763f";
export function geometryFor(pieces:Piece[],low:boolean) {
  const parts=pieces.map(p=>{
    let g:T.BufferGeometry;
    if(p.kind==="beam") {
      const a=new T.Vector3(...p.a),b=new T.Vector3(...p.b),d=b.clone().sub(a);
      g=new T.CylinderGeometry(p.radius*0.93,p.radius,d.length(),low?5:7);
      g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));
      const center=a.add(b).multiplyScalar(0.5);g.translate(center.x,center.y,center.z);
    } else {
      g=p.kind==="box"?new T.BoxGeometry(...p.size):new T.SphereGeometry(1,low?7:10,low?5:7).scale(...p.size);
      if(p.kind==="box")g.rotateY(p.turn??0);
      g.translate(...p.at);
    }
    const color=new T.Color(p.color),pos=g.getAttribute("position"),c=new Float32Array(pos.count*3);
    for(let i=0;i<pos.count;i++) {
      const variation=0.94+0.08*Math.sin(pos.getX(i)*8+pos.getY(i)*11+pos.getZ(i)*7);
      c[i*3]=color.r*variation;c[i*3+1]=color.g*variation;c[i*3+2]=color.b*variation;
    }
    g.setAttribute("color",new T.BufferAttribute(c,3));return g;
  });
  if(!parts.length)return new T.BufferGeometry();
  const merged=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());
  merged.computeBoundingSphere();return merged;
}
export function Assembly({pieces,low,name,blocker=false}:{pieces:Piece[];low:boolean;name:string;blocker?:boolean}) {
  const g=useMemo(()=>geometryFor(pieces,low),[pieces,low]);
  useEffect(()=>()=>g.dispose(),[g]);
  return <mesh name={name} geometry={g} userData={{cameraBlocker:blocker}} receiveShadow><meshStandardMaterial vertexColors roughness={0.92}/></mesh>;
}
