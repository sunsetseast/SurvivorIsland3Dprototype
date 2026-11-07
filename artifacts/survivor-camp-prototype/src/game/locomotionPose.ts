import {sampleFoot,solveLeg} from "./characterMotion";
import {ease} from './cameraController';
export type LocomotionState='idle'|'walk'|'run'|'turn'|'crouch'|'crawl'|'climb'|'balance'|'recover'|'interact'|'cinematic';
export type LocomotionMotion={speed:number;running:boolean;distance:number;state?:LocomotionState;posture?:number;balance?:number;climbSlope?:number;recovery?:number};
export const locomotionState=(m:LocomotionMotion):LocomotionState=>m.state??(m.speed>.08?m.running?'run':'walk':'idle');
export type JointPose={hipY:number;spine:number;head:number;armL:number;armR:number;elbowL:number;elbowR:number;legL:number;legR:number;kneeL:number;kneeR:number;ankleL:number;ankleR:number;roll:number;armsOut:number};
export const createPose=():JointPose=>({hipY:.98,spine:0,head:0,armL:0,armR:0,elbowL:0,elbowR:0,legL:0,legR:0,kneeL:0,kneeR:0,ankleL:0,ankleR:0,roll:0,armsOut:0});
/** Mutated reusable pose, radians/metres. No geometry or body scale changes. */
export function sampleTraversalPose(out:JointPose,m:LocomotionMotion,rigHeight=.98){
 const phase=m.distance*2*Math.PI/1.3,s=Math.sin(phase),c=Math.cos(phase),state=locomotionState(m);
 Object.assign(out,{hipY:.98,spine:0,head:0,armL:0,armR:0,elbowL:0,elbowR:0,legL:0,legR:0,kneeL:0,kneeR:0,ankleL:0,ankleR:0,roll:0,armsOut:0});
 if(state==='crawl'||state==='crouch')Object.assign(out,{
  hipY:.38+.012*c,spine:1.25,head:-1.12,
  armL:-1.25+s*.24,armR:-1.25-s*.24,elbowL:-.25-Math.max(0,-s)*.5,elbowR:-.25-Math.max(0,s)*.5,
  legL:-1.2-s*.18,legR:-1.2+s*.18,kneeL:2.2+s*.15,kneeR:2.2-s*.15,ankleL:-.9,ankleR:-.9,armsOut:.08
 });
 if(state==='balance'){
  const l=sampleFoot(m.distance,.96),r=sampleFoot(m.distance,.96,true),upper=rigHeight===.98?.47:.43,lower=rigHeight===.98?.41:.405;
  const a=solveLeg(.07-rigHeight+.02+l.lift,l.z,upper,lower),b=solveLeg(.07-rigHeight+.02+r.lift,r.z,upper,lower);
  Object.assign(out,{hipY:.98,spine:.04,head:-.03,roll:(m.balance??0)*.28,armsOut:1.28,armL:-.1+s*.08,armR:-.1-s*.08,elbowL:-.25,elbowR:-.25,legL:a.hip,legR:b.hip,kneeL:a.knee,kneeR:b.knee,ankleL:a.ankle,ankleR:b.ankle});
 }
 if(state==='recover'){const k=m.recovery??0;Object.assign(out,{hipY:.48+.5*k,spine:.7*(1-k),head:-.5*(1-k),legL:-.8*(1-k),legR:-.8*(1-k),kneeL:1.6*(1-k),kneeR:1.6*(1-k),elbowL:-.9,elbowR:-.9,armsOut:.55*(1-k)});}
 return state;
}
export type JointRef={current:{rotation:{x:number;y:number;z:number};position:{x:number;y:number;z:number};scale:{set:(x:number,y:number,z:number)=>unknown}}|null};
export type TraversalRig={hips:JointRef;spine:JointRef;head:JointRef;armL:JointRef;armR:JointRef;elbowL:JointRef;elbowR:JointRef;legL:JointRef;legR:JointRef;kneeL:JointRef;kneeR:JointRef;ankleL:JointRef;ankleR:JointRef};
export class TraversalBlend{
 private pose=createPose();private weight=0;private last:LocomotionMotion={speed:0,running:false,distance:0};
 apply(r:TraversalRig,m:LocomotionMotion,dt:number,rigHeight=.98){
  const state=locomotionState(m),active=['crawl','crouch','balance','climb','recover'].includes(state);
  this.weight+=((active?m.posture??1:0)-this.weight)*ease(dt,12);
  if(active)Object.assign(this.last,m);
  sampleTraversalPose(this.pose,active?m:this.last,rigHeight);
  const p=this.pose,k=this.weight;if(k<.0001)return;
  const mix=(a:number,b:number)=>a+(b-a)*k;
  if(r.hips.current){r.hips.current.position.y=mix(r.hips.current.position.y,p.hipY*rigHeight/.98);r.hips.current.rotation.z*=1-k;r.hips.current.rotation.y*=1-k;}
  for(const name of ['spine','head','armL','armR','elbowL','elbowR','legL','legR','kneeL','kneeR','ankleL','ankleR'] as const){const j=r[name].current;if(j){j.rotation.x=mix(j.rotation.x,p[name]);j.rotation.y*=1-k;if(name==='spine')j.rotation.z=mix(j.rotation.z,p.roll);if(name==='armL')j.rotation.z=mix(j.rotation.z,p.armsOut);if(name==='armR')j.rotation.z=mix(j.rotation.z,-p.armsOut);}}
 }
}
