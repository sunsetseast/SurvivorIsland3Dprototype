import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CampRuntime, SPOTS } from "../src/game/CampRuntime.ts";
import {
  CampNavigation,
  clearSegment,
  distance,
} from "../src/game/navigation.ts";
import { groundHeight, isWalkable, rng, SHELTER } from "../src/game/world.ts";
import {
  CONTESTANTS,
  DemoCampProvider,
} from "../src/game/simulation/DemoProvider.ts";
import { conversationCharacter } from "../src/game/simulation/reference/systems/ConversationCharacter.js";

const nav = new CampNavigation();
const quiet = () => ({
  mode: "demo",
  decide: (c) => ({
    activity: "observe",
    place: c.self.place ?? "campfire",
    duration: 9999,
    reason: "Test rest",
  }),
  wantsPlayer: () => false,
  receive() {},
  knowledge: () => [],
  dialogue: () => ({
    line: "hello",
    choices: [{ id: "casual", topic: "casual", label: "Hello" }],
  }),
  exchange() {},
});
const create = (provider = quiet(), seed = 42) =>
  new CampRuntime(provider, seed, nav);
const advance = (c, seconds) => {
  for (let i = 0; i < seconds * 30; i++) c.step(1 / 30);
};
function holdOthers(c, id) {
  for (const n of c.npcs)
    if (n.id !== id) {
      n.until = 1e8;
      n.decisionAt = 1e8;
    }
}

test("production snapshots remain byte-identical to the audited source manifest", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../src/game/simulation/reference-origin.json", import.meta.url),
    ),
  );
  for (const [path, hash] of Object.entries(manifest.files)) {
    assert.equal(
      createHash("sha256")
        .update(
          readFileSync(
            new URL(
              "../src/game/simulation/reference/" + path,
              import.meta.url,
            ),
          ),
        )
        .digest("hex"),
      hash,
      path,
    );
  }
  assert.deepEqual(
    CONTESTANTS.map((p) => p.id),
    [4, 11, 13, 18],
  );
  assert(
    conversationCharacter(CONTESTANTS.find((p) => p.id === 4)).leadershipDrive >
      conversationCharacter(CONTESTANTS.find((p) => p.id === 11))
        .leadershipDrive,
  );
  assert(
    conversationCharacter(CONTESTANTS.find((p) => p.id === 13)).socialDrive >
      conversationCharacter(CONTESTANTS.find((p) => p.id === 18)).socialDrive,
  );
});

test("every major activity spot has a collision-validated path to every other spot", () => {
  const spots = Object.values(SPOTS).flat();
  let count = 0;
  for (const from of spots)
    for (const to of spots) {
      assert(isWalkable(to.x, to.z));
      const route = nav.route(from, to);
      assert(route, JSON.stringify({ from, to }));
      let p = from;
      for (const next of route) {
        assert(
          clearSegment(p, next),
          "smoothing cannot cut a solid or deck edge",
        );
        p = next;
      }
      assert(distance(p, to) < 0.01);
      count++;
    }
  console.log(`Certified ${count} directed spot routes`);
  const route = nav.route(SPOTS.campfire[1], SPOTS.shelter[0]);
  assert(
    route.some(
      (p) =>
        p.x >= SHELTER.ramp.x0 &&
        p.x <= SHELTER.ramp.x1 &&
        p.z < -34 &&
        p.z > -40,
    ),
  );
});

test("four contestants physically traverse all five landmarks with no early arrival or teleport", () => {
  let travelFrames = 0;
  for (const id of CONTESTANTS.map((p) => p.id)) {
    const c = create();
    const n = c.npc(id);
    holdOthers(c, id);
    c.groups.splice(0);
    for (const o of c.npcs) o.groupId = null;
    for (const place of [
      "shelter",
      "beach",
      "waterWell",
      "jungleTrail",
      "campfire",
    ]) {
      const before = { x: n.x, z: n.z };
      assert(
        c.request(n, {
          activity: "observe",
          place,
          duration: 9999,
          reason: "Route certification",
        }),
      );
      assert.equal(distance(n, before), 0);
      assert.equal(n.place, null);
      assert(!c.present(id, place));
      const beforeArrivals = c.receipts.filter(
        (r) => r.actorId === id && r.type === "arrived",
      ).length;
      let steps = 0;
      while (n.traveling && steps++ < 10000) {
        const prev = { x: n.x, z: n.z };
        c.step(1 / 30);
        travelFrames++;
        assert(
          distance(n, prev) <= 1.66 / 30 + 1e-6,
          "no discontinuous recovery",
        );
        assert(isWalkable(n.x, n.z));
        assert(Math.abs(n.y - groundHeight(n.x, n.z)) < 0.0001);
        if (n.traveling) {
          assert(!c.present(id, place));
          assert.equal(
            c.receipts.filter((r) => r.actorId === id && r.type === "arrived")
              .length,
            beforeArrivals,
          );
        }
      }
      assert(!n.traveling, `Stuck: ${id} -> ${place}`);
      assert.equal(n.place, place);
      assert(c.present(id, place));
      assert.equal(
        c.receipts.filter((r) => r.actorId === id && r.type === "arrived")
          .length,
        beforeArrivals + 1,
      );
    }
  }
  console.log(`Certified ${travelFrames} physical travel frames`);
});

test("proximity, responses, exit and interrupted intent recover without a false arrival", () => {
  const c = create();
  holdOthers(c, 11);
  const n = c.npc(11);
  assert(!c.talk(11), "remote conversation is rejected");
  c.player = { x: n.x + 1.5, z: n.z, y: n.y, moving: false };
  assert(c.talk(11));
  assert.equal(c.conversation.actorId, 11);
  assert(c.choose("casual"));
  assert.equal(c.conversation.turn, 1);
  assert(!c.choose("nonexistent"));
  assert(!c.talk(13));
  c.endConversation();
  assert.equal(c.conversation, null);
  assert(
    c.request(n, {
      activity: "rest",
      place: "shelter",
      duration: 5,
      reason: "test",
    }),
  );
  advance(c, 2);
  const before = { ...n };
  const arrivals = c.metrics.arrivals;
  c.interrupt(n);
  assert.equal(distance(n, before), 0);
  assert.equal(c.metrics.arrivals, arrivals);
  assert.equal(n.place, null);
  advance(c, 10);
  assert(c.metrics.decisions > 0);
});

test("approaches walk physically, can be accepted/declined and cancel when the player leaves", () => {
  for (const action of ["accept", "decline", "walk-away"]) {
    const c = create();
    for (const n of c.npcs) {
      n.until = 1e8;
      n.groupId = null;
    }
    c.groups.splice(0);
    const n = c.npc(18);
    assert(c.startApproach(18));
    const initial = { ...n };
    assert.equal(distance(n, initial), 0);
    assert.equal(c.incomingId, null);
    for (let i = 0; i < 1200 && c.incomingId === null; i++) c.step(1 / 30);
    assert.equal(c.incomingId, 18);
    assert(distance(n, c.player) > 1.3 && distance(n, c.player) < 2.5);
    if (action === "accept") {
      assert(c.talk(18));
      assert(c.conversation);
      c.endConversation();
    } else if (action === "decline") c.declineApproach();
    else {
      c.player.moving = true;
      c.step(1 / 30);
    }
    assert.equal(c.incomingId, null);
    assert.equal(n.approach, "none");
    assert(n.approachCooldown > c.now + 60);
  }
});

test("private meeting knowledge is owner-scoped; movement never grants a witness destination presence", () => {
  const p = new DemoCampProvider(rng(7)),
    c = create(p);
  const receipt = {
    id: "private-test",
    actorId: 11,
    participantIds: [13],
    witnessIds: [18],
    type: "seen_together",
    place: "beach",
    privacy: "private",
    at: 1,
  };
  p.receive(receipt);
  p.receive(receipt);
  assert.equal(p.knowledge(18).filter((k) => k.id === receipt.id).length, 1);
  assert.equal(p.knowledge(18).find((k) => k.id === receipt.id).detail, "");
  assert(!p.knowledge(4).some((k) => k.id === receipt.id));
  const line = p.dialogue(11, "rest", "cooperate");
  p.exchange(11, [11, 13], line, 2, "beach");
  assert(
    p.memory.memory["11"].conversationHistory.some((h) => h.line === line.line),
  );
  assert(
    !p.memory.memory["18"].conversationHistory?.some(
      (h) => h.line === line.line,
    ),
  );
  const n = c.npc(18);
  c.request(n, {
    activity: "rest",
    place: "shelter",
    duration: 5,
    reason: "test",
  });
  assert(!c.audience([4, 13], "public").observerIds.includes(18));
  assert(!c.present(18, "shelter"));
  assert(!c.present(18, "campfire"));
  assert(
    !p.dialogue(4, "rest", "person", 18).line.includes("shelter"),
    "no remote intent disclosure",
  );
});

test("autonomous providers vary activities and decision times, form and leave real groups", () => {
  const activitySets = new Map(),
    decisionTimes = new Set();
  let exchanges = 0,
    departures = 0;
  for (const seed of [19, 47, 81]) {
    const provider = new DemoCampProvider(rng(seed));
    const c = create(provider, seed);
    const receive = provider.receive.bind(provider);
    provider.receive = (r) => {
      if (r.type === "seen_together") exchanges++;
      if (r.type === "departed") {
        departures++;
        decisionTimes.add(r.at.toFixed(2));
      }
      receive(r);
    };
    for (let i = 0; i < 18000; i++) {
      c.step(1 / 30);
      for (const n of c.npcs) {
        if (!activitySets.has(n.id)) activitySets.set(n.id, new Set());
        activitySets.get(n.id).add(n.intent.activity);
        if (n.groupId !== null) {
          const g = c.groups.find((g) => g.id === n.groupId);
          assert(g?.participantIds.includes(n.id));
          assert(!n.traveling);
          for (const id of g.participantIds) assert(distance(n, c.npc(id)) < 5);
        }
      }
      if (c.incomingId !== null) c.declineApproach();
    }
    assert(c.metrics.decisions > 15);
    assert(c.metrics.arrivals > 12);
    assert(c.metrics.failedRoutes < 3);
  }
  for (const [id, activities] of activitySets)
    assert(activities.size >= 3, `${id}: ${[...activities]}`);
  assert(exchanges > 4);
  assert(departures > 40);
  assert(decisionTimes.size > 30);
  console.log(
    JSON.stringify({
      activities: Object.fromEntries(
        [...activitySets].map(([k, v]) => [k, [...v]]),
      ),
      exchanges,
      departures,
    }),
  );
});

test("walking stance feet stay planted and articulated legs solve ground targets", async () => {
  const { sampleFoot, solveLeg } =
    await import("../src/game/characterMotion.ts");
  for (const scale of [0.93, 0.94, 1, 1.055]) {
    let planted;
    for (let i = 0; i < 30; i++) {
      const traveled = (i / 30) * 0.59 * scale,
        foot = sampleFoot(traveled, scale);
      assert(foot.stance);
      const world = traveled + foot.z * scale;
      planted ??= world;
      assert(
        Math.abs(world - planted) < 1e-8,
        "stance foot slips against actual displacement",
      );
    }
  }
  for (const z of [-0.3, -0.1, 0, 0.1, 0.3])
    for (const y of [-0.72, -0.76]) {
      const r = solveLeg(y, z);
      const actualY =
        -0.43 * Math.cos(r.hip) - 0.405 * Math.cos(r.hip + r.knee);
      const actualZ =
        -0.43 * Math.sin(r.hip) - 0.405 * Math.sin(r.hip + r.knee);
      assert(Math.hypot(actualY - y, actualZ - z) < 1e-8);
      assert(Math.abs(r.hip + r.knee + r.ankle) < 1e-8, "foot stays level");
    }
});
