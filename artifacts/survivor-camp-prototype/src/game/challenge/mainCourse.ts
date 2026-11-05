import { pose, ZONES } from "./layout";
import { heightAt } from "./surface";
import { box, beam, deck, net, binding, WOOD, CUT, ROPE, TEAL, OCHRE, type Piece, type Solid, type ChallengeSetup } from "./equipment";

export function mainCourse():ChallengeSetup {
  const p:Piece[]=[],solids:Solid[]=[];
  for(const [x,color] of [[-27,TEAL],[-14,OCHRE]] as const) {
    let y=heightAt(x,-45);deck(p,x,-45,y,5,4,0.32);solids.push({x,z:-45,hx:2.5,hz:2});
    p.push(box([x,y+0.34,-46.4],[4.7,0.03,0.7],color));
    // Low crawl frame: 1.05 m clearance, timber side rails and taut rope roof.
    y=heightAt(x,-34);
    for(const sx of [-1,1])for(const sz of [-1,1])p.push(beam([x+sx*2,y-0.12,-34+sz*3],[x+sx*2,y+1.25,-34+sz*3],0.11,WOOD));
    p.push(beam([x-2,y+1.18,-37],[x+2,y+1.18,-37],0.11,WOOD),beam([x-2,y+1.18,-31],[x+2,y+1.18,-31],0.11,WOOD));
    net(p,[x-2,y+1.18,-37],[x+2,y+1.18,-37],[x-2,y+1.18,-31],[x+2,y+1.18,-31],10,6);
    solids.push({x,z:-34,hx:2.15,hz:3.15});
    // Three-point-supported low beam with visible rope grips.
    y=heightAt(x,-21);p.push(box([x,y+0.48,-21],[0.28,0.22,7],color));
    for(const z of [-24,-21,-18])p.push(box([x,y+0.2,z],[1.4,0.4,0.32],WOOD));
    solids.push({x,z:-21,hx:0.75,hz:3.6});
    // A-frame cargo net; slope and bracing remain physically plausible at human scale.
    y=heightAt(x,-5);
    for(const sx of [-1,1]){const xx=x+sx*2;p.push(beam([xx,y-0.1,-8.3],[xx,y+3.15,-5],0.14,WOOD),beam([xx,y+3.15,-5],[xx,y-0.1,-1.7],0.14,WOOD));binding(p,xx,y+3.05,-5);}
    p.push(beam([x-2.2,y+3.13,-5],[x+2.2,y+3.13,-5],0.14,WOOD));
    net(p,[x-1.9,y+0.1,-8.1],[x+1.9,y+0.1,-8.1],[x-1.9,y+3.05,-5],[x+1.9,y+3.05,-5],10,10);
    for(let i=0;i<8;i++){const t=i/7;p.push(beam([x-1.75,y+3*(1-t),-5+3.1*t],[x+1.75,y+3*(1-t),-5+3.1*t],0.075,CUT));}
    solids.push({x,z:-5,hx:2.25,hz:3.4});
    // Original geometric puzzle finishing station with deck, board, loose pieces and side braces.
    y=heightAt(x,18);deck(p,x,18,y,5,5,0.45);solids.push({x,z:18,hx:2.6,hz:2.6});
    for(const sx of [-1,1]){p.push(beam([x+sx*1.8,y+0.45,19.2],[x+sx*1.8,y+2.6,19.2],0.11,WOOD),beam([x+sx*1.8,y+1.9,19.2],[x+sx*2.1,y+0.45,20.1],0.075,WOOD));}
    p.push(box([x,y+1.75,19.2],[3.65,1.5,0.14],"#645640"));
    for(let row=0;row<3;row++)for(let col=0;col<5;col++)if(row!==2||col<3)p.push(box([x+(col-2)*0.67,y+1.25+row*0.45,19.09],[0.6,0.38,0.15],(row+col)%2?color:CUT));
    for(let i=0;i<3;i++)p.push(box([x-1.1+i*0.8,y+0.58,16.7],[0.6,0.16,0.4],color));
    // Readable progression accents; no television branding.
    for(const z of [-40,-27,-13,7])p.push(box([x,heightAt(x,z)+0.025,z],[0.75,0.04,1.2],color));
  }
  return {id:"beach-obstacle",zone:"beach",name:"Coastal Traverse",pieces:p,solids,
    starts:[pose(-27,-50),pose(-14,-50)],contestants:Array.from({length:10},(_,i)=>pose(-31+(i%5)*2.2,-54+Math.floor(i/5)*2)),
    host:pose(-3,-10,Math.PI/2),finish:pose(-5,23),view:ZONES.beach.view,
    assets:[],movement:"walking",cleanup:"unmount-and-dispose"};
}
