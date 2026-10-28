import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  heightAt,
  walkable,
  moveOnTerrain,
} from "../src/game/railay/terrain.ts";
import { trailDistance } from "../src/game/railay/geography.ts";
import { karstDistance } from "../src/game/railay/tonsai/karstField.ts";
import { heroUnderstory } from "../src/game/railay/tonsai/heroPlants.ts";
const asset = new URL("../src/assets/tonsai/", import.meta.url);
const read = (n) => fs.readFileSync(new URL(n, asset));
const load = async (n) => {
  const b = read(n);
  return new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
};
test("quality files have verifiable bytes, bounded geometry and a genuinely lower mobile budget", async () => {
  const manifest = JSON.parse(read("hero-manifest.json"));
  const counts = [];
  for (const f of manifest.files) {
    const b = read(f.file);
    assert.equal(createHash("sha256").update(b).digest("hex"), f.sha256);
    assert.ok(b.length < (f.file.includes("high") ? 5_000_000 : 1_600_000));
    const scene = (await load(f.file)).scene;
    let count = 0;
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry;
      count += g.index.count / 3;
      assert.ok(g.attributes.position.array.every(Number.isFinite));
    });
    counts.push(count);
  }
  assert.ok(counts[1] < counts[0] * 0.35);
});
test("the new sculpt changes the skyline, while preserving the walk-height rock envelope", async () => {
  const mesh = (await load("karsts-high.glb")).scene.getObjectByName(
    "tonsai-divider-high",
  );
  const p = mesh.geometry.attributes.position;
  let peak = -Infinity,
    checked = 0,
    maxDeviation = 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    peak = Math.max(peak, y);
    if (y > 0 && y < 7.5 && i % 3 === 0) {
      maxDeviation = Math.max(maxDeviation, Math.abs(karstDistance(x, y, z)));
      checked++;
    }
  }
  assert.ok(peak > 180 && peak < 200);
  assert.ok(checked > 40);
  assert.ok(maxDeviation < 4, `low-envelope mismatch ${maxDeviation}m`);
  assert.ok(mesh.geometry.index.count / 3 <= 62_100);
});
test("cliff gardens root on upward-facing triangles of the actual high mesh", async () => {
  const anchors = JSON.parse(read("hero-anchors.json"));
  assert.ok(anchors.length > 500);
  const mesh = (await load("karsts-high.glb")).scene.getObjectByName(
    "tonsai-divider-high",
  );
  mesh.updateMatrixWorld(true);
  mesh.material.side = T.DoubleSide;
  for (let i = 0; i < anchors.length; i += 23) {
    const a = anchors[i];
    assert.ok(a.normal[1] >= 0.42);
    const n = new T.Vector3(...a.normal).normalize(),
      p = new T.Vector3(a.x, a.y + 0.12, a.z);
    const ray = new T.Raycaster(
      p.clone().addScaledVector(n, 2),
      n.clone().negate(),
      0,
      4,
    );
    const hit = ray.intersectObject(mesh, false)[0];
    assert.ok(
      hit && Math.abs(hit.distance - 2) < 0.08,
      `unanchored garden ${i}`,
    );
  }
});
test("Limestone Cove is an actual walkable part of Tonsai with free beach traversal", () => {
  const p = { x: -670, z: -820 };
  assert.ok(walkable(p.x, p.z));
  assert.ok(Math.abs(heightAt(p.x, p.z) + 1.7 - 3.063333344) < 0.01);
  let q = { ...p };
  for (let i = 0; i < 80; i++) q = moveOnTerrain(q, 0.15, -0.1);
  assert.ok(Math.hypot(q.x - p.x, q.z - p.z) > 9);
});
test("new coastal understory is deterministic, path-safe, rooted and quality-stable", () => {
  const hi = heroUnderstory(false),
    lo = heroUnderstory(true);
  assert.deepEqual(hi, heroUnderstory(false));
  assert.ok(hi.length > 100);
  const keys = new Set(hi.map((p) => `${p.x},${p.z}`));
  assert.ok(lo.length < hi.length);
  for (const p of lo) assert.ok(keys.has(`${p.x},${p.z}`));
  for (const p of hi) {
    assert.ok(trailDistance(p.x, p.z) >= 5);
    assert.ok(Math.abs(p.y - heightAt(p.x, p.z)) < 0.001);
  }
});
test("botanical assets contain genuinely different silhouettes and lighter distant meshes", async () => {
  const kit = (await load("botanical.glb")).scene;
  for (const kind of ["canopy", "ficus", "palm"]) {
    const near = kit.getObjectByName(`${kind}-0-near-leaves`).geometry;
    const far = kit.getObjectByName(`${kind}-0-far-leaves`).geometry;
    const other = kit.getObjectByName(`${kind}-1-near-leaves`).geometry;
    assert.ok(far.index.count < near.index.count * 0.65);
    assert.notDeepEqual(
      near.attributes.position.array,
      other.attributes.position.array,
    );
    assert.ok(near.attributes.position.array.every(Number.isFinite));
    assert.ok(near.attributes.normal.array.every(Number.isFinite));
  }
});
