import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { STILLWATER_STATIONS } from "../individualCourse";
import { heightAt } from "../surface";
import type { StillwaterEngine } from "./engine";
import { stationVisual } from "./visual";
/** Five instanced draw groups for all eight stations. No per-frame geometry or material allocation. */
export function StillwaterStations({ engine, low }: { engine:()=>StillwaterEngine|null; low:boolean }) {
  const boards=useRef<T.InstancedMesh>(null),objects=useRef<T.InstancedMesh>(null),buckets=useRef<T.InstancedMesh>(null),ropes=useRef<T.InstancedMesh>(null),bands=useRef<T.InstancedMesh>(null);
  const assets=useMemo(()=>({box:new T.BoxGeometry(1,1,1),bucket:new T.CylinderGeometry(.25,.19,.38,low?8:12,1,true),rope:new T.CylinderGeometry(.025,.025,1,low?5:7),band:new T.TorusGeometry(.232,.023,4,low?8:12),wood:new T.MeshStandardMaterial({color:"#b98d55",roughness:.92}),ceramic:new T.MeshStandardMaterial({color:"#dba56c",roughness:.85}),dark:new T.MeshStandardMaterial({color:"#67513d",roughness:.96}),fiber:new T.MeshStandardMaterial({color:"#d8c195",roughness:1})}),[low]);
  useEffect(()=>()=>{Object.values(assets).forEach(a=>a.dispose());},[assets]);
  const tool=useMemo(()=>({o:new T.Object3D(),a:new T.Vector3(),b:new T.Vector3(),d:new T.Vector3(),up:new T.Vector3(0,1,0)}),[]);
  useFrame(()=>{
    const state=engine()?.state;
    const put=(mesh:T.InstancedMesh|null,i:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,rz=0,rx=0)=>{tool.o.position.set(x,y,z);tool.o.rotation.set(rx,0,rz);tool.o.scale.set(sx,sy,sz);tool.o.updateMatrix();mesh?.setMatrixAt(i,tool.o.matrix);};
    for(const s of STILLWATER_STATIONS){const {x,z,index:i}=s,y=heightAt(x,z),c=state?.competitors.find(c=>c.station===i),v=stationVisual(c,state?.elapsed??0);
      put(boards.current,i*2,x,y+.36,z,.5,.12,1.23,v.lean);
      put(boards.current,i*2+1,x+1.8,y+.85,z-.1,1.18,.14,1.32,v.tilt);
      for(let j=0;j<9;j++){const visible=j<v.count;const fall=v.fall*(j+1)*.23;put(objects.current,i*9+j,x+1.8+Math.sin(j*2.4)*.025+v.tilt*j*.12+fall,y+.99+j*.13+v.lift-fall*.5,z-.1+fall*.2,visible?.45-j*.018:0,visible?.11:0,visible?.45-j*.018:0,v.tilt+v.wobble*j+v.fall*j*.2);}
      const by=y+2.43+v.tilt*.4;
      put(buckets.current,i,x+.6,by,z+.6,1,1,1);
      for(let j=0;j<2;j++)put(bands.current,i*2+j,x+.6,by+(j?-.14:.14),z+.6,1,1,1,0,Math.PI/2);
      tool.a.set(x+.6,y+3.03,z+.6);tool.b.set(x+.6,by+.17,z+.6);tool.d.subVectors(tool.b,tool.a);const length=tool.d.length();tool.o.position.copy(tool.a).add(tool.b).multiplyScalar(.5);tool.o.quaternion.setFromUnitVectors(tool.up,tool.d.normalize());tool.o.scale.set(1,length,1);tool.o.updateMatrix();ropes.current?.setMatrixAt(i,tool.o.matrix);
    }
    for(const m of [boards,objects,buckets,ropes,bands])if(m.current)m.current.instanceMatrix.needsUpdate=true;
  },-.3);
  return <group name="stillwater-interactive-stations">
    <instancedMesh ref={boards} args={[assets.box,assets.wood,16]} frustumCulled={false}/>
    <instancedMesh ref={objects} args={[assets.box,assets.ceramic,72]} frustumCulled={false}/>
    <instancedMesh ref={buckets} args={[assets.bucket,assets.dark,8]} frustumCulled={false}/>
    <instancedMesh ref={ropes} args={[assets.rope,assets.fiber,8]} frustumCulled={false}/>
    <instancedMesh ref={bands} args={[assets.band,assets.fiber,16]} frustumCulled={false}/>
  </group>;
}
