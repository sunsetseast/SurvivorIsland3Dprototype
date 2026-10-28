import test from "node:test";
import assert from "node:assert/strict";
import { TravelManager, createSession } from "../src/game/locations/travel.ts";
import {
  LOCATIONS,
  CONNECTIONS,
  localToGeographic,
  geographicToLocal,
  localInstance,
} from "../src/game/locations/registry.ts";
import { validateSpawn } from "../src/game/locations/spawn.ts";
import { groundHeight, isWalkable } from "../src/game/world.ts";
import {
  heightAt,
  walkable,
  releaseTerrain,
} from "../src/game/railay/terrain.ts";
const wait = () => new Promise((r) => setTimeout(r, 5));
const load = async (m) => {
  await wait();
  const t = m.getSnapshot().token;
  await m.loadPending(t);
  m.ready(t);
};
test("registry has distinct coastal camps; planned locations load no scene; transforms round trip", () => {
  assert.equal(LOCATIONS.camp_tribe_b.scene, null);
  assert.equal(localInstance("camp_tribe_b").tribeId, "south");
  assert.equal(localInstance("camp_tribe_c").tribeId, "east");
  assert.equal(LOCATIONS.camp_tribe_c.scene, null);
  const camps = ["camp_tribe_a", "camp_tribe_b", "camp_tribe_c"];
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++)
      assert.ok(
        Math.hypot(
          LOCATIONS[camps[i]].anchor.x - LOCATIONS[camps[j]].anchor.x,
          LOCATIONS[camps[i]].anchor.z - LOCATIONS[camps[j]].anchor.z,
        ) > 300,
      );
  for (const id of Object.keys(LOCATIONS)) {
    const p = { x: 12, z: -33 };
    const back = geographicToLocal(id, localToGeographic(id, p));
    assert.ok(Math.hypot(back.x - p.x, back.z - p.z) < 1e-8);
  }
});
test("real source/destination body and camera spawn safety", () => {
  for (const name of ["default", "trail_return"])
    validateSpawn(LOCATIONS.camp_tribe_a.spawns[name], {
      height: groundHeight,
      walkable: isWalkable,
    });
  validateSpawn(LOCATIONS.railay_trails.spawns.tonsai_entry, {
    height: heightAt,
    walkable,
  });
  validateSpawn(CONNECTIONS.trail_to_camp.exit, { height: heightAt, walkable });
  const gate = localToGeographic(
      "camp_tribe_a",
      CONNECTIONS.camp_to_trail.exit,
    ),
    entry = LOCATIONS.railay_trails.spawns.tonsai_entry;
  assert.ok(Math.hypot(gate.x - entry.x, gate.z - entry.z) < 1e-8);
  assert.throws(() =>
    validateSpawn(
      { x: NaN, z: 0, yaw: 0, facing: 0 },
      { height: groundHeight, walkable: isWalkable },
    ),
  );
  releaseTerrain();
});
test("authorization, proximity, one journey grant, stable return instance and participant identity", async () => {
  let resets = 0;
  const m = new TravelManager(
    async () => {},
    () => resets++,
    0,
  );
  m.enter("camp_tribe_a");
  await load(m);
  assert.equal(m.travel("camp_to_trail"), false);
  m.grantJourney();
  assert.equal(m.travel("camp_to_trail"), false);
  m.recordPose("camp_tribe_a", CONNECTIONS.camp_to_trail.exit);
  const instance = m.session.instance;
  const sourceEntry = m.getSnapshot().entry;
  assert.equal(m.travel("camp_to_trail"), true);
  assert.equal(m.getSnapshot().entry, sourceEntry);
  assert.equal(m.travel("camp_to_trail"), false);
  await load(m);
  assert.equal(m.session.permissions.length, 0);
  assert.equal(m.session.locationId, "railay_trails");
  assert.equal(m.session.returnTo.instance, instance);
  m.recordPose("railay_trails", CONNECTIONS.trail_to_camp.exit);
  assert.equal(m.travel("trail_to_camp"), true);
  await load(m);
  assert.equal(m.session.instance, instance);
  assert.equal(m.session.participant.instanceId, instance.id);
  assert.equal(
    m.permission("camp_to_trail"),
    "A journey invitation is required.",
  );
  assert.ok(resets >= 6);
  m.menu();
  assert.equal(m.enter("railay_trails"), true);
  await load(m);
  assert.equal(m.session.locationId, "camp_tribe_a");
  m.menu();
});
test("stale loads cannot activate a canceled destination; rejection supports retry and safe return", async () => {
  let finish;
  let shouldFail = false;
  const m = new TravelManager(
    () =>
      shouldFail
        ? Promise.reject(Error("offline"))
        : new Promise((r) => (finish = r)),
    () => {},
    0,
  );
  m.enter("camp_tribe_a");
  await wait();
  const stale = m.getSnapshot().token,
    pending = m.loadPending(stale);
  m.menu();
  finish();
  await pending;
  assert.equal(m.getSnapshot().phase, "menu");
  m.ready(stale);
  assert.equal(m.getSnapshot().phase, "menu");
  shouldFail = true;
  m.enter("camp_tribe_a");
  await load(m);
  assert.equal(m.getSnapshot().phase, "error");
  m.retry();
  shouldFail = false;
  const t = m.getSnapshot().token,
    q = m.loadPending(t);
  finish();
  await q;
  m.ready(t);
  assert.equal(m.getSnapshot().phase, "ready");
  m.grantJourney();
  m.recordPose("camp_tribe_a", CONNECTIONS.camp_to_trail.exit);
  m.travel("camp_to_trail");
  shouldFail = true;
  await load(m);
  assert.equal(m.session.locationId, "camp_tribe_a");
  assert.equal(m.session.permissions.length, 1);
  m.returnSafely();
  shouldFail = false;
  const rt = m.getSnapshot().token,
    r = m.loadPending(rt);
  finish();
  await r;
  m.ready(rt);
  assert.equal(m.session.locationId, "camp_tribe_a");
  m.menu();
});
test("old prototype session defaults to tribe camp without invented game systems", () => {
  const s = createSession();
  assert.equal(s.version, 1);
  assert.equal(s.locationId, "camp_tribe_a");
  assert.deepEqual(s.permissions, []);
  assert.equal(s.inventory, undefined);
});
