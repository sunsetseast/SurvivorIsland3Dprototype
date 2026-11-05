import { useEffect, useMemo } from "react";
import * as T from "three";
import { Assembly, beam, box, sphere, WOOD, CUT, ROPE, type Piece } from "./meshKit";
import { OUTCROPS, TREES } from "./environmentLayout";
import { heightAt } from "./surface";

const SIGNS=[{x:31,z:-48,text:"JUNGLE →",turn:0.4},{x:14,z:-35,text:"← BEACH · OCEAN",turn:0},{x:31,z:30,text:"INDIVIDUAL →",turn:-0.4}];
function Sign({x,z,text,turn}:{x:number;z:number;text:string;turn:number}) {
  const texture=useMemo(()=>{
    const c=document.createElement("canvas");c.width=512;c.height=96;const g=c.getContext("2d")!;
    g.fillStyle="#73593c";g.fillRect(0,0,512,96);g.fillStyle="#efe1b8";g.font="600 33px sans-serif";g.textAlign="center";g.fillText(text,256,61);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
  },[text]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={[x,heightAt(x,z)+1.65,z+0.061]} rotation-y={turn}><planeGeometry args={[2.3,0.43]}/><meshStandardMaterial map={texture} roughness={1} side={T.DoubleSide}/></mesh>;
}
export function InlandEnvironment({low}:{low:boolean}) {
  const pieces=useMemo(()=>{
    const p:Piece[]=[];
    for(const r of OUTCROPS){const y=heightAt(r.x,r.z);p.push(sphere([r.x,y+r.r*0.4,r.z],[r.r,r.r*0.8,r.r*0.8],"#999b86"),sphere([r.x+r.r*0.4,y+r.r*0.2,r.z-r.r*0.5],[r.r*0.7,r.r*0.45,r.r*0.65],"#ada78d"));}
    // Embedded roots and leaf litter remain low enough to step across.
    for(const t of TREES){const y=heightAt(t.x,t.z);for(let i=0;i<3;i++){const a=t.turn+i*2.1;p.push(beam([t.x,y+0.28,t.z],[t.x+Math.cos(a)*1.1,y+0.025,t.z+Math.sin(a)*1.1],0.065,WOOD));}}
    for(const s of SIGNS){const y=heightAt(s.x,s.z);p.push(beam([s.x,y-0.1,s.z],[s.x,y+1.8,s.z],0.065,WOOD),box([s.x,y+1.65,s.z],[2.4,0.5,0.12],CUT,s.turn));}
    // Distinct host and waiting edges frame the two clearings without filling their competition footprints.
    for(const [x,z] of [[40,-14],[28,70]]) {
      const y=heightAt(x!,z!);p.push(box([x!,y+0.025,z!],[2.3,0.05,1.7],"#b39c6e"));
      for(let i=0;i<4;i++)p.push(box([x!+i*1.8-2.7,y+0.018,z!+3.5],[1.1,0.036,1.1],"#929277"));
    }
    // Ocean shore assembly line and retrieval-finish marker stay on supported dry sand.
    const y=heightAt(-43,-33);p.push(box([-43,y+0.02,-33],[2.4,0.04,8],"#8f9d88"));
    for(const z of [-38,-28]){const h=heightAt(-45,z);p.push(beam([-45,h,z],[-45,h+1.4,z],0.075,WOOD),beam([-45,h+1.2,z],[-44.5,h+1.2,z],0.03,ROPE));}
    return p;
  },[]);
  return <group name="challenge-inland-clearing-detail"><Assembly pieces={pieces} low={low} name="challenge-outcrops-roots-and-staging"/>{SIGNS.map(s=><Sign key={s.text} {...s}/>)}</group>;
}
