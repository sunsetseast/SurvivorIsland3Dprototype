import { movementVector } from '../../cameraController';
export const STEP=1/60, LANES=[-27,-14] as const, HEAT_LIMIT=240;
export type Stage='sprint'|'crawl'|'to-beam'|'beam'|'to-net'|'net'|'collection'|'puzzle'|'finished'|'dnf';
export type Entrant={id:number;name:string;physical?:number;dexterity?:number;focus?:number};
export type Split={stage:Stage;time:number;duration:number};
export type Runner=Entrant & {lane:number;heat:number;stage:Stage;x:number;z:number;lift:number;progress:number;balance:number;stability:number;mistakes:number;recoverUntil:number;stageStarted:number;splits:Split[];finishTime:number|null;bundles:boolean[];slots:number[];lastHand:number;handAt:number;nextAction:number};
export type Phase='introduction'|'tutorial'|'countdown'|'racing'|'paused'|'results'|'cancelled';
export type RaceState={phase:Phase;resume:Phase;clock:number;heat:number;heatStart:number;countdown:number;runners:Runner[];notice:string;result:ReturnType<typeof rank>|null};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function traits(p:{strength?:number;endurance?:number;dexterity?:number;focus?:number}):Pick<Entrant,'physical'|'dexterity'|'focus'>{
 return {physical:clamp(((p.strength??5)+(p.endurance??5))/20),dexterity:clamp((p.dexterity??5)/10),focus:clamp((p.focus??5)/10)};
}
export function rank(runners:Runner[]){
 const ordered=[...runners].sort((a,b)=>(a.finishTime??Infinity)-(b.finishTime??Infinity)||a.id-b.id);
 return ordered.map((r,i)=>({id:r.id,name:r.name,time:r.finishTime,place:r.finishTime===null?null:1+ordered.filter(q=>q.finishTime!==null&&q.finishTime<r.finishTime!-STEP/2).length,splits:r.splits.map(s=>({...s})),puzzle:r.slots.filter(x=>x>=0).length,mistakes:r.mistakes}));
}
export class CoastalEngine {
 state:RaceState;
 private accumulator=0;
 input={x:0,forward:0};
 constructor(entrants:readonly Entrant[],readonly seed=1){
  const seen=new Set([0]);const roster=[{id:0,name:'You',physical:.5,dexterity:.5,focus:.5},...entrants.filter(p=>p.id!==0&&!seen.has(p.id)&&!!seen.add(p.id)).slice(0,7)];
  this.state={phase:'introduction',resume:'racing',clock:0,heat:0,heatStart:0,countdown:3,notice:'Two lanes. Overall ranking uses each heat’s personal time.',result:null,runners:roster.map((p,i)=>({...p,lane:i%2,heat:Math.floor(i/2),stage:'sprint',x:LANES[i%2]!,z:-50,lift:0,progress:0,balance:0,stability:1,mistakes:0,recoverUntil:0,stageStarted:0,splits:[],finishTime:null,bundles:[false,false,false],slots:Array(6).fill(-1),lastHand:-1,handAt:-100,nextAction:0}))};
 }
 get player(){return this.state.runners[0]!;}
 get ownsControls(){return this.state.phase!=='cancelled';}
 tutorial(){if(this.state.phase==='introduction')this.state.phase='tutorial';}
 ready(){if(this.state.phase==='tutorial'){this.state.phase='countdown';this.state.countdown=3;this.neutral();}}
 neutral(){this.input={x:0,forward:0};}
 axis(x:number,forward:number){this.input={x:clamp(Number.isFinite(x)?x:0,-1,1),forward:clamp(Number.isFinite(forward)?forward:0,-1,1)};}
 pause(){if(['racing','countdown'].includes(this.state.phase)){this.state.resume=this.state.phase;this.state.phase='paused';this.neutral();}}
 resume(){if(this.state.phase==='paused'){this.state.phase=this.state.resume;this.neutral();}}
 cancel(){this.state.phase='cancelled';this.neutral();}
 retry(){return new CoastalEngine(this.state.runners.filter(r=>r.id!==0),this.seed+1);}
 get elapsed(){return this.state.clock-this.state.heatStart;}
 transition(r:Runner,stage:Stage){r.splits.push({stage:r.stage,time:this.elapsed,duration:this.elapsed-r.stageStarted});r.stage=stage;r.stageStarted=this.elapsed;r.progress=0;r.lift=0;this.state.notice=`${r.name}: ${stage.replaceAll('-',' ')}`;}
 finish(r:Runner){if(r.finishTime!==null||r.stage==='finished'||r.stage==='dnf')return;this.transition(r,'finished');r.finishTime=Math.round(this.elapsed/STEP)*STEP;}
 recover(r:Runner,stage:'beam'|'net') {r.mistakes++;r.recoverUntil=this.elapsed+2;r.z=stage==='beam'?-24.5:-8.1;r.x=LANES[r.lane]!;r.lift=0;r.progress=0;r.balance=0;r.stability=1;this.state.notice=`${r.name}: checkpoint recovery · 2 seconds`;}
 walk(r:Runner,x:number,forward:number,speed:number,limit:number){
  const v=movementVector(x,-forward,0),lane=LANES[r.lane]!;
  r.x=clamp(r.x+v.x*speed*STEP,lane-1.5,lane+1.5);r.z=clamp(r.z+v.z*speed*STEP,-50,limit);
 }
 action(){const r=this.player;if(this.state.phase!=='racing'||r.heat!==this.state.heat||this.elapsed<r.recoverUntil)return false;
  if(r.stage==='sprint'&&r.z>=-38){this.transition(r,'crawl');return true;}
  if(r.stage==='to-beam'&&r.z>=-25.6){r.x=LANES[r.lane]!;this.transition(r,'beam');return true;}
  if(r.stage==='to-net'&&r.z>=-8.8){r.x=LANES[r.lane]!;this.transition(r,'net');return true;}
  return false;
 }
 protected stepRunner(r:Runner){if(this.elapsed<r.recoverUntil)return;
  const own=r.id===0,x=own?this.input.x:0,forward=own?this.input.forward:0;
  if(r.stage==='sprint')this.walk(r,x,forward,5.5,-38);
  if(r.stage==='to-beam')this.walk(r,x,forward,5,-25.5);
  if(r.stage==='to-net')this.walk(r,x,forward,5,-8.7);
  if(r.stage==='collection')this.walk(r,x,forward,5,16.1);
 }
 advance(dt:number){if(!Number.isFinite(dt)||dt<=0||!['racing','countdown'].includes(this.state.phase))return;
  this.accumulator+=dt;
  while(this.accumulator+1e-10>=STEP){this.accumulator-=STEP;const s=this.state;
   if(s.phase==='countdown'){s.countdown=Math.max(0,s.countdown-STEP);if(s.countdown<1e-7)s.phase='racing';continue;}
   if(s.phase!=='racing')break;s.clock+=STEP;
   const active=s.runners.filter(r=>r.heat===s.heat);
   for(const r of active)if(r.stage!=='finished'&&r.stage!=='dnf'){this.stepRunner(r);if(this.elapsed>=HEAT_LIMIT&&r.finishTime===null)this.transition(r,'dnf');}
   if(active.every(r=>r.stage==='finished'||r.stage==='dnf')){
    if(s.runners.some(r=>r.heat>s.heat)){s.heat++;s.heatStart=s.clock;this.neutral();s.notice=`Heat ${s.heat+1} begins. Times are ranked across heats.`;}
    else{s.phase='results';s.result=rank(s.runners);this.neutral();}
   }
  }
 }
}
