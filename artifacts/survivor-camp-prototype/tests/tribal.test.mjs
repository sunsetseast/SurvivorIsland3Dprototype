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
  COUNCIL,
  TOWERS,
  occupiedSeats,
  approachSurface,
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
      (a) =>
        a.position[2] < -5 && a.position[2] > -8 && Math.abs(a.position[0]) < 8,
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
  assert.ok(
    TRIBAL.host.position[0] > 4 &&
      TRIBAL.host.position[0] < 8 &&
      TRIBAL.host.position[2] > 2,
  );
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
  assert.equal(TRIBAL.seats.length, CAST.length);
  for (let i = 1; i < TRIBAL.seats.length; i++)
    assert.equal(
      Math.sign(TRIBAL.seats[i].position[2] - TRIBAL.seats[i - 1].position[2]),
      i % 2 ? -1 : 1,
      "alternating forward/back stagger",
    );
  for (const seat of TRIBAL.seats) {
    const [x, , z] = seat.position;
    walk([
      { x, z: z + 1 },
      { x, z: COUNCIL.aisleZ },
      { x: -10, z: COUNCIL.aisleZ },
    ]);
  }
});
test("collision substeps prevent tunnelling through fire, tree trunks, walls and furniture", () => {
  assert.equal(tribalBlocked(0, 0), true);
  for (const id of [
    "backdrop",
    "booth-back",
    "writing-table",
    "host-podium",
    "stump-1",
    "tree-0",
  ]) {
    const solid = SOLIDS.find((s) => s.id === id);
    if (!solid && id === "tree-0") continue;
    assert.ok(solid);
    assert.equal(tribalBlocked(solid.x, solid.z), true, id);
  }
  const p = moveTribal({ x: 0, z: 7 }, 0, -20);
  assert.ok(p.z >= COUNCIL.fireRadius + 0.35, JSON.stringify(p));
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

test("intimate host, fire and cast proportions retain body clearance", () => {
  assert.equal(occupiedSeats(5).length, 5);
  assert.deepEqual(occupiedSeats(CAST.length), TRIBAL.seats);
  assert.deepEqual(occupiedSeats(0), []);
  for (let i = 0; i < TRIBAL.seats.length; i++)
    for (let j = i + 1; j < TRIBAL.seats.length; j++) {
      const a = TRIBAL.seats[i].position,
        b = TRIBAL.seats[j].position;
      assert.ok(Math.hypot(a[0] - b[0], a[2] - b[2]) > 1.5);
    }
  assert.ok(Math.hypot(COUNCIL.host.x, COUNCIL.host.z) < 8);
  assert.ok(
    Math.hypot(
      COUNCIL.host.x - COUNCIL.podium.x,
      COUNCIL.host.z - COUNCIL.podium.z,
    ) > 1.1,
  );
  assert.equal(tribalBlocked(COUNCIL.host.x, COUNCIL.host.z, 0), false);
  assert.equal(tribalHeight(COUNCIL.host.x, COUNCIL.host.z), COUNCIL.host.y);
  assert.ok(TOWERS[0].height > 20);
});

test("entrance has twelve physical risers, level bridge and continuous landings", () => {
  for (let i = 2; i <= 3; i++) {
    const a = ARRIVAL[i],
      b = ARRIVAL[i + 1];
    const values = new Set();
    for (let j = 0; j < 120; j++) {
      const t = (j + 0.5) / 120,
        x = a.x + (b.x - a.x) * t,
        z = a.z + (b.z - a.z) * t;
      const surface = approachSurface(x, z);
      values.add(surface.height.toFixed(2));
      assert.ok(Math.abs(tribalHeight(x, z) - surface.height) < 0.001);
    }
    assert.equal(values.size, 6);
  }
  const a = ARRIVAL[4],
    b = ARRIVAL[5];
  for (let j = 1; j < 10; j++)
    assert.equal(
      tribalHeight(a.x + ((b.x - a.x) * j) / 10, a.z + ((b.z - a.z) * j) / 10),
      0.6,
    );
});

test("ceremony ambience continues after seating and returning to seat is reversible", () => {
  tribalIntro.skip();
  const t = tribalIntro.ceremonyTime;
  tribalIntro.step(0.03);
  assert.ok(tribalIntro.ceremonyTime > t);
  tribalIntro.stand();
  tribalIntro.sit();
  assert.equal(tribalIntro.getSnapshot(), "seated");
  tribalIntro.reset();
});

test("host can distinguish the five attending faces despite the alternating stagger", () => {
  const angles = occupiedSeats(5)
    .map((s) =>
      Math.atan2(
        s.position[0] - COUNCIL.host.x,
        s.position[2] - COUNCIL.host.z,
      ),
    )
    .sort((a, b) => a - b);
  for (let i = 1; i < angles.length; i++)
    assert.ok(angles[i] - angles[i - 1] > 0.035);
});

test("scenery footprints protect the complete ceremonial corridor and arrival group width", async () => {
  const { PRACTICALS, corridorClear, pathDistance, TREES } =
    await import("../src/game/tribal/layout.ts");
  assert.ok(PRACTICALS.some((p) => p.id.startsWith("arrival-torch")));
  assert.ok(PRACTICALS.some((p) => p.id.startsWith("vote-torch")));
  assert.ok(PRACTICALS.some((p) => p.id.startsWith("exit-torch")));
  assert.equal(
    PRACTICALS.filter((p) => p.id.startsWith("personal-")).length,
    CAST.length,
  );
  for (const p of PRACTICALS) {
    assert.ok(corridorClear(p.x, p.z, p.radius), p.id);
    assert.ok(
      SOLIDS.some((s) => s.id === p.id),
      `missing practical collider ${p.id}`,
    );
  }
  for (const t of TREES) assert.ok(corridorClear(t.x, t.z, 2.7));
  // Old offending torch (-26.7,-21) is only 1.06m from the diagonal entrance.
  assert.ok(!corridorClear(-26.7, -21, 0.26));
  for (let i = 1; i < ARRIVAL.length; i++) {
    const a = ARRIVAL[i - 1],
      b = ARRIVAL[i],
      dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz);
    for (let j = 1; j < 30; j++)
      for (const offset of [-0.52, 0, 0.52]) {
        const x = a.x + (dx * j) / 30 - (dz / len) * offset,
          z = a.z + (dz * j) / 30 + (dx / len) * offset;
        assert.ok(!tribalBlocked(x, z, 0.3), `group corridor ${x},${z}`);
      }
  }
});

test("voting privacy uses the attached pavilion envelope, with both freestanding walls deleted", async () => {
  const { STRUCTURES } = await import("../src/game/tribal/layout.ts");
  assert.ok(!SOLIDS.some((s) => s.id.startsWith("privacy-wall")));
  const walls = STRUCTURES.filter((s) => s.id.startsWith("booth-"));
  // Every eye ray from council/host to all four corners of the writing surface
  // meets the room's masonry below its 3.8m cap (eye and parchment are below 2m).
  for (const eye of [
    ...TRIBAL.seats.map((s) => ({ x: s.position[0], z: s.position[2] })),
    COUNCIL.host,
  ])
    for (const x of [-34.47, -33.72])
      for (const z of [15.9, 16.4]) {
        let obscured = false;
        for (let k = 1; k < 800; k++) {
          const p = {
            x: eye.x + ((x - eye.x) * k) / 800,
            z: eye.z + ((z - eye.z) * k) / 800,
          };
          if (
            walls.some(
              (w) => Math.abs(p.x - w.x) < w.hx && Math.abs(p.z - w.z) < w.hz,
            )
          )
            obscured = true;
        }
        assert.ok(obscured, `visible ballot from ${JSON.stringify(eye)}`);
      }
});

test("elimination approaches Jeff, pauses to snuff, then departs by the side apron", async () => {
  const { EXIT_ORIGIN } = await import("../src/game/tribal/layout.ts");
  const { eliminationApproach, eliminationDeparture, eliminationAt } =
    await import("../src/game/tribal/elimination.ts");
  assert.deepEqual(EXIT_PATH[0], EXIT_ORIGIN);
  assert.ok(EXIT_ORIGIN.x > 10 && EXIT_ORIGIN.z < COUNCIL.host.z - 2);
  assert.deepEqual(eliminationDeparture.slice(1), EXIT_PATH);
  for (let i = 0; i < CAST.length; i++) {
    walk(eliminationApproach(i));
    walk(eliminationDeparture);
    let previous = eliminationAt(0, i),
      phases = new Set();
    for (let t = 0.04; t < 90; t += 0.04) {
      const p = eliminationAt(t, i);
      phases.add(p.phase);
      assert.ok(
        !tribalBlocked(p.x, p.z),
        `elimination actor ${i}: ${p.x},${p.z}`,
      );
      assert.ok(Math.hypot(p.x - previous.x, p.z - previous.z) < 0.07);
      if (p.phase === "exit") assert.equal(p.lit, false);
      previous = p;
      if (p.done) break;
    }
    assert.deepEqual([...phases], ["approach", "snuff", "exit"]);
    assert.ok(previous.done);
  }
  tribalIntro.rehearse();
  assert.equal(tribalIntro.getSnapshot(), "elimination");
  for (let i = 0; i < 3000 && tribalIntro.getSnapshot() === "elimination"; i++)
    tribalIntro.step(0.05);
  assert.equal(tribalIntro.getSnapshot(), "seated");
  tribalIntro.reset();
});
