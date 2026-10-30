import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as T from "three";
import { FOREST_UNDERSTORY } from "../src/game/environment/forest.ts";
import { HIDING_CANDIDATES } from "../src/game/environment/hidingSpots.ts";
import { pathDistance, SHELTER, isWalkable } from "../src/game/world.ts";
const dir = new URL("../src/assets/camp/", import.meta.url);
function readKit(name) {
  const b = readFileSync(new URL(name, dir)),
    n = b.readUInt32LE(12),
    j = JSON.parse(b.subarray(20, 20 + n)),
    bin = b.subarray(28 + n);
  const attr = (id) => {
    const a = j.accessors[id],
      v = j.bufferViews[a.bufferView],
      C = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[
        a.componentType
      ],
      size = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type],
      raw = bin.subarray(
        (v.byteOffset || 0) + (a.byteOffset || 0),
        (v.byteOffset || 0) +
          (a.byteOffset || 0) +
          a.count * size * C.BYTES_PER_ELEMENT,
      );
    return new T.BufferAttribute(
      new C(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)),
      size,
    );
  };
  const meshes = new Map(
    j.nodes.map((node) => {
      const p = j.meshes[node.mesh].primitives[0],
        g = new T.BufferGeometry();
      g.setAttribute("position", attr(p.attributes.POSITION));
      g.setIndex(attr(p.indices));
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ side: T.DoubleSide }));
      m.name = node.name;
      m.updateMatrixWorld();
      return [node.name, m];
    }),
  );
  return { b, j, meshes };
}
test("production kits are finite, bounded, independently hashed and low downloads no near meshes", () => {
  for (const [name, limit] of [
    ["reconstruction.glb", 5_500_000],
    ["reconstruction-low.glb", 3_500_000],
  ]) {
    const { b, j, meshes } = readKit(name),
      manifest = JSON.parse(
        readFileSync(new URL(name.replace(".glb", "-manifest.json"), dir)),
      );
    assert.equal(b.readUInt32LE(8), b.length);
    assert.ok(b.length < limit);
    assert.equal(createHash("sha256").update(b).digest("hex"), manifest.sha256);
    for (const m of meshes.values())
      assert.ok(
        [...m.geometry.attributes.position.array].every(Number.isFinite),
        m.name,
      );
    for (const im of j.images) {
      const v = j.bufferViews[im.bufferView],
        n = b.readUInt32LE(12),
        png = b.subarray(
          28 + n + v.byteOffset,
          28 + n + v.byteOffset + v.byteLength,
        );
      assert.equal(
        png.subarray(-8, -4).toString(),
        "IEND",
        name + " embedded PNG complete",
      );
    }
    if (name.includes("low"))
      assert.ok(j.nodes.every((n) => !n.name.endsWith("-near")));
  }
});
test("both shelter LODs cover the communal deck above standing head height and retain its navigation surface", () => {
  for (const name of ["reconstruction.glb", "reconstruction-low.glb"]) {
    const { meshes } = readKit(name),
      roof = meshes.get("shelter-thatch"),
      deck = meshes.get("shelter-deck");
    assert.ok(
      meshes.get("shelter-lashings").geometry.index.count > 0,
      `${name} retains visible rope geometry at the shelter joints`,
    );
    for (const x of [8, 12, 15])
      for (const z of [-47, -44, -41]) {
        assert.ok(isWalkable(x, z));
        const hit = new T.Raycaster(
          new T.Vector3(x, SHELTER.deck.y + 1.7, z),
          new T.Vector3(0, 1, 0),
          0,
          6,
        ).intersectObject(roof)[0];
        assert.ok(
          hit && hit.point.y > SHELTER.deck.y + 1.72,
          `${name} roof clearance ${x},${z}`,
        );
        // A foot spans the small intended gaps between uneven round bamboo slats.
        const floor = [-0.07, 0, 0.07]
          .flatMap((dx) =>
            new T.Raycaster(
              new T.Vector3(x + dx, 2.5, z),
              new T.Vector3(0, -1, 0),
              0,
              1,
            ).intersectObject(deck),
          )
          .sort((a, b) => b.point.y - a.point.y)[0];
        assert.ok(
          floor && Math.abs(floor.point.y - SHELTER.deck.y) < 0.09,
          `${name} deck ${x},${z}`,
        );
      }
  }
});
test("understory inhabits five habitats while protecting every trail and hiding approach", () => {
  assert.ok(FOREST_UNDERSTORY.length > 1000);
  assert.deepEqual(
    new Set(FOREST_UNDERSTORY.map((p) => p.zone)),
    new Set(["coastal", "camp-edge", "interior", "limestone", "freshwater"]),
  );
  for (const p of FOREST_UNDERSTORY) {
    assert.ok(isWalkable(p.x, p.z));
    assert.ok(pathDistance(p.x, p.z) >= 2.15);
    assert.ok(
      HIDING_CANDIDATES.every(
        (c) =>
          Math.hypot(
            p.x - c.interactionPosition.x,
            p.z - c.interactionPosition.z,
          ) >= 1.6,
      ),
    );
  }
});
