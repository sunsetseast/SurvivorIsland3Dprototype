import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { Contestant, type StagedPerson } from "../../Contestants";
import { Survivor } from "../../Survivor";
import { createCharacterMaterial } from "../../characterSurface";
import { STILLWATER_STATIONS } from "../individualCourse";
import { heightAt } from "../surface";
import { stationVisual } from "./visual";
import type { StillwaterEngine, Entrant } from "./engine";
const flat=()=>0;
function Participant({entrant,engine,material}:{entrant:Entrant;engine:()=>StillwaterEngine|null;material:T.Material}) {
  const group=useRef<T.Group>(null);
  const npc=useMemo<StagedPerson>(()=>({id:entrant.id,x:0,y:0,z:0,facing:Math.PI,animation:"idle",speed:0,distance:0}),[entrant.id]);
  const motion=useRef({speed:0,running:false,distance:0,talking:false});
  useFrame((_,dt)=>{
    const e=engine(),c=e?.state.competitors.find(c=>c.id===entrant.id);if(!c||!group.current)return;
    const s=STILLWATER_STATIONS[c.station]!,v=stationVisual(c,e!.state.elapsed);
    const spectator=c.eliminatedAt!==null;
    const x=spectator?30:s.x,z=spectator?55+c.station*2.2:s.z,y=heightAt(x,z)+(spectator?0:.42);
    group.current.position.lerp(new T.Vector3(x,y,z),1-Math.exp(-Math.min(dt,.05)*6));
    group.current.rotation.set(0,entrant.id===0?Math.PI:0,spectator?0:v.lean);
    npc.animation=spectator?"idle":"work";
  },-.2);
  const c=engine()?.state.competitors.find(c=>c.id===entrant.id),s=STILLWATER_STATIONS[c?.station??0]!;
  return <group ref={group} name={`stillwater-contestant-${entrant.id}`} position={[s.x,heightAt(s.x,s.z)+.42,s.z]}>
    {entrant.id===0?<Survivor motion={motion}/>:<Contestant npc={npc} terrain={flat} time={()=>engine()?.state.elapsed??0} material={material}/>}
  </group>;
}
export function StillwaterRoster({engine,roster}:{engine:()=>StillwaterEngine|null;roster:readonly Entrant[]}) {
  const material=useMemo(createCharacterMaterial,[]);useEffect(()=>()=>material.dispose(),[material]);
  return <group name="stillwater-competing-roster">{roster.map(p=><Participant key={p.id} entrant={p} engine={engine} material={material}/>)}</group>;
}
