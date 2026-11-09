import assert from "node:assert/strict";
import test from "node:test";
import { cast, castMember, assignAiSurvivors, DEMO_AI_IDS, PLAYER_SLOT, survivorIdForSlot } from "../src/game/character/cast.ts";
import { readSurvivorSelection, saveSurvivorSelection } from "../src/game/character/selectionSave.ts";
import { TravelManager } from "../src/game/locations/travel.ts";
import { CoastalEngine } from "../src/game/challenge/coastal/engine.ts";
import { assignEntrants } from "../src/game/challenge/stillwater/engine.ts";

test("all original survivor IDs and data stay separate from the human input slot", () => {
  assert.equal(cast.length, 18);
  assert.deepEqual(cast.map(({ source }) => source.id), Array.from({ length: 18 }, (_, i) => i + 1));
  assert.equal(castMember(PLAYER_SLOT), undefined);
  assert.equal(castMember(1).source.speed, 10);
  assert.equal(castMember(10).source.name, "Cirie Fields");
  assert.equal(castMember(17).source.season, "Survivor 44");
  for (const { source } of cast) {
    const ai = assignAiSurvivors(DEMO_AI_IDS, source.id);
    assert.equal(ai.length, DEMO_AI_IDS.length);
    assert.equal(new Set(ai).size, ai.length);
    assert.ok(!ai.includes(source.id));
    assert.equal(survivorIdForSlot(PLAYER_SLOT, source.id), source.id);
    assert.deepEqual(ai.map((id) => survivorIdForSlot(id, source.id)), ai);
    assert.ok(ai.every((id) => castMember(id)));
  }
});

test("selection reloads by numeric source ID and safely handles invalid or unavailable storage", () => {
  const map = new Map();
  const storage = { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  assert.equal(readSurvivorSelection(storage), null);
  assert.equal(saveSurvivorSelection(storage, 18), true);
  assert.equal(saveSurvivorSelection(storage, PLAYER_SLOT), false);
  assert.equal(readSurvivorSelection(storage), 18);
  for (const invalid of ["broken", '{"version":2,"survivorId":18}', '{"version":1,"survivorId":"18"}', '{"version":1,"survivorId":19}']) {
    assert.equal(readSurvivorSelection({ getItem: () => invalid }), null);
  }
  assert.equal(readSurvivorSelection({ getItem: () => { throw new Error("blocked"); } }), null);
  assert.equal(saveSurvivorSelection({ setItem: () => { throw new Error("blocked"); } }, 4), false);
});

test("new session selection survives travel, temporary rehearsals and restoration", async () => {
  const manager = new TravelManager(async () => {}, () => {}, 0, () => true, () => true, 13);
  assert.equal(manager.session.participant.survivorId, 13);
  assert.equal(manager.beginSurvivorSession(333), false);
  assert.equal(manager.beginSurvivorSession(11), true);
  const session = manager.session;
  manager.enter("camp_tribe_a");
  await new Promise((resolve) => setTimeout(resolve, 5));
  const token = manager.getSnapshot().token;
  await manager.loadPending(token);
  manager.ready(token);
  assert.equal(manager.session.participant.survivorId, 11);
  assert.equal(manager.beginSurvivorSession(4), false);
  manager.menu();
  assert.equal(manager.enterChallengeTesting("beach-obstacle"), true);
  assert.notEqual(manager.session, session);
  assert.equal(manager.session.participant.survivorId, 11);
  manager.menu();
  assert.equal(manager.session, session);
});

test("challenge engines keep a single human slot while accepting its selected identity presentation", () => {
  const entrant = { id: PLAYER_SLOT, name: "Sandra (You)", ability: 0.9, physical: 0.6 };
  const roster = [entrant, { id: 1, name: "Ozzy" }, entrant];
  const coastal = new CoastalEngine(roster);
  assert.equal(coastal.player.name, entrant.name);
  assert.deepEqual(coastal.state.runners.map((person) => person.id), [PLAYER_SLOT, 1]);
  const stillwater = assignEntrants(roster);
  assert.equal(stillwater[0].name, entrant.name);
  assert.deepEqual(stillwater.map((person) => person.id), [PLAYER_SLOT, 1]);
});
