import {useEffect,useMemo,useRef} from 'react';import {useFrame} from '@react-three/fiber';import * as T from 'three';
import {Contestant,type StagedPerson} from '../../Contestants';import {Survivor} from '../../Survivor';import {createCharacterMaterial} from '../../characterSurface';
import {runnerVisual} from './visual';import type {CoastalEngine,Runner} from './engine';import type {LocomotionMotion} from '../../locomotionPose';import {turnHeading} from '../../locomotion';
const flat=()=>0;
function Actor({r,engine,material}:{r:Runner;engine:CoastalEngine;material:T.Material}){
 const group=useRef<T.Group>(null),last=useRef({x:r.x,z:r.z}),face=useRef(0);
 const motion=useRef<LocomotionMotion>({speed:0,running:false,distance:0});
 const npc=useMemo<StagedPerson>(()=>({id:r.id,x:0,y:0,z:0,facing:0,animation:'idle',speed:0,distance:0,locomotion:motion.current}),[r.id]);
 useFrame((_,rawDt)=>{
  if(!group.current)return;const dt=Math.min(.05,rawDt),v=runnerVisual(r,engine.state.heat),dx=v.x-last.current.x,dz=v.z-last.current.z,distance=Math.hypot(dx,dz),active=r.heat===engine.state.heat;
  const travel=distance<.6?distance:0,speed=dt>0?Math.min(6.5,travel/dt):0;
  last.current.x=v.x;last.current.z=v.z;
  if(travel>.0001)face.current=turnHeading(face.current,dx,dz,dt);
  if(['crawl','beam','net'].includes(r.stage))face.current=turnHeading(face.current,0,1,dt);
  r.facing=face.current;group.current.position.set(v.x,v.y,v.z);group.current.rotation.set(0,face.current,0);
  const m=motion.current;m.speed=speed;m.running=speed>3.6;m.distance+=travel;m.posture=1;m.balance=r.balance;
  m.state=!active?'idle':r.stage==='crawl'?'crawl':r.stage==='beam'?'balance':r.stage==='net'?'climb':r.stage==='puzzle'?'interact':undefined;
  group.current.userData.locomotion=m;
  npc.speed=speed;npc.distance=m.distance;npc.animation=r.stage==='puzzle'?'work':speed>.05?'walk':'idle';
 },-.15);
 return <group ref={group} name={`coastal-runner-${r.id}`}><group name="proportional-articulated-body">{r.id===0?<Survivor motion={motion}/>:<Contestant npc={npc} terrain={flat} time={()=>engine.state.clock} material={material}/>}</group></group>;
}
export function CoastalRoster({engine}:{engine:CoastalEngine}){const material=useMemo(createCharacterMaterial,[]);useEffect(()=>()=>material.dispose(),[material]);return <group name="coastal-competing-roster">{engine.state.runners.map(r=><Actor key={r.id} r={r} engine={engine} material={material}/>)}</group>;}
