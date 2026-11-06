import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { stillwater } from "./session";
import { STILLWATER_STATIONS } from "../individualCourse";
import { heightAt } from "../surface";
/** Runs after the existing exploration camera, retaining its safe return pose underneath. */
export function StillwaterCamera(){
  const previous=useRef(false),returning=useRef(false);
  const v=useMemo(()=>({position:new T.Vector3(),rotation:new T.Quaternion(),goal:new T.Vector3(),look:new T.Vector3(),matrix:new T.Matrix4(),q:new T.Quaternion(),up:new T.Vector3(0,1,0)}),[]);
  useFrame(({camera},dt)=>{
    const own=stillwater.ownsControls;
    if(own&&!previous.current){v.position.copy(camera.position);v.rotation.copy(camera.quaternion);returning.current=false;}
    if(!own&&previous.current)returning.current=true;
    previous.current=own;
    if(!own&&!returning.current)return;
    const s=stillwater.engine?.state,phase=s?.phase==="paused"?s.resumePhase:s?.phase;
    if(own){
      const active=phase==="active"||phase==="countdown";
      const winner=s?.result?.winnerIds[0],station=STILLWATER_STATIONS[s?.competitors.find(c=>c.id===winner)?.station??0]!;
      const ground=heightAt(38,56);
      v.goal.set(active?33:32,ground+(active?4.6:7.5),active?49:78);
      v.look.set(active?39.5:37,ground+1.5,active?56:60);
      if(phase==="player-eliminated"){v.goal.set(27,ground+7,48);v.look.set(45,ground+1.7,62);}
      if(phase==="results"){v.goal.set(station.x-9,ground+5.7,station.z-10);v.look.set(station.x-5,ground+1.5,station.z+1);}
      v.matrix.lookAt(v.goal,v.look,v.up);v.q.setFromRotationMatrix(v.matrix);
    }else{v.goal.copy(camera.position);v.q.copy(camera.quaternion);}
    const k=1-Math.exp(-Math.min(dt,.05)*(own?3.5:5));v.position.lerp(v.goal,k);v.rotation.slerp(v.q,k);
    camera.position.copy(v.position);camera.quaternion.copy(v.rotation);
    if(!own&&v.position.distanceToSquared(v.goal)<.0004&&v.rotation.angleTo(v.q)<.005)returning.current=false;
  },1);
  return null;
}
