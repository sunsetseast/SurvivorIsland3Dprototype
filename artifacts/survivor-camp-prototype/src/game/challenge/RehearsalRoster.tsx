import { useEffect, useMemo } from "react";
import { camp } from "../CampRuntime";
import { Contestant, type StagedPerson } from "../Contestants";
import { createCharacterMaterial } from "../characterSurface";
import { heightAt } from "./surface";
import type { ChallengeSetup } from "./equipment";
/** Render existing identities at reserved rehearsal marks. No provider/NPC simulation is created or advanced. */
export function RehearsalRoster({model}:{model:ChallengeSetup}) {
  const material=useMemo(createCharacterMaterial,[]);
  useEffect(()=>()=>material.dispose(),[material]);
  const people=useMemo(()=>camp.npcs.slice(0,model.contestants.length).map((source,i):StagedPerson=>{
    const p=model.contestants[i]!;
    return {id:source.id,x:p.x,y:heightAt(p.x,p.z),z:p.z,facing:p.facing,animation:"idle",speed:0,distance:0};
  }),[model]);
  return <group name="challenge-staged-roster">{people.map(npc=><Contestant key={npc.id} npc={npc} terrain={heightAt} time={()=>0} material={material}/>)}</group>;
}
