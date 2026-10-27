import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  project,
  unproject,
  COAST,
  LAGOON,
  inside,
  edgeDistance,
  ZONES,
  KARSTS,
  ANCHORS,
} from "../src/game/railay/geography.ts";
import {
  GRID,
  SIZE,
  prepareTerrain,
  heightAt,
  gridHeight,
  slopeAt,
  walkable,
  moveOnTerrain,
  chunkLod,
  releaseTerrain,
} from "../src/game/railay/terrain.ts";
import { plantsInChunk } from "../src/game/railay/vegetation.ts";
const near = (a, b, e = 1e-5) =>
  assert.ok(Math.abs(a - b) < e, `${a} differs from ${b}`);
test("geographic conversion uses metres and round-trips longitude/latitude", () => {
  for (const [lon, lat] of [
    [98.833, 8.017],
    [98.842, 8.005],
    [98.85, 8.023],
  ]) {
    const p = project(lon, lat),
      q = unproject(p.x, p.z);
    near(q[0], lon);
    near(q[1], lat);
  }
  near(project(98.838, 8.011).x, 0);
  assert.ok(project(98.839, 8.011).x > 110);
  assert.ok(project(98.838, 8.012).z < 0);
});
test("four coastal zones and lagoon retain correct relative topology", () => {
  const [t, w, e, p, l] = ZONES;
  assert.ok(t.point.x < w.point.x && t.point.z < w.point.z);
  assert.ok(e.point.x > w.point.x);
  assert.ok(p.point.z > w.point.z);
  assert.ok(l.point.x > p.point.x);
  assert.ok(inside(l.point.x, l.point.z, LAGOON));
  assert.ok(inside(...Object.values(project(98.839, 8.022)), COAST));
  assert.ok(COAST.length > 600);
});
test("all sampled terrain heights are finite and dimensions match the geography grid", () => {
  const d = prepareTerrain();
  assert.equal(d.heights.length, SIZE * SIZE);
  assert.equal(d.shores.length, SIZE * SIZE);
  assert.ok(d.heights.every(Number.isFinite));
  assert.ok(Math.max(...d.heights.slice(0, 5000)) < 250);
});
test("terrain chunk edges share identical coordinate / height samples", () => {
  for (let c = -1800; c < 1200; c += 300)
    for (let k = 0; k <= 50; k++) {
      const z = -300 + k * 6;
      const i = Math.round((c - GRID.min) / 6),
        j = Math.round((z - GRID.min) / 6);
      near(gridHeight(i, j), heightAt(c, z), 0.0001);
    }
});
test("triangle interpolation grounds navigation on the rendered triangle", () => {
  const i = 350,
    j = 300,
    x = GRID.min + i * 6,
    z = GRID.min + j * 6;
  const a = gridHeight(i, j),
    b = gridHeight(i + 1, j),
    c = gridHeight(i, j + 1);
  near(heightAt(x + 1.5, z + 1.5), a + (b - a) * 0.25 + (c - a) * 0.25, 0.001);
});
test("every exploration destination spawns above water on traversable ground", () => {
  for (const z of ZONES) assert.ok(walkable(z.spawn.x, z.spawn.z), z.id);
});
test("step subdivision stops water entry and sheer cliff ascent; invalid movement is rejected", () => {
  const p = ZONES[1].spawn;
  assert.deepEqual(moveOnTerrain(p, NaN, 0), p);
  assert.deepEqual(moveOnTerrain(p, 100, 0), p);
  let q = { ...p };
  for (let i = 0; i < 1000; i++) q = moveOnTerrain(q, -0.25, 0);
  assert.ok(heightAt(q.x, q.z) > 0.12);
  assert.ok(q.x > p.x - 250);
  let stopped = 0;
  for (const k of KARSTS.slice(0, 5)) {
    const a = k.outline[0];
    if (slopeAt(a.x, a.z) > 0.9) stopped++;
  }
  assert.ok(stopped > 0);
});
test("small player steps progress and stay grounded", () => {
  let p = { ...ZONES[1].spawn };
  const start = { ...p };
  for (let i = 0; i < 100; i++) {
    p = moveOnTerrain(p, 0, 0.04);
    assert.ok(walkable(p.x, p.z));
  }
  assert.ok(Math.hypot(p.x - start.x, p.z - start.z) > 2);
});
test("quality modes change LOD distance, preserving coordinates and collision data", () => {
  assert.equal(chunkLod(100, false), 1);
  assert.equal(chunkLod(450, true), 2);
  assert.equal(chunkLod(450, false), 1);
  assert.equal(chunkLod(900, false), 2);
  const p = ZONES[1].spawn,
    h = heightAt(p.x, p.z);
  releaseTerrain();
  near(heightAt(p.x, p.z), h);
});
test("ecological placement is deterministic, grounded, varied and cheaper in low mode", () => {
  const a = plantsInChunk(0, 0, false),
    b = plantsInChunk(0, 0, false),
    low = plantsInChunk(0, 0, true);
  assert.deepEqual(a, b);
  assert.ok(low.length < a.length);
  assert.ok(new Set(a.map((p) => p.kind)).size >= 2);
  for (const p of a) near(p.y, heightAt(p.x, p.z));
});
test("future location anchors contain planning data only", () => {
  assert.equal(Object.keys(ANCHORS).length, 5);
  for (const a of Object.values(ANCHORS)) assert.ok(inside(a.x, a.z, COAST));
});
test("Blender geology is complete and matches its declared binary hash", async () => {
  const { createHash } = await import("node:crypto");
  const dir = new URL("../src/assets/railay/", import.meta.url),
    b = readFileSync(new URL("geology.glb", dir)),
    m = JSON.parse(readFileSync(new URL("geology.json", dir)));
  assert.equal(b.toString("utf8", 0, 4), "glTF");
  assert.equal(b.readUInt32LE(8), b.length);
  assert.equal(createHash("sha256").update(b).digest("hex"), m.sha256);
  assert.ok(b.length < 500000);
});

test("actual terrain mesh vertices / triangle winding match movement height samples", async () => {
  const { makeChunk } = await import("../src/game/railay/Terrain.tsx");
  const high = makeChunk(0, 0, 1),
    low = makeChunk(0, 0, 2),
    p = high.getAttribute("position");
  for (let i = 0; i < 51 * 51; i += 37)
    near(p.getY(i), heightAt(p.getX(i), p.getZ(i)), 0.001);
  assert.ok(low.index.count < high.index.count);
  assert.ok(high.getAttribute("normal").array.every(Number.isFinite));
  let disposed = 0;
  high.addEventListener("dispose", () => disposed++);
  high.dispose();
  low.dispose();
  assert.equal(disposed, 1);
});
test("camera cliff envelopes use fewer triangles than the visible karst", async () => {
  const { makeCliff } = await import("../src/game/railay/Terrain.tsx"),
    hero = makeCliff(KARSTS[0]),
    proxy = makeCliff(KARSTS[0], true);
  assert.ok(proxy.index.count < hero.index.count / 2);
  assert.ok(proxy.getAttribute("position").array.every(Number.isFinite));
  hero.dispose();
  proxy.dispose();
});
test("reserved challenge footprint is usable natural beach ground", () => {
  const a = ANCHORS.challengeWest;
  for (const dx of [-10, 10])
    for (const dz of [-26, 26]) {
      assert.ok(heightAt(a.x + dx, a.z + dz) > 0.12);
      assert.ok(slopeAt(a.x + dx, a.z + dz) < 0.4);
    }
});
test("hero karst footprints have no crossing boundary segments", () => {
  const turn = (a, b, c) =>
    (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  for (const k of KARSTS) {
    const p = k.outline;
    for (let i = 0; i < p.length; i++)
      for (let j = i + 2; j < p.length; j++) {
        if (i === 0 && j === p.length - 1) continue;
        const a = p[i],
          b = p[(i + 1) % p.length],
          c = p[j],
          d = p[(j + 1) % p.length];
        assert.ok(
          !(
            turn(a, b, c) * turn(a, b, d) < -1e-8 &&
            turn(c, d, a) * turn(c, d, b) < -1e-8
          ),
          `${k.id} boundary crosses at ${i},${j}`,
        );
      }
  }
});
