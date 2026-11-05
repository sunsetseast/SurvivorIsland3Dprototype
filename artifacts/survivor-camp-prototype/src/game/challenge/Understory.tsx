import { useEffect, useMemo, useRef } from "react";
import * as T from "three";
import { TREES } from "./environmentLayout";
import { heightAt } from "./surface";
/** Opaque, double-sided pinnate fronds: two instanced draws, with no alpha layers or per-plant physics. */
function fronds(pandanus:boolean) {
  const p:number[]=[],colors:number[]=[],green=new T.Color(pandanus?"#4c713b":"#42703d");
  const tri=(a:T.Vector3,b:T.Vector3,c:T.Vector3)=>{for(const v of [a,b,c]){p.push(v.x,v.y,v.z);const k=.82+v.y*.16;colors.push(green.r*k,green.g*k,green.b*k);}};
  for(let f=0;f<(pandanus?9:7);f++) {
    const a=f/(pandanus?9:7)*Math.PI*2,len=pandanus?1.35:1.6;
    const spine=(t:number)=>new T.Vector3(Math.cos(a)*len*t,(pandanus?.12:.04)+Math.sin(t*Math.PI)*(.8+(f%3)*.13),Math.sin(a)*len*t);
    for(let j=1;j<=5;j++) {
      const t=j/6,base=spine(t),tip=spine(Math.min(1,t+.17)),w=(1-t)*.36;
      if(pandanus){const side=new T.Vector3(Math.cos(a+Math.PI/2)*w*.6,0,Math.sin(a+Math.PI/2)*w*.6);tri(base.clone().add(side),base.clone().sub(side),tip);}
      else for(const sign of [-1,1]) {
        const outer=base.clone().add(new T.Vector3(Math.cos(a+sign*1.2)*w,-.08,Math.sin(a+sign*1.2)*w));
        tri(base,outer,tip);tri(outer,spine(Math.min(1,t+.09)).add(new T.Vector3(Math.cos(a+sign*1.2)*w*.5,.02,Math.sin(a+sign*1.2)*w*.5)),tip);
      }
    }
  }
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(p,3));g.setAttribute("color",new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
function Patch({pandanus}:{pandanus:boolean}) {
  const ref=useRef<T.InstancedMesh>(null),geometry=useMemo(()=>fronds(pandanus),[pandanus]);
  const material=useMemo(()=>new T.MeshStandardMaterial({vertexColors:true,roughness:.95,side:T.DoubleSide}),[]);
  const plants=useMemo(()=>TREES.filter((_,i)=>pandanus?i%3===0:i%3!==0).flatMap(p=>[0,1].map(j=>({...p,x:p.x+Math.cos(p.turn+j*2.4)*1.8,z:p.z+Math.sin(p.turn+j*2.4)*1.8}))),[pandanus]);
  useEffect(()=>{
    const m=ref.current;if(!m)return;const o=new T.Object3D();plants.forEach((p,i)=>{o.position.set(p.x,heightAt(p.x,p.z)+.025,p.z);o.rotation.y=p.turn;o.scale.setScalar(.85+p.scale*.65);o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();
    return ()=>{m.dispose();geometry.dispose();material.dispose();};
  },[geometry,plants,material]);
  return <instancedMesh ref={ref} args={[geometry,material,plants.length]} dispose={null}/>;
}
export function Understory(){return <group name="challenge-tropical-understory"><Patch pandanus={false}/><Patch pandanus/></group>;}
