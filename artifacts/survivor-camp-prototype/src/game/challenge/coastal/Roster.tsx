import {useEffect,useMemo,useRef} from 'react';import {useFrame} from '@react-three/fiber';import * as T from 'three';
import {Contestant,type StagedPerson} from '../../Contestants';import {Survivor} from '../../Survivor';import {createCharacterMaterial} from '../../characterSurface';
import {runnerVisual} from './visual';import type {CoastalEngine,Runner} from './engine';
const flat=()=>0;
function Actor({r,engine,material}:{r:Runner;engine:CoastalEngine;material:T.Material}){
 const group=useRef<T.Group>(null),body=useRef<T.Group>(null),last=useRef({x:r.x,z:r.z});
 const npc=useMemo<StagedPerson>(()=>({id:r.id,x:0,y:0,z:0,facing:0,animation:'idle',speed:0,distance:0}),[r.id]);const motion=useRef({speed:0,running:false,distance:0,talking:false});
 useFrame((_,dt)=>{if(!group.current||!body.current)return;const v=runnerVisual(r,engine.state.heat),distance=Math.hypot(v.x-last.current.x,v.z-last.current.z),speed=dt>0?Math.min(5,distance/dt):0;last.current={x:v.x,z:v.z};group.current.position.set(v.x,v.y,v.z);group.current.rotation.y=0;body.current.scale.set(1,v.scaleY,1);body.current.rotation.set(v.scaleY<1?v.lean:0,0,v.scaleY<1?0:v.lean);motion.current.speed=speed;motion.current.running=speed>3;motion.current.distance+=distance;npc.speed=speed;npc.distance+=distance;npc.animation=v.working?'work':speed>.05?'walk':'idle';},-.15);
 return <group ref={group} name={`coastal-runner-${r.id}`}><group ref={body}>{r.id===0?<Survivor motion={motion}/>:<Contestant npc={npc} terrain={flat} time={()=>engine.state.clock} material={material}/>}</group></group>;
}
export function CoastalRoster({engine}:{engine:CoastalEngine}){const material=useMemo(createCharacterMaterial,[]);useEffect(()=>()=>material.dispose(),[material]);return <group name="coastal-competing-roster">{engine.state.runners.map(r=><Actor key={r.id} r={r} engine={engine} material={material}/>)}</group>;}
