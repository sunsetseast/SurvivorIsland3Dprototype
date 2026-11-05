import { pose, ZONES } from "./layout";
import { heightAt } from "./surface";
import { box, beam, deck, net, binding, WOOD, CUT, ROPE, TEAL, OCHRE, type Piece, type Solid, type ChallengeSetup } from "./equipment";

export function jungleCourse():ChallengeSetup {
  const p:Piece[]=[],solids:Solid[]=[];
  for(const [x,color] of [[55,TEAL],[68,OCHRE]] as const) {
    const y=heightAt(x,-23);
    deck(p,x,-41,y,4.6,3,0.3);solids.push({x,z:-41,hx:2.4,hz:1.6});
    // Four-post rope tower with inclined net ascent and a rear ladder descent.
    for(const sx of [-1,1])for(const sz of [-1,1]) {
      const xx=x+sx*2.1,zz=-32+sz*2.7;p.push(beam([xx,y-0.15,zz],[xx,y+3.5,zz],0.14,WOOD));binding(p,xx,y+3.2,zz);
    }
    for(const z of [-34.7,-29.3])p.push(beam([x-2.3,y+3.35,z],[x+2.3,y+3.35,z],0.15,WOOD));
    for(const sx of [-1,1])p.push(beam([x+sx*2.1,y+0.12,-34.7],[x+sx*2.1,y+3.3,-29.3],0.075,WOOD));
    net(p,[x-1.9,y+0.15,-35.5],[x+1.9,y+0.15,-35.5],[x-1.9,y+3.3,-30.4],[x+1.9,y+3.3,-30.4],12,9);
    for(let j=0;j<8;j++)p.push(beam([x-1.7,y+0.25+j*0.4,-28.9],[x+1.7,y+0.25+j*0.4,-28.9],0.065,CUT));
    solids.push({x,z:-32,hx:2.5,hz:3.7});
    // Taut rope traversal gate; suspended ropes have knots and firm crossbar anchors.
    for(const sx of [-1,1])for(const z of [-24,-18])p.push(beam([x+sx*2,y-0.1,z],[x+sx*2,y+2.55,z],0.12,WOOD));
    for(const sx of [-1,1])p.push(beam([x+sx*2,y+2.45,-24],[x+sx*2,y+2.45,-18],0.11,WOOD));
    for(let i=0;i<4;i++){
      const z=-23+i*1.5;p.push(beam([x-2.1,y+2.45,z],[x+2.1,y+2.45,z],0.09,WOOD));
      for(const sx of [-1,1]){const xx=x+sx*(i%2?0.9:1.5);p.push(beam([xx,y+2.4,z],[xx,y+0.5,z+0.12],0.038,ROPE));binding(p,xx,y+1,z+0.12);}
    }
    solids.push({x,z:-21,hx:2.2,hz:3.2});
    // Low crawl passage has diagonal timber supports rather than simulated cloth.
    for(const sx of [-1,1])for(const z of [-14,-10])p.push(beam([x+sx*1.8,y-0.1,z],[x+sx*1.8,y+0.95,z],0.1,WOOD));
    for(let i=0;i<6;i++)p.push(beam([x-1.9,y+0.95,-14+i*.8],[x+1.9,y+0.95,-14+i*.8],0.07,CUT));
    p.push(beam([x-1.8,y+.9,-14],[x-1.8,y+.12,-10],0.06,WOOD));solids.push({x,z:-12,hx:2,hz:2.2});
    p.push(beam([x-1.1,y+.45,-6],[x+1.1,y+.45,-2],0.14,color));
    for(const z of [-5.5,-2.5])p.push(box([x,y+.19,z],[2,.38,.35],WOOD));solids.push({x,z:-4,hx:1.25,hz:2.2});
    deck(p,x,1,y,4.6,2,0.25);p.push(box([x,y+.28,1],[3.9,.06,.75],color));solids.push({x,z:1,hx:2.4,hz:1.1});
  }
  return {id:"jungle-net",zone:"jungle",name:"Canopy Passage",pieces:p,solids,
    starts:[pose(55,-45),pose(68,-45)],contestants:Array.from({length:10},(_,i)=>pose(45.5+i*3,-47)),
    host:pose(43,-18,-Math.PI/2),finish:pose(61,1),view:ZONES.jungle.view,
    assets:[],movement:"walking",cleanup:"unmount-and-dispose"};
}
