import { mainCourse } from "./mainCourse";
import { oceanCourse } from "./oceanCourse";
import { jungleCourse } from "./jungleCourse";
import { individualCourse } from "./individualCourse";
import { validateSpawn } from "../locations/spawn";
import { heightAt, walkableWithEquipment } from "./surface";
import type { ChallengeSetup } from "./equipment";
export const CONFIGURATIONS = {
  "beach-obstacle": { name:"Main Beach · Coastal Traverse", build:mainCourse, playable:true, description:"Race the crawl, beam and net, then assemble the Karst Mosaic." },
  "ocean-relay": { name:"Ocean · Tidebound Relay", build:oceanCourse, playable:false, description:"Inspect the offshore platforms, buoy lanes and relay equipment." },
  "jungle-net": { name:"Jungle · Canopy Passage", build:jungleCourse, playable:false, description:"Explore the rope towers, beams and forest competition course." },
  "individual-balance": { name:"Individual · Stillwater Balance", build:individualCourse, playable:true, description:"Practice balance and stacking. Compete against the existing contestants." },
} as const;
export type ChallengeId = keyof typeof CONFIGURATIONS;
export const isChallengeId = (id:unknown):id is ChallengeId => typeof id==="string" && Object.hasOwn(CONFIGURATIONS,id);
export function validateSetup(model:ChallengeSetup) {
  const surface={height:heightAt,walkable:(x:number,z:number)=>walkableWithEquipment(x,z,model.solids)};
  for(const p of [model.view,model.host,model.finish,...model.starts,...model.contestants])validateSpawn(p,surface);
  if(!model.pieces.length || model.cleanup!=="unmount-and-dispose")throw Error("Incomplete challenge equipment configuration.");
  for(const part of model.pieces) {
    const coordinates=part.kind==="beam"?[...part.a,...part.b,part.radius]:[...part.at,...part.size];
    if(!coordinates.every(Number.isFinite))throw Error("Non-finite equipment geometry.");
    if(part.kind==="beam"?(part.radius<=0 || Math.hypot(...part.a.map((v,i)=>v-part.b[i]!) as [number,number,number])<0.001):part.size.some(v=>v<=0))throw Error("Degenerate equipment geometry.");
  }
  return model;
}
