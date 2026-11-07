import {CoastalEngine,type Entrant} from './engine';
type Pose={x:number;z:number;yaw:number;pitch:number;facing:number};
type Owner={admit:()=>boolean;roster:()=>Entrant[];capture:()=>Pose;restore:(p:Pose)=>void;release:()=>void};
export class CoastalSession{
 engine:CoastalEngine|null=null;near=false;keys=new Set<string>();private owner:Owner|null=null;private departure:Pose|null=null;private listeners=new Set<()=>void>();private revision=0;private uiTime=0;private serial=0;
 subscribe=(f:()=>void)=>{this.listeners.add(f);return()=>{this.listeners.delete(f);};};snapshot=()=>this.revision;
 notify=()=>{this.revision++;this.listeners.forEach(f=>f());};get ownsControls(){return this.engine?.ownsControls??false;}
 release=()=>{this.keys.clear();this.engine?.neutral();this.owner?.release();};
 configure(owner:Owner){this.owner=owner;this.engine=null;this.near=false;return()=>{this.engine?.cancel();this.release();this.owner=null;this.engine=null;this.departure=null;this.near=false;this.notify();};}
 start=()=>{if(!this.owner||this.ownsControls||!this.near||!this.owner.admit())return false;this.departure=this.owner.capture();this.release();this.engine=new CoastalEngine(this.owner.roster(),++this.serial);this.notify();return true;};
 tutorial=()=>{this.engine?.tutorial();this.release();this.notify();};ready=()=>{this.release();this.engine?.ready();this.notify();};
 pause=()=>{this.engine?.pause();this.release();this.notify();};resume=()=>{this.release();this.engine?.resume();this.notify();};
 action=()=>{this.engine?.action();this.notify();};grip=(side:number)=>{this.engine?.grip(side);this.notify();};
 retry=()=>{if(this.owner?.admit()&&this.ownsControls){this.release();this.engine=this.engine!.retry();this.notify();}};
 exit=()=>{this.engine?.cancel();this.release();if(this.departure)this.owner?.restore(this.departure);this.departure=null;this.notify();};
 advance(dt:number){if(!this.ownsControls)return;const before=this.engine!.player.stage,phase=this.engine!.state.phase;this.engine!.advance(dt);this.uiTime+=dt;if(this.uiTime>=.1||before!==this.engine!.player.stage||phase!==this.engine!.state.phase){this.uiTime=0;this.notify();}}
}
export const coastal=new CoastalSession();
