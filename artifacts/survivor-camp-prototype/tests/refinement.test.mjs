import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as T from "three";
import { CampNavigation, clearSegment } from "../src/game/navigation.ts";
import {
  HIDING_CANDIDATES,
  createHidingCandidates,
} from "../src/game/environment/hidingSpots.ts";
import {
  NATURAL_LANDMARKS,
  SPRING,
  FEATURE_SOLIDS,
} from "../src/game/environment/geography.ts";
import {
  SPAWN,
  baseHeight,
  isWalkable,
  colliderContains,
  movePlayer,
} from "../src/game/world.ts";
const root = new URL("../", import.meta.url),
  asset = new URL("src/assets/camp/", root);
function kit(filename) {
  const b = readFileSync(new URL(filename, asset)),
    len = b.readUInt32LE(12),
    j = JSON.parse(b.subarray(20, 20 + len)),
    binary = b.subarray(28 + len),
    material = new T.MeshBasicMaterial({ side: T.DoubleSide });
  const attribute = (id) => {
    const a = j.accessors[id],
      v = j.bufferViews[a.bufferView],
      size = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type],
      C =
        a.componentType === 5126
          ? Float32Array
          : a.componentType === 5123
            ? Uint16Array
            : Uint32Array,
      start = (v.byteOffset || 0) + (a.byteOffset || 0),
      bytes = binary.subarray(
        start,
        start + a.count * size * C.BYTES_PER_ELEMENT,
      );
    return new T.BufferAttribute(
      new C(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
      ),
      size,
    );
  };
  return j.nodes.map((node) => {
    const p = j.meshes[node.mesh].primitives[0],
      g = new T.BufferGeometry();
    g.setAttribute("position", attribute(p.attributes.POSITION));
    g.setAttribute("normal", attribute(p.attributes.NORMAL));
    g.setIndex(attribute(p.indices));
    const m = new T.Mesh(g, material);
    m.name = node.name;
    const l =
      NATURAL_LANDMARKS.find((l) => l.id === node.extras.site) ??
      (node.extras.site === "spring-seep" ? SPRING : null);
    if (l) m.position.set(l.x, baseHeight(l.x, l.z), l.z);
    m.updateMatrixWorld();
    return m;
  });
}
const meshes = kit("landmarks.glb"),
  byName = new Map(meshes.map((m) => [m.name, m]));
test("offline kit hashes, mobile-only payload, and editable model source remain synchronized", () => {
  for (const [file, manifestFile, maxBytes] of [
    ["landmarks.glb", "landmark-manifest.json", 4_000_000],
    ["landmarks-low.glb", "landmark-low-manifest.json", 1_500_000],
  ]) {
    const b = readFileSync(new URL(file, asset)),
      m = JSON.parse(readFileSync(new URL(manifestFile, asset)));
    assert.equal(createHash("sha256").update(b).digest("hex"), m.sha256);
    assert.ok(b.length < maxBytes);
    for (const [file, hash] of Object.entries(m.sourceSha256))
      assert.equal(
        createHash("sha256")
          .update(readFileSync(new URL("../../" + file, root)))
          .digest("hex"),
        hash,
        file,
      );
    assert.ok(m.meshes.every((x) => x.triangles < 15_000));
    if (file.includes("low")) assert.ok(m.meshes.every((x) => x.lod === "far"));
  }
});
test("baked graph matches independently reconstructed body-valid edges and costs exactly", () => {
  const baked = new CampNavigation(),
    cold = new CampNavigation(1, false);
  assert.equal(baked.nodes.length, cold.nodes.length);
  for (let i = 0; i < cold.nodes.length; i++) {
    const a = baked.nodes[i],
      b = cold.nodes[i];
    assert.deepEqual([a.x, a.z, a.trail], [b.x, b.z, b.trail]);
    assert.deepEqual(
      [...a.edges].sort((x, y) => x - y),
      [...b.edges].sort((x, y) => x - y),
    );
  }
  const manifest = JSON.parse(
    readFileSync(
      new URL("src/game/environment/navigation-manifest.json", root),
    ),
  );
  for (const [file, hash] of Object.entries(manifest.sources))
    assert.equal(
      createHash("sha256")
        .update(readFileSync(new URL(file, root)))
        .digest("hex"),
      hash,
      file + " needs navigation rebake",
    );
});
test("39 stable future candidates have real mesh anchors, independent reachable approaches and unburied positions", () => {
  const nav = new CampNavigation();
  assert.deepEqual(
    HIDING_CANDIDATES.map((c) => c.id),
    createHidingCandidates(false).map((c) => c.id),
  );
  for (const c of HIDING_CANDIDATES) {
    const a = c.interactionPosition,
      p = c.position,
      s = c.surfaceAnchor;
    assert.ok(s, c.id);
    assert.ok(isWalkable(a.x, a.z), c.id);
    const route = nav.route(SPAWN, a);
    assert.ok(route, c.id);
    assert.ok(
      route.every((p, i) => clearSegment(i ? route[i - 1] : SPAWN, p)),
      c.id,
    );
    assert.ok(
      Math.hypot(p.x - a.x, p.z - a.z) <= c.collision.inspectRadius,
      c.id,
    );
    assert.ok(p.y >= baseHeight(p.x, p.z), c.id);
    const mesh = byName.get(s.mesh);
    assert.ok(mesh, s.mesh);
    // Probe toward the independently recorded physical surface, not toward the marker.
    const surface = new T.Vector3(s.x, s.y, s.z),
      position = new T.Vector3(p.x, p.y, p.z),
      dir = surface.clone().sub(position).normalize(),
      ray = new T.Raycaster(
        position.clone().addScaledVector(dir, -0.04),
        dir,
        0,
        0.22,
      ),
      hit = ray.intersectObject(mesh)[0];
    assert.ok(hit && hit.point.distanceTo(surface) < 0.07, c.id);
    const far = byName.get(s.mesh.replace("-near", "-far")),
      farHit =
        far &&
        new T.Raycaster(
          position.clone().addScaledVector(dir, -0.25),
          dir,
          0,
          0.65,
        ).intersectObject(far)[0];
    assert.ok(farHit, c.id + " far surface");
  }
});
test("new rock passages use scan footprints and release original invisible corners", () => {
  const rocks = FEATURE_SOLIDS.filter((c) =>
    /moss-gates|strangler-stone|quiet-alcove/.test(c.kind),
  );
  assert.equal(rocks.length, 8);
  assert.ok(rocks.every((c) => c.polygon?.length >= 8));
  let released = 0;
  for (const c of rocks)
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        if (
          !colliderContains(
            c,
            c.x + sx * (c.hx - 0.05),
            c.z + sz * (c.hz - 0.05),
            0,
          )
        )
          released++;
  assert.ok(released > 20);
  for (const target of [
    { x: 16, z: 61 },
    { x: 16, z: 65 },
    { x: 16, z: 68 },
  ])
    assert.ok(isWalkable(target.x, target.z));
  const nav = new CampNavigation();
  for (const target of [
    { x: 16, z: 65 },
    { x: 95, z: 65 },
    { x: 30, z: 91 },
  ]) {
    let p = { ...SPAWN };
    for (const b of nav.route(p, target)) {
      const a = { ...p },
        n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.08);
      for (let i = 1; i <= n; i++) {
        const t = {
          x: a.x + ((b.x - a.x) * i) / n,
          z: a.z + ((b.z - a.z) * i) / n,
        };
        p = movePlayer(p, t.x - p.x, t.z - p.z);
        assert.ok(Math.hypot(p.x - t.x, p.z - t.z) < 0.002);
      }
    }
  }
});
test("wood lofts have outward normals, open log ends and a genuine stump cavity", () => {
  const trunk = byName.get("ancient-fig-wood-near"),
    ray = new T.Raycaster(
      new T.Vector3(43, baseHeight(43, 5) + 8, 0),
      new T.Vector3(0, 0, 1),
    );
  const hit = ray.intersectObject(trunk)[0];
  assert.ok(hit);
  assert.ok(hit.face.normal.dot(new T.Vector3(0, 0, -1)) > 0);
  for (const lod of ["near", "far"]) {
    const log = byName.get("fallen-giant-wood-" + lod),
      y = baseHeight(63, 56) + 1;
    const r = new T.Raycaster(
      new T.Vector3(68, y, 56),
      new T.Vector3(-1, 0, 0),
      0,
      1.3,
    );
    assert.equal(r.intersectObject(log).length, 0, "log end must be open");
    const stump = byName.get("hollow-stump-wood-" + lod),
      s = new T.Raycaster(
        new T.Vector3(31, baseHeight(31, -7) + 3.5, -7),
        new T.Vector3(0, -1, 0),
        0,
        2,
      );
    assert.equal(
      s.intersectObject(stump).length,
      0,
      "stump must have a hollow centre",
    );
  }
});
