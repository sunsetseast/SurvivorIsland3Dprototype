import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as T from "three";
import { CampNavigation, clearSegment } from "../src/game/navigation.ts";
import { SPOTS } from "../src/game/CampRuntime.ts";
import {
  SPAWN,
  BROADLEAF,
  COLLIDERS,
  isWalkable,
  groundHeight,
} from "../src/game/world.ts";
import {
  CLIFF_MASSES,
  PRIVATE_SPACES,
  BACKDROP_TREES,
} from "../src/game/environment/composition.ts";
import { CONNECTIONS } from "../src/game/locations/registry.ts";
const assets = new URL("../src/assets/camp/", import.meta.url);
function glb(file) {
  const b = readFileSync(new URL(file, assets));
  const n = b.readUInt32LE(12);
  assert.equal(b.readUInt32LE(0), 0x46546c67);
  assert.equal(b.readUInt32LE(8), b.length);
  return { j: JSON.parse(b.subarray(20, 20 + n)), data: b.subarray(28 + n) };
}
test("optimized CC0 binary assets match provenance hashes and enforce a reusable mobile budget", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("transfer-manifest.json", assets)),
  );
  for (const m of manifest) {
    const b = readFileSync(new URL(m.file, assets));
    assert.equal(createHash("sha256").update(b).digest("hex"), m.sha256);
    assert.ok(b.length < 3_500_000);
    const { j, data } = glb(m.file);
    let tri = 0;
    for (const mesh of j.meshes)
      for (const p of mesh.primitives) {
        tri += j.accessors[p.indices].count / 3;
        for (const k of ["POSITION", "NORMAL"]) {
          const a = j.accessors[p.attributes[k]],
            v = j.bufferViews[a.bufferView];
          for (let i = 0; i < a.count * 3; i++)
            assert.ok(
              Number.isFinite(
                data.readFloatLE(
                  (v.byteOffset || 0) + (a.byteOffset || 0) + i * 4,
                ),
              ),
            );
        }
      }
    assert.ok(tri < 35_000, `${m.file}: ${tri} triangles in complete LOD kit`);
  }
  const provenance = JSON.parse(
    readFileSync(new URL("provenance.json", assets)),
  );
  assert.equal(provenance.length, 4);
  for (const p of provenance) {
    assert.equal(p.license, "CC0-1.0");
    assert.ok(Object.keys(p.authors).length);
    assert.match(p.source, /^https:\/\/polyhaven.com\/a\//);
  }
});
test("solid cliff scan has three-dimensional mass; tree roots are centered at collision origins", () => {
  const rock = glb("limestone.glb").j;
  const p = rock.meshes[0].primitives[0],
    a = rock.accessors[p.attributes.POSITION];
  const d = a.max.map((v, i) => v - a.min[i]);
  assert.ok(Math.min(...d) > 0.9);
  assert.ok(Math.max(...d) < 2.1);
  const mass = new T.Box3(new T.Vector3(...a.min), new T.Vector3(...a.max));
  for (const p of CLIFF_MASSES.filter((p) => p.y < 2)) {
    const box = mass
      .clone()
      .applyMatrix4(
        new T.Matrix4().compose(
          new T.Vector3(p.x, p.y, p.z),
          new T.Quaternion().setFromEuler(new T.Euler(p.tilt, p.turn, 0)),
          new T.Vector3(p.s, p.s, p.s),
        ),
      );
    assert.ok(
      box.max.z <= -60 || box.min.x >= 34 || box.max.x <= -60,
      "Hero mass enters the playable footprint",
    );
  }
  const { j, data } = glb("coastal-tree.glb");
  for (const part of ["trunk", "branches", "leaves"])
    for (const level of ["near", "far"])
      assert.ok(
        j.nodes.find((n) => n.name === `coastal-${part}-${level}`),
        `Missing runtime part ${part}-${level}`,
      );
  const node = j.nodes.find((n) => n.name === "coastal-trunk-near");
  const q = j.meshes[node.mesh].primitives[0],
    pos = j.accessors[q.attributes.POSITION],
    v = j.bufferViews[pos.bufferView];
  const roots = [];
  for (let i = 0; i < pos.count; i++) {
    const o = (v.byteOffset || 0) + (pos.byteOffset || 0) + i * 12,
      xyz = [
        data.readFloatLE(o),
        data.readFloatLE(o + 4),
        data.readFloatLE(o + 8),
      ];
    if (xyz[1] < 0.16) roots.push(xyz);
  }
  for (const axis of [0, 2]) {
    const lo = Math.min(...roots.map((p) => p[axis])),
      hi = Math.max(...roots.map((p) => p[axis]));
    assert.ok(Math.abs((lo + hi) / 2) < 0.1);
    assert.ok(Math.max(Math.abs(lo), Math.abs(hi)) * 3.2 < 1.25);
  }
  assert.equal(
    COLLIDERS.filter((c) => c.kind === "tree").length,
    BROADLEAF.filter((p) => p.x > -63 && p.x < 37 && p.z > -63 && p.z < 37)
      .length,
  );
});
test("all simulation anchors, private strategy spaces, shelter ramp and departure remain physically connected", () => {
  const nav = new CampNavigation();
  const goals = [
    ...Object.values(SPOTS).flat(),
    ...PRIVATE_SPACES,
    CONNECTIONS.camp_to_trail.exit,
  ];
  for (const goal of goals) {
    assert.ok(isWalkable(goal.x, goal.z));
    const route = nav.route(SPAWN, goal);
    assert.ok(route, JSON.stringify(goal));
    let previous = SPAWN;
    for (const p of route) {
      assert.ok(clearSegment(previous, p));
      assert.ok(Number.isFinite(groundHeight(p.x, p.z)));
      previous = p;
    }
  }
  for (const p of BACKDROP_TREES) assert.ok(p.x > 39 || p.z < -63 || p.z > 40);
  // Hero masses stay outside activity space; no decorative collider crosses the exit.
  for (const p of CLIFF_MASSES) assert.ok(p.z < -70 || p.x > 50);
});
