import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { southernCliffGeometry } from "../src/game/environment/limestone.ts";
import { isWalkable, groundHeight } from "../src/game/world.ts";
const load = async (name) => {
  const b = readFileSync(
    new URL("../src/assets/camp/" + name, import.meta.url),
  );
  const gltf = await new Promise((r, j) =>
    new GLTFLoader().parse(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      "",
      r,
      j,
    ),
  );
  gltf.scene.updateMatrixWorld(true);
  return gltf.scene;
};
const kits = await Promise.all([
  load("landmarks-low.glb"),
  load("landmarks.glb"),
]);
const meshes = kits.map((k, i) => {
  const m = k.getObjectByName("southern-cliff-rock-" + (i ? "near" : "far"));
  m.material.side = T.DoubleSide;
  return m;
});
test("shipped cliff contains scan-derived relief within the fixed LOD budgets", () => {
  for (const [i, m] of meshes.entries()) {
    assert.ok(m.geometry.index.count / 3 < 15000);
    assert.ok([...m.geometry.attributes.position.array].every(Number.isFinite));
    const raw = new T.Mesh(
      southernCliffGeometry(!i),
      new T.MeshBasicMaterial({ side: T.DoubleSide }),
    );
    raw.updateMatrixWorld();
    let changed = 0,
      max = 0;
    for (const z of [108, 112, 116, 120, 124, 128])
      for (const y of [20, 26, 32]) {
        const ray = new T.Raycaster(
          new T.Vector3(-85, y, z),
          new T.Vector3(1, 0, 0),
        );
        const a = ray.intersectObject(raw)[0],
          b = ray.intersectObject(m)[0];
        assert.ok(a && b, "exported relief retains west-wall coverage");
        const d = a.point.distanceTo(b.point);
        if (d > 0.04) changed++;
        max = Math.max(max, d);
      }
    assert.ok(changed >= 6, "relief must be present in the shipped GLB");
    assert.ok(
      max < 2.5,
      "bounded displacement protects silhouette/LOD budgets",
    );
  }
});
test("actual exported near/far walls preserve coverage and stay within the existing LOD tolerance", () => {
  let maxDeviation = 0;
  for (const z of [106, 110, 114, 118, 122, 126, 130])
    for (const y of [8, 14, 23, 31]) {
      const ray = new T.Raycaster(
        new T.Vector3(-85, y, z),
        new T.Vector3(1, 0, 0),
      );
      const [far, near] = meshes.map((m) => ray.intersectObject(m)[0]);
      assert.equal(!!far, !!near, `exported LOD coverage ${y},${z}`);
      if (far && near)
        maxDeviation = Math.max(maxDeviation, far.point.distanceTo(near.point));
    }
  assert.ok(maxDeviation < 1.6, `exported LOD deviation ${maxDeviation} m`);
});
test("actual exported near/far rock leaves all reachable southern body samples clear of intersections", () => {
  let count = 0;
  for (let x = -49; x <= 62; x++)
    for (let z = 80; z <= 125; z++) {
      if (!isWalkable(x, z)) continue;
      count++;
      const ray = new T.Raycaster(
        new T.Vector3(x, groundHeight(x, z) + 0.15, z),
        new T.Vector3(0, 1, 0),
        0,
        1.6,
      );
      for (const [i, m] of meshes.entries())
        assert.ok(
          !ray.intersectObject(m)[0],
          `exported body intersection ${x},${z}`,
        );
    }
  assert.equal(count, 2299, "only the 12 cave-wall body-envelope samples are removed");
});
