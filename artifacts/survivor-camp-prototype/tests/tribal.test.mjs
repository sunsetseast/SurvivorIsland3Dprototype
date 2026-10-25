import {
  CAST,
  INTRO_DURATION,
  INTRO_SHOTS,
  stageAt,
  stagedRoute,
  tribalIntro,
} from "../src/game/tribal/intro.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  ARRIVAL,
  EXIT_PATH,
  JURY_PATH,
  VOTING_PATH,
  SOLIDS,
  TRIBAL,
  moveTribal,
  tribalBlocked,
  tribalHeight,
  tribalLocation,
} from "../src/game/tribal/layout.ts";

function walk(points) {
  let p = { ...points[0] },
    worstGrade = 0;
  assert.equal(
    tribalBlocked(p.x, p.z),
    false,
    `blocked route start ${JSON.stringify(p)}`,
  );
  for (const target of points.slice(1)) {
    const steps = Math.ceil(Math.hypot(target.x - p.x, target.z - p.z) / 0.07);
    const dx = (target.x - p.x) / steps,
      dz = (target.z - p.z) / steps;
    for (let i = 0; i < steps; i++) {
      const next = moveTribal(p, dx, dz);
      assert.equal(tribalBlocked(next.x, next.z), false);
      worstGrade = Math.max(
        worstGrade,
        Math.abs(tribalHeight(next.x, next.z) - tribalHeight(p.x, p.z)),
      );
      p = next;
    }
    assert.ok(
      Math.hypot(p.x - target.x, p.z - target.z) < 0.03,
      `route blocked before ${JSON.stringify(target)} at ${JSON.stringify(p)}`,
    );
  }
  assert.ok(worstGrade < 0.14, `abrupt grounding change ${worstGrade}`);
}

test("locked geography is never mirrored or rotated", () => {
  assert.ok(
    TRIBAL.seats.every(
      (a) => a.position[2] < -9 && Math.abs(a.position[0]) < 10,
    ),
  );
  assert.ok(
    TRIBAL.jurors.every(
      (a) => a.position[0] < -15 && a.position[2] > -8 && a.position[2] < 1,
    ),
  );
  assert.ok(
    TRIBAL.arrival.position[0] < -25 && TRIBAL.arrival.position[2] < -25,
  );
  assert.ok(
    TRIBAL.vote.position[0] <
      Math.min(...TRIBAL.jurors.map((a) => a.position[0])) - 8 &&
      TRIBAL.vote.position[2] > 10,
  );
  assert.ok(TRIBAL.host.position[0] > 8 && TRIBAL.host.position[2] > 2);
  assert.ok(
    TRIBAL.exit.position[0] > TRIBAL.host.position[0] &&
      TRIBAL.exit.position[2] > TRIBAL.host.position[2],
  );
});
for (const [name, path] of Object.entries({
  arrival: ARRIVAL,
  vote: VOTING_PATH,
  exit: EXIT_PATH,
  jury: JURY_PATH,
})) {
  test(`${name} route is physically walkable both ways`, () => {
    walk(path);
    walk([...path].reverse());
  });
}
test("each contestant can leave a stump into a broad shared aisle", () => {
  assert.equal(TRIBAL.seats.length, 12);
  for (let i = 1; i < 12; i++)
    assert.equal(
      Math.sign(TRIBAL.seats[i].position[2] - TRIBAL.seats[i - 1].position[2]),
      i % 2 ? -1 : 1,
      "alternating forward/back stagger",
    );
  for (const seat of TRIBAL.seats) {
    const [x, , z] = seat.position;
    walk([
      { x, z: z + 1 },
      { x, z: -7 },
      { x: -11, z: -7 },
    ]);
  }
});
test("collision substeps prevent tunnelling through fire, tree trunks, walls and furniture", () => {
  assert.equal(tribalBlocked(0, 0), true);
  for (const id of [
    "backdrop",
    "booth-back",
    "writing-table",
    "host-seat",
    "stump-1",
    "tree-0",
  ]) {
    const solid = SOLIDS.find((s) => s.id === id);
    if (!solid && id === "tree-0") continue;
    assert.ok(solid);
    assert.equal(tribalBlocked(solid.x, solid.z), true, id);
  }
  const p = moveTribal({ x: 0, z: 7 }, 0, -20);
  assert.ok(p.z >= 2.85, JSON.stringify(p));
  assert.equal(tribalBlocked(p.x, p.z), false);
});
test("future anchors have unique stable IDs and finite stage/camera coordinates", () => {
  const anchors = [
    ...Object.values(TRIBAL).filter(
      (v) => v && typeof v === "object" && "position" in v,
    ),
    ...TRIBAL.seats,
    ...TRIBAL.jurors,
  ];
  assert.equal(new Set(anchors.map((a) => a.id)).size, anchors.length);
  anchors.forEach((a) => {
    a.position.forEach((v) => assert.ok(Number.isFinite(v)));
    assert.ok(Number.isFinite(a.facing));
  });
  Object.values(TRIBAL.cameras).forEach((c) =>
    [...c.position, ...c.target].forEach((n) => assert.ok(Number.isFinite(n))),
  );
  assert.equal(tribalLocation(-34, 18), "The Voting Chamber");
});

test("opening stages drone, ruin detail, Jeff, arrivals, then seated handoff", () => {
  assert.deepEqual(
    INTRO_SHOTS.map((s) => s.label),
    [
      "The forgotten sanctuary",
      "Stone remembers",
      "Jeff Probst · Host",
      "Bring in the survivors",
      "Take a seat",
    ],
  );
  assert.ok(INTRO_SHOTS[0].from[1] > 30);
  for (let i = 0; i < CAST.length; i++) {
    walk(stagedRoute(i));
    let before = stageAt(0, i);
    for (let t = 0.05; t < INTRO_DURATION; t += 0.05) {
      const p = stageAt(t, i);
      assert.ok(
        Math.hypot(p.x - before.x, p.z - before.z) < 0.15,
        "arrival must not teleport",
      );
      assert.ok(Number.isFinite(p.y));
      before = p;
    }
    assert.ok(stageAt(INTRO_DURATION + 1, i).arrived);
  }
  tribalIntro.reset();
  assert.equal(tribalIntro.getSnapshot(), "intro");
  tribalIntro.skip();
  assert.equal(tribalIntro.getSnapshot(), "seated");
  tribalIntro.stand();
  assert.equal(tribalIntro.getSnapshot(), "explore");
  tribalIntro.reset();
});
