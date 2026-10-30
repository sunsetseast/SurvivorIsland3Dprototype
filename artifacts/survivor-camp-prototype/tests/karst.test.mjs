import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { southernCliffGeometry } from "../src/game/environment/limestone.ts";
import { groundHeight, isWalkable } from "../src/game/world.ts";
const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
const meshes = [true, false].map((low) => {
  const mesh = new T.Mesh(southernCliffGeometry(low), material);
  mesh.updateMatrixWorld();
  return mesh;
});
const hit = (mesh, x, y, z, dx, dy, dz, far = 200) =>
  new T.Raycaster(
    new T.Vector3(x, y, z),
    new T.Vector3(dx, dy, dz),
    0,
    far,
  ).intersectObject(mesh)[0];
test("western cliff has genuine cross-sectional relief, submerged feet and outward normals in both LODs", () => {
  for (const mesh of meshes) {
    const xs = [];
    for (const z of [107, 111, 115, 119, 123, 127])
      for (const y of [10, 17, 25]) {
        const h = hit(mesh, -85, y, z, 1, 0, 0);
        assert.ok(h, `missing western cliff ${y},${z}`);
        assert.ok(h.face.normal.x < -0.2, `inward side normal ${y},${z}`);
        xs.push(h.point.x);
      }
    assert.ok(
      Math.max(...xs) - Math.min(...xs) > 5,
      "a planar end cap must fail",
    );
    const positions = mesh.geometry.attributes.position;
    let submerged = 0;
    for (let i = 0; i < positions.count; i++)
      if (positions.getX(i) < -39 && positions.getY(i) < -2) submerged++;
    assert.ok(submerged > 10, "western surface extends below the sea");
    for (const x of [-25, -5, 22]) {
      const h = hit(mesh, x, 110, 115, 0, -1, 0);
      assert.ok(h && h.face.normal.y > 0.5, `crown must face the sky ${x}`);
    }
  }
});
test("near and far silhouettes agree without flattening the eroded side", () => {
  let max = 0;
  for (const z of [106, 110, 114, 118, 122, 126, 130])
    for (const y of [8, 14, 23, 31]) {
      const a = hit(meshes[0], -85, y, z, 1, 0, 0),
        b = hit(meshes[1], -85, y, z, 1, 0, 0);
      assert.equal(!!a, !!b, `LOD outline hole ${y},${z}`);
      if (a && b) max = Math.max(max, a.point.distanceTo(b.point));
    }
  assert.ok(max < 1.6, `max LOD surface deviation ${max} m`);
});
test("reconstructed rock adds no body penetration across the entire southern and inland-edge walkable grid", () => {
  // Independently measured from the committed pre-reconstruction GLB. The cave
  // cheek at x=7 predates this work; reachable cave-centre routes remain tested.
  const existingCheek = new Set(
    [96, 97, 98, 99, 100, 101].map((z) => "7," + z),
  );
  let checked = 0;
  for (let x = -49; x <= 62; x += 1)
    for (let z = 80; z <= 125; z += 1) {
      if (!isWalkable(x, z)) continue;
      for (const mesh of meshes) {
        const y = groundHeight(x, z);
        const intersects = !!hit(mesh, x, y + 0.15, z, 0, 1, 0, 1.6);
        assert.ok(
          !intersects || existingCheek.has(x + "," + z),
          `new body penetration ${x},${z}`,
        );
      }
      checked++;
    }
  assert.ok(checked > 2000);
  console.log("Southern body-clearance grid samples", checked);
});
