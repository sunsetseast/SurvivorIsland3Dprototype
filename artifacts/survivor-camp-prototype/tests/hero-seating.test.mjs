import test from "node:test";
import assert from "node:assert/strict";
import { councilAttendance } from "../src/game/tribal/attendance.ts";
import {
  occupiedSeats,
  TRIBAL,
  SOLIDS,
  PRACTICALS,
  councilSolids,
  tribalBlocked,
  COUNCIL,
} from "../src/game/tribal/layout.ts";
import {
  CAST,
  CAST_SEATS,
  INTRO_DURATION,
  PLAYER_INDEX,
  stageAt,
  tribalIntro,
  playerSeat,
} from "../src/game/tribal/intro.ts";
import { eliminationApproach } from "../src/game/tribal/elimination.ts";
import { nearbyInterest } from "../src/game/tribal/interactions.ts";
import { buildContestant, LOOKS } from "../src/game/contestantArt.ts";
import {
  samplePresence,
  turnToward,
  solveSeatedLeg,
} from "../src/game/characterMotion.ts";

for (const n of [0, 1, 4, 5, 7, 8, 10, 12])
  test(`${n} attendees share exactly ${n} unique furniture, collision, torch and cinematic anchors`, () => {
    // Move local player to the first slot: no system may assume index 4/seat 7.
    const ids = [0, 4, 11, 13, 18, 1, 2, 3, 5, 6, 7, 8].slice(0, n);
    try {
      councilAttendance.setParticipants(ids);
      assert.deepEqual(CAST, ids);
      assert.equal(CAST_SEATS.length, n);
      assert.deepEqual(CAST_SEATS, TRIBAL.seats);
      assert.equal(SOLIDS.filter((s) => s.id.startsWith("stump-")).length, n);
      assert.equal(
        PRACTICALS.filter((s) => s.id.startsWith("personal-")).length,
        n,
      );
      assert.equal(new Set(CAST_SEATS.map((s) => s.id)).size, n);
      assert.equal(
        new Set(CAST_SEATS.map((s) => s.position.join(","))).size,
        n,
      );
      assert.equal(PLAYER_INDEX, n ? 0 : -1);
      const xs = CAST_SEATS.map((s) => s.position[0]);
      assert.ok(
        Math.abs(xs.reduce((a, b) => a + b, 0)) < 1e-8,
        "layout centred even at odd counts",
      );
      for (let i = 0; i < n; i++) {
        const seat = CAST_SEATS[i];
        assert.ok(tribalBlocked(seat.position[0], seat.position[2]));
        assert.ok(!tribalBlocked(seat.position[0], COUNCIL.aisleZ));
        const final = stageAt(INTRO_DURATION + 2, i);
        assert.ok(final.arrived && final.seated);
        assert.ok(
          Math.hypot(
            final.x - Math.sin(seat.facing) * 0.37 - seat.position[0],
            final.z - Math.cos(seat.facing) * 0.37 - seat.position[2],
          ) < 0.001,
        );
        assert.equal(eliminationApproach(i)[0].x, seat.position[0]);
        if (i)
          assert.ok(
            Math.hypot(
              xs[i] - xs[i - 1],
              seat.position[2] - CAST_SEATS[i - 1].position[2],
            ) > 1.5,
          );
      }
      if (n) {
        assert.equal(
          nearbyInterest(
            playerSeat().position[0],
            playerSeat().position[2] + 1.05,
          )?.id,
          "seat",
        );
        tribalIntro.skip();
        tribalIntro.stand();
        tribalIntro.sit();
        assert.equal(tribalIntro.getSnapshot(), "seated");
      }
      // No maximum-layout collision placeholders beyond the active formation.
      if (n < 10)
        assert.equal(
          councilSolids().some(
            (s) => s.id.startsWith("stump-") && Math.abs(s.x) > 6,
          ),
          false,
        );
    } finally {
      councilAttendance.reset();
      tribalIntro.reset();
    }
  });
test("invalid rosters are rejected atomically; count helper handles numeric edge cases", () => {
  const before = councilAttendance.getSnapshot();
  for (const ids of [
    [4, 4],
    [-1, 0],
    [NaN],
    [1.5],
    Array.from({ length: 13 }, (_, i) => i),
  ])
    assert.throws(() => councilAttendance.setParticipants(ids));
  assert.equal(councilAttendance.getSnapshot(), before);
  for (const n of [NaN, Infinity, -Infinity, -9])
    assert.equal(occupiedSeats(n).length, 0);
  assert.equal(occupiedSeats(5.9).length, 5);
  assert.equal(occupiedSeats(99).length, 12);
});
test("five hero meshes have finite surface masks, distinct silhouettes and bounded draw/triangle budgets", () => {
  const signatures = [];
  for (const id of [-1, 4, 11, 13, 18]) {
    const p = buildContestant(id);
    let triangles = 0;
    for (const part of [
      "torso",
      "pelvis",
      "head",
      "armU",
      "forearm",
      "thigh",
      "shin",
      "foot",
    ]) {
      const g = p[part];
      assert.equal(
        g.getAttribute("heroSurface").count,
        g.getAttribute("position").count,
      );
      for (const attribute of ["position", "normal", "color", "heroSurface"])
        for (const n of g.getAttribute(attribute).array)
          assert.ok(Number.isFinite(n));
      const copies = ["armU", "forearm", "thigh", "shin", "foot"].includes(part)
        ? 2
        : 1;
      triangles +=
        ((g.index ? g.index.count : g.getAttribute("position").count) / 3) *
        copies;
      g.computeBoundingBox();
      assert.ok(g.boundingBox.max.y > g.boundingBox.min.y);
      g.dispose();
    }
    assert.ok(triangles < 15000, `${id}: ${triangles} triangles`);
    signatures.push(
      [p.look.height, p.look.width, p.look.hairStyle, p.look.shirt].join(":"),
    );
  }
  assert.equal(new Set(signatures).size, 5);
  // Unknown future cast IDs still render through the documented prototype fallback.
  const fallback = buildContestant(99);
  assert.ok(fallback.look);
  for (const v of Object.values(fallback)) if (v?.dispose) v.dispose();
});
test("presence is deterministic, desynchronised and shortest-arc heading eases across pi", () => {
  const samples = Object.keys(LOOKS).map((id) =>
    samplePresence(Number(id), 4, 1),
  );
  assert.equal(new Set(samples.map((p) => p.breath)).size, 5);
  assert.deepEqual(samplePresence(11, 4, 1), samplePresence(11, 4, 1));
  const next = turnToward(Math.PI - 0.02, -Math.PI + 0.02, 1 / 30);
  assert.ok(next > Math.PI - 0.02 && next < Math.PI + 0.02);
  for (let t = 0; t < 60; t += 0.13)
    for (const id of [11, 13, 18, 4, -1])
      for (const value of Object.values(samplePresence(id, t, 1)))
        assert.ok(Number.isFinite(value));
});

test("seated soles meet ground for all hero heights and every stool tier", () => {
  for (const { height } of Object.values(LOOKS))
    for (const top of [0.52, 0.535, 0.55]) {
      const pose = solveSeatedLeg(height, top);
      const ankleY =
        (pose.hipHeight -
          0.01 -
          0.43 * Math.cos(pose.hip) -
          0.405 * Math.cos(pose.hip + pose.knee)) *
        height;
      assert.ok(Math.abs(ankleY - 0.052 * height) < 0.001);
      assert.ok(
        Math.abs(pose.hipHeight * height - 0.11 * height - top) < 0.001,
        "pelvis meets seat",
      );
      assert.ok(
        Math.abs(pose.hip + pose.knee + pose.ankle) < 1e-8,
        "flat foot",
      );
    }
});
