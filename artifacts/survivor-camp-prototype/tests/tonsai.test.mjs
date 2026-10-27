import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  COAST,
  TRAILS,
  ZONES,
  inside,
  trailDistance,
  edgeDistance,
} from "../src/game/railay/geography.ts";
import {
  heightAt,
  moveOnTerrain,
  walkable,
} from "../src/game/railay/terrain.ts";
import {
  TONSAI_KARSTS,
  cliffFootDistance,
} from "../src/game/railay/tonsai/domain.ts";
import {
  tonsaiPlants,
  tropicalGeometry,
  SPECIES,
} from "../src/game/railay/tonsai/tropical.ts";
import {
  coastalDebris,
  coastalBlocked,
} from "../src/game/railay/tonsai/coastal.ts";
import { karstDistance } from "../src/game/railay/tonsai/karstField.ts";
const dir = new URL("../src/assets/tonsai/", import.meta.url);
test("Tonsai uses the unchanged original world coastline and existing massif footprints", () => {
  assert.ok(COAST.length > 600);
  const source = JSON.parse(
    readFileSync(
      new URL("../../../tools/tonsai/footprints.json", import.meta.url),
    ),
  );
  assert.deepEqual(TONSAI_KARSTS, source);
  assert.ok(inside(ZONES[0].spawn.x, ZONES[0].spawn.z, COAST));
  assert.ok(ZONES[0].spawn.z < ZONES[1].spawn.z);
  assert.equal(TONSAI_KARSTS.length, 2);
});
test("Blender main formations are valid, bounded and independently optimized for low quality", async () => {
  const b = readFileSync(new URL("karsts.glb", dir)),
    manifest = JSON.parse(readFileSync(new URL("karsts.json", dir)));
  assert.equal(b.readUInt32LE(8), b.length);
  assert.equal(b.toString("utf8", 0, 4), "glTF");
  assert.equal(createHash("sha256").update(b).digest("hex"), manifest.sha256);
  assert.ok(b.length < 8_000_000);
  const gltf = await new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
  for (const k of TONSAI_KARSTS) {
    const hi = gltf.scene.getObjectByName(k.id + "-high"),
      lo = gltf.scene.getObjectByName(k.id + "-low");
    assert.ok(hi?.isMesh && lo?.isMesh);
    assert.ok(lo.geometry.index.count < hi.geometry.index.count * 0.4);
    assert.ok(
      hi.geometry.getAttribute("position").array.every(Number.isFinite),
    );
    hi.geometry.computeBoundingBox();
    const size = hi.geometry.boundingBox.getSize(new T.Vector3());
    assert.ok(size.y > 100 && size.x > 200);
    const positions = hi.geometry.getAttribute("position");
    let maximumFieldDeviation = 0;
    for (let i = 0; i < positions.count; i += 173) {
      maximumFieldDeviation = Math.max(
        maximumFieldDeviation,
        Math.abs(
          karstDistance(
            positions.getX(i),
            positions.getY(i),
            positions.getZ(i),
          ),
        ),
      );
    }
    assert.ok(
      maximumFieldDeviation < 3.8,
      `mesh / analytic collision mismatch: ${maximumFieldDeviation}m`,
    );
  }
});
test("network fallback contains the new volumetric silhouettes, without ring-wall generation", () => {
  const fallback = JSON.parse(readFileSync(new URL("fallback.json", dir)));
  assert.equal(fallback.length, 2);
  for (const g of fallback) {
    assert.ok(g.position.every(Number.isFinite));
    assert.ok(g.index.length / 3 < 3000);
    assert.ok(g.index.every((i) => i < g.position.length / 3));
  }
});
test("forest candidates are deterministic, use multiple real mesh variants, and low quality is a stable subset", () => {
  const hi = tonsaiPlants(false),
    lo = tonsaiPlants(true);
  assert.deepEqual(hi, tonsaiPlants(false));
  assert.ok(lo.length < hi.length * 0.8);
  const keys = new Set(hi.map((p) => `${p.x},${p.z}`));
  assert.ok(lo.every((p) => keys.has(`${p.x},${p.z}`)));
  for (const kind of SPECIES)
    assert.ok(
      new Set(hi.filter((p) => p.kind === kind).map((p) => p.variant)).size >=
        2,
      kind,
    );
  for (const p of hi) {
    assert.ok(
      trailDistance(p.x, p.z) >=
        (p.kind === "fern" || p.kind === "aroid" || p.kind === "litter"
          ? 2.8
          : 5),
    );
    assert.ok(Math.abs(p.y - heightAt(p.x, p.z)) < 0.001);
  }
  for (const kind of ["canopy", "palm", "ficus"]) {
    const a = tropicalGeometry(kind, 0, true),
      b = tropicalGeometry(kind, 1, true),
      far = tropicalGeometry(kind, 0, false);
    assert.notDeepEqual(
      a.leaves.getAttribute("position").array,
      b.leaves.getAttribute("position").array,
    );
    assert.ok(
      far.leaves.getAttribute("position").count <
        a.leaves.getAttribute("position").count,
    );
    for (const k of [a, b, far]) {
      assert.ok(k.leaves.getAttribute("position").array.every(Number.isFinite));
      k.wood?.dispose();
      k.leaves.dispose();
    }
  }
});
test("spawn and direct beach movement stay outside rocks and above the water", () => {
  const s = ZONES[0].spawn;
  assert.ok(walkable(s.x, s.z));
  assert.ok(!coastalBlocked(s.x, s.z));
  let p = { ...s };
  for (let i = 0; i < 200; i++) p = moveOnTerrain(p, -0.12, 0.04);
  assert.ok(Math.hypot(p.x - s.x, p.z - s.z) > 10);
  assert.ok(heightAt(p.x, p.z) > 0.12);
  for (const r of coastalDebris()) {
    assert.ok(trailDistance(r.x, r.z) >= 5);
    assert.ok(cliffFootDistance(r.x, r.z) >= 3);
  }
});
test("the complete authored inland route remains traversable through the actual movement solver", () => {
  let p = { ...TRAILS[0][0] };
  for (const target of TRAILS[0].slice(1)) {
    for (let i = 0; i < 2500; i++) {
      const dx = target.x - p.x,
        dz = target.z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 0.25) break;
      p = moveOnTerrain(p, (dx / d) * 0.24, (dz / d) * 0.24);
    }
    assert.ok(
      Math.hypot(p.x - target.x, p.z - target.z) < 0.5,
      `route blocked near ${JSON.stringify(target)}; stopped ${JSON.stringify(p)}`,
    );
  }
});
test("low-height collision follows the actual sculpt field, without remote cliff barriers", () => {
  let checked = 0;
  for (const k of TONSAI_KARSTS)
    for (let i = 0; i < k.outline.length; i++) {
      const a = k.outline[i],
        b = k.outline[(i + 1) % k.outline.length];
      const dx = b.x - a.x,
        dz = b.z - a.z,
        len = Math.hypot(dx, dz),
        mx = (a.x + b.x) / 2,
        mz = (a.z + b.z) / 2;
      for (const sign of [-1, 1]) {
        const x = mx + ((sign * -dz) / len) * 12,
          z = mz + ((sign * dx) / len) * 12;
        if (inside(x, z, k.outline)) continue;
        assert.ok(karstDistance(x, 2, z) > 7);
        checked++;
      }
    }
  assert.ok(checked > 10);
});
