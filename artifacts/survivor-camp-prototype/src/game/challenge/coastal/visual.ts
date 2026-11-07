import { LANES, type Runner } from './engine';
import { heightAt } from '../surface';
/** Explicit low-profile pose clears the 1.05m crawl aperture; support heights follow real equipment. */
export function runnerVisual(r:Runner,activeHeat:number){
 if(r.heat!==activeHeat)return {x:-35-r.lane*2,z:-53+r.heat*2,y:heightAt(-35-r.lane*2,-53+r.heat*2),scaleY:1,lean:0,working:false};
 let lift=r.lift;
 if(r.stage==='beam')lift=.59*Math.max(0,Math.min(1,r.z+25.5,(-17.2-r.z)/.5));
 if(['collection','puzzle','finished'].includes(r.stage))lift=.45*Math.max(0,Math.min(1,(r.z-15.5)/.6));
 if(r.stage==='sprint')lift=.32*Math.max(0,Math.min(1,(r.z+47)/.5,(-42.5-r.z)/.5));
 return {x:r.x,z:r.z,y:heightAt(r.x,r.z)+lift,scaleY:1,lean:r.stage==='crawl'?.5:r.stage==='beam'?r.balance*.35:0,working:r.stage==='net'||r.stage==='puzzle'};
}

/** Race speed selection is automatic: open lanes run; authored obstacles set their gait. */
export function challengeGait(stage:Runner['stage'],speed:number){
 if(stage==='crawl')return 'crawl' as const;
 if(stage==='beam')return 'balance' as const;
 if(stage==='net')return 'climb' as const;
 if(stage==='puzzle')return 'interact' as const;
 if(speed<.08)return 'idle' as const;
 return 'run' as const;
}

/** Presentation is deliberately outside deterministic engine state (including pause). */
export const runnerPresentations=new WeakMap<Runner,{x:number;y:number;z:number;facing:number}>();
