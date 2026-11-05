import test from 'node:test';
import assert from 'node:assert/strict';
import { StillwaterEngine, STEP, RULES, difficultyAt, balanceWindow, canPlace, assignEntrants, disturbance, rehearsalAbility } from '../src/game/challenge/stillwater/engine.ts';
import { BalanceInput } from '../src/game/challenge/stillwater/input.ts';
import { stationVisual } from '../src/game/challenge/stillwater/visual.ts';
import { STILLWATER_STATIONS } from '../src/game/challenge/individualCourse.ts';
import { StillwaterSession } from '../src/game/challenge/stillwater/session.ts';
const active = (roster=[]) => { const e = new StillwaterEngine(roster); e.begin(); e.tutorial(); e.ready(); e.advance(3); assert.equal(e.state.phase,'active'); return e; };
test('explicit intro, tutorial, ready/countdown and exclusive session transitions',()=>{
 const e=new StillwaterEngine([]); assert.equal(e.ownsControls,false); e.ready();assert.equal(e.state.phase,'idle');
 assert.equal(e.begin(),true); assert.equal(e.begin(),false);e.tutorial();e.ready();e.advance(2);assert.ok(e.state.countdown>.99);e.advance(1);assert.equal(e.state.phase,'active');e.cancel();assert.equal(e.ownsControls,false);assert.equal(e.begin(),true);
});
test('fixed step determinism is independent of render delta partitioning',()=>{
 const a=active([{id:1,name:'A'}]),b=active([{id:1,name:'A'}]);
 for(let i=0;i<120;i++){a.setInput(.12);a.advance(STEP);} b.setInput(.12);b.advance(2);
 assert.deepEqual(a.state,b.state);assert.ok(a.state.competitors[0].balance!==0);
});
test('placement precision, early actions, strikes, deadline and recovery are actual state',()=>{
 const e=active(),c=e.state.competitors[0];e.place();e.advance(STEP);assert.equal(c.placed,0);
 e.state.tick=480;e.state.elapsed=8;c.balance=0;c.velocity=0;c.stability=.6;assert.ok(canPlace(c,8));e.place();e.place();e.advance(STEP);assert.equal(c.placed,1);assert.ok(c.stability>.6);
 e.state.tick=1080;c.balance=.5;c.velocity=0;e.place();e.advance(STEP);assert.equal(c.strikes,1);assert.equal(c.lastPlacement,'miss');
 e.state.tick=2160;c.balance=0;e.advance(STEP);assert.equal(c.strikes,2);
});
test('difficulty tightens continuously with bounded end values',()=>{
 assert.equal(difficultyAt(0),1);assert.equal(difficultyAt(90),2.25);assert.equal(difficultyAt(999),2.25);assert.ok(balanceWindow(90)<balanceWindow(0));assert.ok(difficultyAt(40.01)-difficultyAt(40)<.001);
});
test('pause freezes countdown and active simulation; resume releases inputs',()=>{
 const e=active();e.setInput(1);e.place();e.pause();const s=JSON.stringify(e.state);e.advance(50);assert.equal(JSON.stringify(e.state),s);e.resume();e.advance(STEP);assert.ok(e.state.competitors[0].control===0);
 const c=new StillwaterEngine([]);c.begin();c.tutorial();c.ready();c.advance(1);c.pause();c.advance(20);c.resume();c.advance(2);assert.equal(c.state.phase,'active');
});
test('real mistakes eliminate; results occur once; retry is pristine and cancellation stops advancement',()=>{
 const e=active();e.state.competitors[0].balance=1.2;e.advance(STEP);assert.equal(e.state.phase,'results');assert.equal(e.state.result.reason,'all-out');const r=e.state.result;e.advance(100);assert.equal(e.state.result,r);e.complete();assert.equal(e.ownsControls,false);e.retry();assert.equal(e.state.phase,'tutorial');assert.equal(e.state.result,null);assert.equal(e.state.competitors[0].eliminatedAt,null);e.cancel();const s=JSON.stringify(e.state);e.advance(100);assert.equal(JSON.stringify(e.state),s);
});
test('valid station assignments deduplicate and cap actual identities without mutating source',()=>{
 const roster=Object.freeze([{id:1,name:'A'},{id:1,name:'A'},{id:0,name:'fake'},...Array.from({length:12},(_,i)=>({id:i+2,name:String(i)}))].map(Object.freeze));
 const c=assignEntrants(roster);assert.equal(c.length,8);assert.equal(new Set(c.map(x=>x.id)).size,8);assert.deepEqual(c.map(x=>x.station),[0,1,2,3,4,5,6,7]);assert.throws(()=>assignEntrants([],0));
});
test('successful feedback control can survive a complete solo rehearsal and earn placements',()=>{
 const e=active();for(let i=0;i<5405&&e.state.phase!=='results';i++){const c=e.state.competitors[0];e.setInput(-(disturbance(e.state.elapsed,c.phase)*.62+c.balance*2.7+c.velocity*2)/1.65);if(canPlace(c,e.state.elapsed))e.place();e.advance(STEP);}
 assert.equal(e.state.result.duration,RULES.duration);assert.equal(e.state.result.winnerIds[0],0);assert.ok(e.state.competitors[0].placed>=7);
});
test('balance/placement have independent pointer owners; stray and cancelled touches cannot activate',()=>{
 let v=0,n=0;const c=new BalanceInput(x=>v=x,()=>n++);
 assert.equal(c.down(1,100,200),true);assert.equal(c.down(2,100,200),false);c.move(2,150);assert.equal(v,0);c.move(1,138);assert.ok(v>.49&&v<.51);
 assert.equal(c.placeDown(1),false);assert.equal(c.placeDown(2),true);assert.equal(c.placeDown(3),false);c.placeUp(3,true);assert.equal(n,0);c.placeUp(2,true);c.placeUp(2,true);assert.equal(n,1);c.up(1);assert.equal(v,0);
 c.placeDown(4);c.up(4);c.placeUp(4,true);assert.equal(n,1);c.down(5,1,200);c.reset();c.move(5,500);assert.equal(v,0);
});
test('keyboard releases, repeat suppression, accessible sensitivity and focus-reset ownership',()=>{
 let n=0,v=0;const c=new BalanceInput(x=>v=x,()=>n++);c.sensitivity=.5;c.key('KeyD',true);assert.equal(v,.5);c.key('KeyA',true);assert.equal(v,0);c.key('KeyD',false);assert.equal(v,-.5);c.key('Space',true);c.key('Space',true,true);c.key('Space',true);assert.equal(n,1);c.reset();assert.equal(v,0);assert.equal(c.balancePointer,null);assert.equal(c.key('KeyQ',true),false);c.key('Space',true);assert.equal(n,2);
});
test('eight original station positions and visible tilt/stack/failure are driven by actual state',()=>{
 assert.equal(STILLWATER_STATIONS.length,8);assert.equal(new Set(STILLWATER_STATIONS.map(s=>`${s.x}:${s.z}`)).size,8);
 const c=active().state.competitors[0];c.balance=.5;c.velocity=.2;c.placed=3;const v=stationVisual(c,4);assert.equal(v.count,3);assert.ok(v.tilt>.1);assert.equal(v.fall,0);c.eliminatedAt=4;assert.equal(stationVisual(c,5).fall,1);
});
test('independent seeded opponents use temporary existing traits and produce valid results at all roster sizes',()=>{
 const source=Object.freeze({focus:8,dexterity:7,endurance:6});assert.ok(Math.abs(rehearsalAbility(source)-.715)<1e-12);assert.equal(source.focus,8);
 for(const n of [0,1,3,7,14]){const roster=Array.from({length:n},(_,i)=>({id:i+1,name:`P${i}`,ability:.3+i*.07}));const before=JSON.stringify(roster);const e=active(roster);e.advance(95);assert.ok(e.state.result);assert.equal(e.state.result.ranking.length,Math.min(8,n+1));assert.equal(JSON.stringify(roster),before);assert.equal(new Set(e.state.result.ranking.map(c=>c.id)).size,e.state.result.ranking.length);assert.ok(e.state.result.winnerIds.length);}
});
test('player can defeat opponents by feedback control and lose by mistakes; no scripted elimination order',()=>{
 const run=(seed,control)=>{const e=new StillwaterEngine([{id:4,name:'A',ability:.45},{id:11,name:'B',ability:.5},{id:13,name:'C',ability:.55}],seed);e.begin();e.tutorial();e.ready();e.advance(3);for(let i=0;i<5500&&e.state.phase!=='results';i++){const c=e.state.competitors[0];if(control){e.setInput(-(disturbance(e.state.elapsed,c.phase)*.62+c.balance*2.7+c.velocity*2)/1.65);if(canPlace(c,e.state.elapsed))e.place();}else e.setInput(1);e.advance(STEP);}return e;};
 const good=run(2401,true),bad=run(2401,false);assert.ok(good.state.result.winnerIds.includes(0));assert.ok(!bad.state.result.winnerIds.includes(0));
 assert.ok(new Set([1,2,3,4,5,6,7,8].map(s=>run(s,false).state.result.winnerIds[0])).size>1);
 assert.notEqual(bad.state.competitors[1].balance,bad.state.competitors[2].balance);assert.ok(bad.state.notices.some(n=>n.includes('You are out')));
});
test('session admits once near a valid owner, restores pose, and tears down with no stale subscribers',()=>{
 const s=new StillwaterSession();let admitted=false,released=0,restored=null,n=0;const unsub=s.subscribe(()=>n++);
 const pose={x:1,z:2,yaw:.3,pitch:.4,facing:1};const dispose=s.configure({admit:()=>admitted,roster:()=>[{id:4,name:'Rob'}],capture:()=>({...pose}),restore:p=>restored=p,release:()=>released++});
 assert.equal(s.start(),false);s.proximity(true);assert.equal(s.start(),false);admitted=true;assert.equal(s.start(),true);assert.equal(s.start(),false);assert.equal(s.ownsControls,true);s.tutorial();s.ready();s.advance(3);s.pause();s.resume();s.retry();assert.equal(s.engine.state.phase,'tutorial');s.exit();assert.deepEqual(restored,pose);assert.equal(s.ownsControls,false);assert.ok(released>=4);dispose();assert.equal(s.engine,null);const count=n;unsub();s.notify();assert.equal(n,count);assert.equal(s.start(),false);
});
