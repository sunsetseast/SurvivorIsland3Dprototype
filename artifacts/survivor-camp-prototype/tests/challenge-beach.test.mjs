import test from "node:test";
import assert from "node:assert/strict";
import { challengeRehearsalEnabled } from "../src/game/challenge/development.ts";
import { TravelManager } from "../src/game/locations/travel.ts";
import { CONNECTIONS, LOCATIONS } from "../src/game/locations/registry.ts";
import { validateSpawn } from "../src/game/locations/spawn.ts";
import { ARRIVAL, RETURN_EXIT, ARRIVAL_STAGING, ARRIVAL_HOST, ZONES, ROUTES } from "../src/game/challenge/layout.ts";
import { heightAt, walkable, moveOnTerrain, shoreX } from "../src/game/challenge/surface.ts";
import { KARSTS, TREES, trailDistance } from "../src/game/challenge/environmentLayout.ts";
import { mainCourse } from "../src/game/challenge/mainCourse.ts";
import { walkableWithEquipment } from "../src/game/challenge/surface.ts";
const settle = async m => { await new Promise(r => setTimeout(r, 5)); const t=m.getSnapshot().token; await m.loadPending(t); m.ready(t); };
const manager = (allow=true, load=async()=>{}) => new TravelManager(load, ()=>{}, 0, ()=>allow);
async function camp(m) { assert.equal(m.enter("camp_tribe_a"),true); await settle(m); }
async function depart(m) { m.recordPose("camp_tribe_a", CONNECTIONS.camp_to_challenge.exit); assert.equal(m.grantChallengeRehearsal(),true); assert.equal(m.travel("camp_to_challenge"),true); await settle(m); }

test("challenge body, camera, host and ten staging spawns have safe terrain clearance",()=>{
  assert.equal(LOCATIONS.challenge_main.scene,"challenge");
  for (const p of [ARRIVAL,RETURN_EXIT,ARRIVAL_HOST,...ARRIVAL_STAGING,...Object.values(ZONES).map(z=>z.view)]) validateSpawn(p,{height:heightAt,walkable});
});
test("movement adapter traverses every blueprint route and its reverse without entering unsupported water",()=>{
  for (const route of ROUTES) for (const pts of [route,[...route].reverse()]) {
    let p={...pts[0]};
    for (const end of pts.slice(1)) {
      for(let i=0;i<3000 && Math.hypot(p.x-end.x,p.z-end.z)>0.06;i++) {
        const d=Math.hypot(end.x-p.x,end.z-p.z),step=Math.min(0.12,d);
        p=moveOnTerrain(p,(end.x-p.x)/d*step,(end.z-p.z)/d*step);
        assert.ok(walkable(p.x,p.z)); assert.ok(heightAt(p.x,p.z)>0.12);
      }
      assert.ok(Math.hypot(p.x-end.x,p.z-end.z)<0.07,JSON.stringify({p,end}));
    }
  }
  const p=moveOnTerrain({x:-35,z:0},-70,0);
  assert.ok(p.x>shoreX(0)+5); assert.ok(walkable(p.x,p.z));
});
test("ordinary builds, direct menu entry, missing grants and wrong scopes cannot admit a challenge",async()=>{
  globalThis.location = { search: "?devTravel=1" };
  assert.equal(challengeRehearsalEnabled(),false);
  delete globalThis.location;
  const m=manager(false); await camp(m);
  m.recordPose("camp_tribe_a",CONNECTIONS.camp_to_challenge.exit);
  assert.equal(m.grantChallengeRehearsal(),false); assert.equal(m.travel("camp_to_challenge"),false);
  m.menu(); assert.equal(m.enter("challenge_main",true),false);
  const d=manager(); await camp(d);
  d.recordPose("camp_tribe_a",CONNECTIONS.camp_to_challenge.exit);
  assert.equal(d.travel("camp_to_challenge"),false);
  d.grantJourney(); assert.equal(d.travel("camp_to_challenge"),false);
  d.grantChallengeRehearsal(); d.session.permissions[0].scope=undefined;
  assert.equal(d.travel("camp_to_challenge"),false);
  d.menu(); m.menu();
});
test("rehearsal admission consumes one grant and returns to the exact source instance/pose without changing tribe",async()=>{
  const m=manager(); await camp(m);
  const origin=m.session.instance,participant=m.session.participant;
  await depart(m);
  assert.equal(m.session.locationId,"challenge_main");
  assert.equal(m.session.participant,participant); assert.equal(participant.tribeId,"tonsai");
  assert.equal(m.session.returnTo.instance,origin); assert.equal(m.session.permissions.length,0);
  assert.match(m.session.instance.id,/:challenge_main:rehearsal:1$/);
  assert.equal(m.session.instance.seasonId,origin.seasonId);
  assert.equal(m.grantChallengeRehearsal(),false);
  const admitted=m.session.instance;
  m.menu(); assert.equal(m.enter("camp_tribe_a"),true); await settle(m);
  // Resuming an admitted rehearsal retains its event identity.
  assert.deepEqual(m.session.instance,admitted);
  m.recordPose("challenge_main",RETURN_EXIT);
  assert.equal(m.travel("challenge_to_camp"),true); await settle(m);
  assert.equal(m.session.instance,origin);
  assert.deepEqual(m.getSnapshot().entry,CONNECTIONS.camp_to_challenge.exit);
  assert.equal(m.session.returnTo,undefined); assert.equal(m.travel("camp_to_challenge"),false);
  m.menu();
});
test("wrong participant/origin, revoked admission and out-of-range travel fail closed",async()=>{
  const m=manager(); await camp(m); m.grantChallengeRehearsal();
  assert.equal(m.travel("camp_to_challenge"),false);
  m.recordPose("camp_tribe_a",CONNECTIONS.camp_to_challenge.exit);
  const p=m.session.permissions[0];p.participantId="other";assert.equal(m.travel("camp_to_challenge"),false);
  p.participantId=m.session.participant.id;p.originInstanceId="other";assert.equal(m.travel("camp_to_challenge"),false);
  m.grantChallengeRehearsal();assert.equal(m.travel("camp_to_challenge"),true);m.session.permissions=[];
  await settle(m); assert.equal(m.getSnapshot().phase,"error");assert.equal(m.session.locationId,"camp_tribe_a");
  m.returnSafely(); await settle(m);assert.equal(m.session.locationId,"camp_tribe_a"); m.menu();
});
test("failed challenge loading, retry and canceled stale loads preserve the source session",async()=>{
  let fail=false,finish;
  const m=manager(true,async id=>{if(id==="challenge_main" && fail)throw Error("offline");});
  await camp(m);const origin=m.session.instance;fail=true;
  await depart(m);assert.equal(m.getSnapshot().phase,"error");assert.equal(m.session.instance,origin);
  assert.equal(m.session.permissions.length,1);fail=false;m.retry();await settle(m);
  assert.equal(m.session.locationId,"challenge_main");m.menu();
  const n=manager(true,id=>id==="challenge_main"?new Promise(r=>finish=r):Promise.resolve());await camp(n);
  n.recordPose("camp_tribe_a",CONNECTIONS.camp_to_challenge.exit);n.grantChallengeRehearsal();n.travel("camp_to_challenge");
  await new Promise(r=>setTimeout(r,5));const t=n.getSnapshot().token,pending=n.loadPending(t);
  n.returnSafely();finish();await pending;n.ready(t);await settle(n);
  assert.equal(n.session.locationId,"camp_tribe_a");assert.equal(n.session.returnTo,undefined);n.menu();
});

test("visible cliff/trunk collision stays outside walking corridors and stops body penetration",()=>{
  assert.ok(TREES.length>0);
  for(const tree of TREES){assert.ok(trailDistance(tree.x,tree.z)>6);assert.equal(walkable(tree.x,tree.z),false);}
  for(const rock of KARSTS)assert.equal(walkable(rock.x,rock.z),false);
  for(const zone of Object.values(ZONES)){const start=zone.view;assert.ok(walkable(start.x,start.z));const p=moveOnTerrain(start,150,0);assert.ok(walkable(p.x,p.z));assert.ok(p.x<98);}
});

test("main mockup keeps host/contestant spawns and perimeter routes free while blocking static obstacles",()=>{
  const model=mainCourse(),surface={height:heightAt,walkable:(x,z)=>walkableWithEquipment(x,z,model.solids)};
  for(const p of [model.host,model.view,model.finish,...model.starts,...model.contestants])validateSpawn(p,surface);
  for(const s of model.solids)assert.equal(surface.walkable(s.x,s.z),false);
  for(const route of ROUTES){let p={...route[0]};for(const end of route.slice(1)){for(let i=0;i<2500 && Math.hypot(p.x-end.x,p.z-end.z)>0.08;i++){const d=Math.hypot(end.x-p.x,end.z-p.z),k=Math.min(.12,d)/d;p=moveOnTerrain(p,(end.x-p.x)*k,(end.z-p.z)*k,model.solids);}assert.ok(Math.hypot(p.x-end.x,p.z-end.z)<.09,JSON.stringify({p,end}));}}
});
