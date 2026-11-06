import test from 'node:test';
import assert from 'node:assert/strict';
import { developmentTestingAllowed, challengeTestingEnabled } from '../src/game/challenge/development.ts';
import { CONFIGURATIONS, isChallengeId } from '../src/game/challenge/configurations.ts';
import { TravelManager } from '../src/game/locations/travel.ts';
import { validateSpawn } from '../src/game/locations/spawn.ts';
import { heightAt, walkableWithEquipment } from '../src/game/challenge/surface.ts';
const settle=async m=>{await new Promise(r=>setTimeout(r,5));const token=m.getSnapshot().token;await m.loadPending(token);m.ready(token);};
const manager=(allow=true,load=async()=>{})=>new TravelManager(load,()=>{},0,()=>false,()=>allow);
test('hub authorization requires actual development; URL and rehearsal build flags cannot authorize production',()=>{
 assert.equal(developmentTestingAllowed({DEV:true}),true);
 for(const env of [{},{DEV:false},{DEV:false,VITE_CHALLENGE_REHEARSAL:'1'},{DEV:false,MODE:'development'},{DEV:'true'}])assert.equal(developmentTestingAllowed(env),false);
 globalThis.location={search:'?devTravel=1&challengeTesting=1'};assert.equal(challengeTestingEnabled(),false);delete globalThis.location;
});
test('hub metadata reuses all four registered configurations and labels both implemented competitions playable',()=>{
 assert.equal(Object.keys(CONFIGURATIONS).length,4);assert.deepEqual(Object.entries(CONFIGURATIONS).filter(([,c])=>c.playable).map(([id])=>id),['beach-obstacle','individual-balance']);
 for(const [id,c] of Object.entries(CONFIGURATIONS)){assert.ok(isChallengeId(id));assert.ok(c.description.length>20);assert.equal(c.name.split(' · ').length,2);}
});
test('direct testing denies production, invalid configuration and duplicate taps',async()=>{
 const closed=manager(false);assert.equal(closed.enterChallengeTesting('individual-balance'),false);assert.equal(closed.enter('challenge_main',true),false);
 const m=manager();assert.equal(m.enterChallengeTesting('__proto__'),false);assert.equal(m.enterChallengeTesting('individual-balance'),true);assert.equal(m.enterChallengeTesting('ocean-relay'),false);assert.equal(m.getSnapshot().phase,'fading');await settle(m);assert.equal(m.getSnapshot().phase,'ready');assert.equal(m.enterChallengeTesting('individual-balance'),false);assert.equal(m.enter('challenge_main',true),false);assert.ok(m.challengeTesting.play);assert.equal(m.travel('challenge_to_camp'),false);m.menu();
});
test('each direct configuration gets a safe spawn, one scene load and an isolated scope',async()=>{
 for(const [id,c] of Object.entries(CONFIGURATIONS)){const loaded=[],m=manager(true,async id=>loaded.push(id));m.enterChallengeTesting(id);await settle(m);assert.deepEqual(loaded,['challenge_main']);assert.equal(m.challengeTesting.configuration,id);assert.equal(m.challengeTesting.play,c.playable);const model=c.build();validateSpawn(m.getSnapshot().entry,{height:heightAt,walkable:(x,z)=>walkableWithEquipment(x,z,model.solids)});assert.equal(m.session.permissions.length,0);assert.equal(m.session.returnTo,undefined);m.menu();}
});
test('three direct sessions preserve original session, instance, participant, permissions and pose identities',async()=>{
 const m=manager(),original=m.session,instance=original.instance,participant=original.participant;assert.equal(m.enter('camp_tribe_a'),true);await settle(m);m.recordPose('camp_tribe_a',{x:5,z:-20,yaw:.4,facing:1});m.grantJourney();m.menu();const before=JSON.stringify(original),poses=original.poses,permissions=original.permissions;
 for(let i=0;i<3;i++){assert.equal(m.enterChallengeTesting('individual-balance'),true);await settle(m);assert.notEqual(m.session,original);m.recordPose('challenge_main',{x:40,z:53,yaw:.7,facing:1});assert.equal(JSON.stringify(original),before);m.menu();assert.equal(m.session,original);assert.equal(m.session.instance,instance);assert.equal(m.session.participant,participant);assert.equal(m.session.poses,poses);assert.equal(m.session.permissions,permissions);assert.equal(JSON.stringify(m.session),before);}
 assert.equal(m.enter('camp_tribe_a'),true);await settle(m);assert.deepEqual(m.getSnapshot().entry,poses.camp_tribe_a);assert.equal(m.session.instance,instance);m.menu();
});
test('stale loads, retry, safe return and revoked testing scope cannot replace the normal session',async()=>{
 let finish;const m=manager(true,()=>new Promise(r=>finish=r)),normal=m.session;m.enterChallengeTesting('individual-balance');await new Promise(r=>setTimeout(r,5));const token=m.getSnapshot().token,p=m.loadPending(token);m.menu();finish();await p;m.ready(token);assert.equal(m.session,normal);assert.equal(m.getSnapshot().phase,'menu');
 let fail=true;const q=manager(true,async()=>{if(fail)throw Error('loading test');});q.enterChallengeTesting('individual-balance');await settle(q);assert.equal(q.getSnapshot().phase,'error');assert.equal(q.challengeTesting.configuration,'individual-balance');fail=false;q.retry();await q.loadPending(q.getSnapshot().token);q.ready(q.getSnapshot().token);assert.equal(q.getSnapshot().phase,'ready');q.menu();
 const bad=manager();bad.enterChallengeTesting('individual-balance');bad.session.instance.eventId='production';await settle(bad);assert.equal(bad.getSnapshot().phase,'error');bad.returnSafely();assert.equal(bad.getSnapshot().phase,'menu');assert.equal(bad.challengeTesting,null);assert.match(bad.session.instance.id,/camp_tribe_a/);
});
