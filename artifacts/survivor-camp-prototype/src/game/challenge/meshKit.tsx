import { useEffect, useMemo } from "react";
import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { type Piece } from "./equipment";
export { box, beam, sphere, WOOD, CUT, ROPE, DARK, TEAL, OCHRE, type Piece } from "./equipment";
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
  return <mesh name={name} geometry={g} userData={{cameraBlocker:blocker,cameraPieces:blocker?pieces:undefined}} receiveShadow><meshStandardMaterial vertexColors roughness={0.92}/></mesh>;
}
