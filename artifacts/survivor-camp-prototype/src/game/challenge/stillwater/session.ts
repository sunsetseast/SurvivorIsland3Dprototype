import { StillwaterEngine, type Entrant } from "./engine";
export type Departure = {x:number;z:number;yaw:number;pitch:number;facing:number};
type Owner = { admit:()=>boolean; roster:()=>Entrant[]; capture:()=>Departure; restore:(p:Departure)=>void; release:()=>void };
/** One bridge between the existing scene and its DOM HUD. Does not own world or camp simulation. */
export class StillwaterSession {
  engine:StillwaterEngine|null=null;
  near=false;
  private owner:Owner|null=null;
  private departure:Departure|null=null;
  private listeners=new Set<()=>void>();
  private revision=0;
  private uiTime=0;
  subscribe=(f:()=>void)=>{this.listeners.add(f);return()=>{this.listeners.delete(f);};};
  snapshot=()=>this.revision;
  get ownsControls(){return this.engine?.ownsControls??false;}
  notify=()=>{this.revision++;this.listeners.forEach(f=>f());};
  configure(owner:Owner){this.owner=owner;this.near=false;this.engine=null;this.departure=null;this.notify();return()=>{this.engine?.cancel();owner.release();this.owner=null;this.engine=null;this.departure=null;this.near=false;this.notify();};}
  proximity(near:boolean){if(this.near!==near){this.near=near;this.notify();}}
  start=()=>{
    if(!this.owner||this.ownsControls||!this.near||!this.owner.admit())return false;
    this.departure=this.owner.capture();this.owner.release();this.engine=new StillwaterEngine(this.owner.roster());this.engine.begin();this.notify();return true;
  };
  tutorial=()=>{this.engine?.tutorial();this.notify();};
  ready=()=>{this.owner?.release();this.engine?.ready();this.notify();};
  axis=(v:number)=>{this.engine?.setInput(v);};
  place=()=>{this.engine?.place();};
  pause=()=>{this.engine?.pause();this.owner?.release();this.notify();};
  resume=()=>{this.owner?.release();this.engine?.resume();this.notify();};
  retry=()=>{if(this.owner?.admit()&&this.ownsControls){this.owner.release();this.engine?.retry();this.notify();}};
  exit=()=>{if(!this.ownsControls)return;this.engine?.cancel();this.owner?.release();if(this.departure)this.owner?.restore(this.departure);this.departure=null;this.notify();};
  advance(dt:number){const e=this.engine;if(!e||!e.ownsControls)return;const phase=e.state.phase;e.advance(dt);this.uiTime+=dt;if(this.uiTime>=.1||phase!==e.state.phase){this.uiTime=0;this.notify();}}
}
export const stillwater=new StillwaterSession();
