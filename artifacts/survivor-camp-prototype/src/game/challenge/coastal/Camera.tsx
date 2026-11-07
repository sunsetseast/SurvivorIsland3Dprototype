import {useMemo,useRef,useEffect} from 'react';import {useFrame} from '@react-three/fiber';import * as T from 'three';
import {coastal} from './session';import {heightAt} from '../surface';import {runnerVisual} from './visual';
import {input,dbg} from '../../state';import {cameraMode,recenterYaw,ease} from '../../cameraController';import {CameraEnvelope} from '../../cameraEnvelope';
export function CoastalCamera(){
 const owned=useRef(false),envelope=useMemo(()=>new CameraEnvelope(),[]);
 const v=useMemo(()=>({position:new T.Vector3(),goal:new T.Vector3(),look:new T.Vector3(),smoothLook:new T.Vector3()}),[]);
 useEffect(()=>()=>{envelope.clear();owned.current=false;},[envelope]);
 useFrame(({camera,scene},rawDt)=>{
  const e=coastal.engine;if(!coastal.ownsControls||!e){owned.current=false;return;}
  const start=performance.now(),dt=Math.min(.05,rawDt),s=e.state,r=s.heat===0?e.player:s.runners.find(r=>r.heat===s.heat&&r.stage!=='finished')??s.runners.find(r=>r.heat===s.heat)!;
  const visual=runnerVisual(r,s.heat),mode=cameraMode(s.phase,r.stage),h=visual.y;
  if(!owned.current){v.position.copy(camera.position);v.smoothLook.set(r.x,h+1,r.z);owned.current=true;}
  input.lookGrace=Math.max(0,input.lookGrace-dt);
  const facing=r.stage==='beam'||r.stage==='net'||r.stage==='crawl'?0:(r as typeof r & {facing?:number}).facing??0;
  input.yaw=recenterYaw(input.yaw,facing,input.looking,input.lookGrace,dt);
  if(!input.looking&&input.lookGrace<=0)input.pitch+=(.34-input.pitch)*ease(dt,2);
  if(mode==='cinematic-introduction'){v.goal.set(-42,h+30,-72);v.look.set(-20,h+1,-8);}
  else if(mode==='results-presentation'){const winner=s.runners.find(q=>q.id===s.result?.[0]?.id)??r,staged=winner.heat!==s.heat,x=staged?-35-winner.lane*2:winner.x,z=staged?-53+winner.heat*2:winner.z,y=heightAt(x,z);v.goal.set(x-6,y+4.5,z-7);v.look.set(x,y+1.2,z);}
  else if(mode==='puzzle-inspection'){v.goal.set(r.x-5,h+4.2,12);v.look.set(r.x,h+1.8,19.2);}
  else {const distance=r.stage==='crawl'?5.2:6.2;v.look.set(r.x,h+(r.stage==='crawl'?.65:1.25),r.z);v.goal.set(v.look.x+Math.sin(input.yaw)*Math.cos(input.pitch)*distance,v.look.y+Math.sin(input.pitch)*distance,v.look.z+Math.cos(input.yaw)*Math.cos(input.pitch)*distance);}
  v.position.lerp(v.goal,ease(dt,8));
  // Authored wide shots are outside the playable envelope; follow modes always collide.
  const follows=mode==='challenge-follow'||mode==='obstacle-interaction';
  const safe=follows?envelope.resolve(scene,v.look,v.position,heightAt,dt):v.position.distanceTo(v.look);
  v.smoothLook.lerp(v.look,ease(dt,10));camera.position.copy(v.position);camera.lookAt(v.smoothLook);
  Object.assign(dbg,{cameraOwner:mode,cameraCpuMs:performance.now()-start,cameraDistance:safe,cameraBlocked:follows&&safe<5,x:r.x,y:h,z:r.z,face:facing,cx:camera.position.x,cy:camera.position.y,cz:camera.position.z});
 },1);return null;
}
