import { pose, ZONES } from "./layout";
import { heightAt } from "./surface";
import { box, beam, deck, binding, WOOD, CUT, ROPE, TEAL, OCHRE, DARK, type Piece, type Solid, type ChallengeSetup } from "./equipment";

export function individualCourse():ChallengeSetup {
  const p:Piece[]=[],solids:Solid[]=[],starts=[];
  for(let i=0;i<8;i++) {
    const x=38+(i%4)*7,z=56+Math.floor(i/4)*11,y=heightAt(x,z),color=i%2?TEAL:OCHRE;
    // Narrow balancing footboard above an independent, broad timber support.
    p.push(box([x,y+0.1,z],[1.5,0.2,1.8],WOOD));deck(p,x,z,y,0.48,1.2,0.32,color);
    for(const side of [-1,1]){
      const xx=x+side*1.05;p.push(beam([xx,y-0.18,z+0.6],[xx,y+3.05,z+0.6],0.11,WOOD),beam([xx,y+1.25,z+0.6],[xx,y+0.02,z+1.5],0.07,WOOD));binding(p,xx,y+2.9,z+0.6);
    }
    p.push(beam([x-1.2,y+3,z+0.6],[x+1.2,y+3,z+0.6],0.12,WOOD));
    // Tether and a small counterweight bucket show the future endurance mechanism.
    p.push(beam([x-0.35,y+2.25,z],[x-0.35,y+3.03,z+0.6],0.028,ROPE),beam([x-0.35,y+3.03,z+0.6],[x+0.6,y+3.03,z+0.6],0.028,ROPE),beam([x+0.6,y+3.03,z+0.6],[x+0.6,y+2.62,z+0.6],0.028,ROPE));
    p.push(beam([x+0.6,y+2.25,z+0.6],[x+0.6,y+2.62,z+0.6],0.25,CUT),box([x+0.6,y+2.65,z+0.6],[0.56,.06,.56],DARK));
    // Separate stack plinth, lightweight original blocks and a resting placement wand.
    deck(p,x+1.8,z-0.1,y,1.15,1.3,0.85);
    for(let j=0;j<5;j++)p.push(box([x+1.8+Math.sin(j*1.8)*0.045,y+0.93+j*0.12,z-0.1],[0.52-j*0.045,0.105,0.52-j*0.045],j%2?color:CUT,j*0.24));
    p.push(beam([x+1.4,y+0.9,z-0.5],[x+2.2,y+1,z+0.3],0.025,WOOD));
    p.push(box([x,y+2.85,z+0.51],[0.42,0.28,0.08],color));
    solids.push({x:x+0.6,z:z+0.2,hx:1.85,hz:1.4});starts.push(pose(x,z-2.9));
  }
  return {id:"individual-balance",zone:"individual",name:"Stillwater Balance",pieces:p,solids,
    starts,contestants:starts.map(p=>({...p})),host:pose(28,61,-Math.PI/2),finish:pose(49,75),view:ZONES.individual.view,
    assets:[],movement:"walking",cleanup:"unmount-and-dispose"};
}
