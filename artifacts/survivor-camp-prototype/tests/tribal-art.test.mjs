import test from "node:test";
import assert from "node:assert/strict";
import { prangGeometry } from "../src/game/tribal/thaiArchitecture.ts";
import {
  INTERESTS,
  nearbyInterest,
  tribalInteractions,
} from "../src/game/tribal/interactions.ts";
import { TRIBAL } from "../src/game/tribal/layout.ts";

test("authored prang has a finite, correctly oriented recessed silhouette", () => {
  const g = prangGeometry(22, 4.2);
  g.computeBoundingBox();
  assert.equal(g.boundingBox.min.y, 0);
  assert.equal(g.boundingBox.max.y, 22);
  assert.ok(g.boundingBox.max.x > 4.19);
  for (const key of ["position", "normal", "uv"])
    for (const n of g.getAttribute(key).array) assert.ok(Number.isFinite(n));
  // Front wall normals must point outward, otherwise the entire tower disappears with back-face culling.
  const p = g.getAttribute("position"),
    n = g.getAttribute("normal");
  let front = false;
  for (let i = 0; i < p.count; i++)
    if (p.getZ(i) < -4 && n.getZ(i) < -0.5) front = true;
  assert.ok(front);
  g.dispose();
});

test("environment interests are reachable and practice ballots remain separate from season outcomes", () => {
  assert.equal(nearbyInterest(-34, 17.3)?.id, "ballot");
  assert.equal(nearbyInterest(38, 25), null);
  const seat = TRIBAL.seats.at(-1).position;
  assert.equal(nearbyInterest(seat[0], seat[2] + 1.05)?.id, "seat");
  for (const p of INTERESTS)
    assert.ok(Number.isFinite(p.radius) && p.radius > 0);
  tribalInteractions.reset();
  tribalInteractions.open("ballot");
  tribalInteractions.fold("   ");
  assert.equal(tribalInteractions.getSnapshot().folded, false);
  tribalInteractions.fold("  Sandra  ");
  assert.deepEqual(tribalInteractions.getSnapshot(), {
    open: null,
    ballot: "Sandra",
    folded: true,
  });
  tribalInteractions.reset();
  assert.equal(tribalInteractions.getSnapshot().ballot, "");
});

test("pavement is grounded, finite and continuously covers the courtyard, booth and new exit", async () => {
  const { pavementTiles, pavedAt } =
    await import("../src/game/tribal/paving.ts");
  const { tribalHeight, EXIT_PATH } =
    await import("../src/game/tribal/layout.ts");
  const tiles = pavementTiles();
  assert.ok(tiles.length > 0);
  let area = 0;
  for (const { geometry: g } of tiles) {
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i += 3)
      area +=
        Math.abs(
          (p.getX(i + 1) - p.getX(i)) * (p.getZ(i + 2) - p.getZ(i)) -
            (p.getZ(i + 1) - p.getZ(i)) * (p.getX(i + 2) - p.getX(i)),
        ) / 2;
    for (let i = 0; i < p.count; i++) {
      assert.ok(Number.isFinite(p.getY(i)));
      assert.ok(
        Math.abs(p.getY(i) - tribalHeight(p.getX(i), p.getZ(i))) < 0.006,
      );
    }
    g.dispose();
  }
  assert.ok(
    area > 740 && area < 850,
    "reclaimed courtyard retains substantial stone circulation while exposing soil",
  );
  for (const p of [
    ...EXIT_PATH,
    { x: 6, z: 4 },
    { x: -34, z: 18 },
    { x: -24, z: 8 },
  ])
    assert.ok(pavedAt(p.x, p.z));
});
