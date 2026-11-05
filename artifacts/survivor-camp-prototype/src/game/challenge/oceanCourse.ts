import { pose, ZONES } from "./layout";
import { heightAt } from "./surface";
import { box, beam, sphere, deck, binding, WOOD, CUT, ROPE, TEAL, OCHRE, DARK, type Piece, type ChallengeSetup } from "./equipment";

export const RELAY_PLATFORMS = [{x:-72,z:-24},{x:-85,z:-9},{x:-98,z:7}];
export function oceanCourse():ChallengeSetup {
  const p:Piece[]=[];
  const y=heightAt(-50,-12);deck(p,-50,-12,y,4.5,8,0.42);
  // Shore entry is a viewing/staging deck, not a bridge to unsupported water.
  for(const z of [-15.6,-8.4])p.push(beam([-52.05,y+0.4,z],[-52.05,y+1.5,z],0.085,WOOD));
  p.push(beam([-52.05,y+1.35,-15.6],[-52.05,y+1.35,-8.4],0.04,ROPE));
  for(const [i,c] of RELAY_PLATFORMS.entries()) {
    const color=i%2?OCHRE:TEAL;deck(p,c.x,c.z,-0.18,4.5,4.5,1.05);
    // Four partially submerged flotation pontoons carry the timber subframe.
    for(const side of [-1,1])for(const end of [-1,1])p.push(sphere([c.x+side*1.65,0.03,c.z+end*1.15],[0.48,0.46,0.95],"#496d68"));
    for(const side of [-1,1]) {
      const x=c.x+side*1.9,z=c.z+1.9;
      p.push(beam([x,0.7,z],[x+side*3,heightAt(x+side*3,z+3)+0.15,z+3],0.035,ROPE));
      p.push(beam([x,0.8,c.z-1.6],[x,2.35,c.z-1.6],0.1,WOOD));binding(p,x,2.2,c.z-1.6);
    }
    p.push(beam([c.x-2,2.25,c.z-1.6],[c.x+2,2.25,c.z-1.6],0.1,WOOD));
    // Retrieval square and contrasting token, hung from a real crossbar.
    p.push(beam([c.x,2.25,c.z-1.6],[c.x,1.65,c.z-1.6],0.025,ROPE),box([c.x,1.45,c.z-1.6],[0.5,0.45,0.16],color));
    // Ladder projects to water level; its future use requires a swimming state.
    for(const side of [-1,1])p.push(beam([c.x+side*0.55,-0.7,c.z+2.6],[c.x+side*0.55,1.5,c.z+1.85],0.065,WOOD));
    for(let j=0;j<6;j++){const t=j/5;p.push(beam([c.x-0.55,-0.55+t*1.75,c.z+2.55-t*0.6],[c.x+0.55,-0.55+t*1.75,c.z+2.55-t*0.6],0.055,CUT));}
    for(const sx of [-1,1])p.push(box([c.x+sx*2.15,0.92,c.z],[0.22,0.14,3.8],color));
  }
  // Anchored lane buoys and beach finish make the out-and-back sequence readable.
  for(let i=0;i<9;i++){const x=-63-i*3.8,z=-29+i*4.5;p.push(sphere([x,0.12,z],[0.28,0.3,0.28],i%2?TEAL:OCHRE),beam([x,-0.1,z],[x,heightAt(x,z)+0.1,z],0.02,DARK));}
  for(const x of [-45,-41]){const h=heightAt(x,-6);p.push(beam([x,h-0.1,-6],[x,h+2,-6],0.1,WOOD));}
  p.push(beam([-45,heightAt(-45,-6)+1.9,-6],[-41,heightAt(-41,-6)+1.9,-6],0.09,WOOD),box([-43,heightAt(-43,-6)+0.03,-5],[4.2,0.06,2],TEAL));
  return {id:"ocean-relay",zone:"ocean",name:"Tidebound Relay",pieces:p,solids:[{x:-50,z:-12,hx:2.3,hz:4.1},{x:-45,z:-6,hx:.14,hz:.14},{x:-41,z:-6,hx:.14,hz:.14}],
    starts:[pose(-46,-21,1.5),pose(-42,-21,1.5)],contestants:Array.from({length:10},(_,i)=>pose(-45+(i%2)*3,-36+Math.floor(i/2)*2.2,1.5)),
    host:pose(-42,-13,1.5),finish:pose(-43,-2,Math.PI),view:ZONES.ocean.view,
    assets:[],movement:"swimming-deferred",cleanup:"unmount-and-dispose"};
}
