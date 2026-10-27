import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { VOTING } from "../src/game/tribal/votingAnchors.ts";
import {
  votingZone,
  followYaw,
  angleDelta,
  movementVector,
  ease,
} from "../src/game/cameraController.ts";
import { tribalInteractions } from "../src/game/tribal/interactions.ts";
import {
  VOTING_PATH,
  moveTribal,
  tribalBlocked,
  SOLIDS,
} from "../src/game/tribal/layout.ts";
import { input, clearInput } from "../src/game/state.ts";

test("front route crosses frontage opening and reaches writing mark; east side is closed", () => {
  const route = VOTING_PATH.slice(4);
  let p = route[0];
  for (const target of route.slice(1)) {
    const n = Math.ceil(Math.hypot(target.x - p.x, target.z - p.z) / 0.08),
      dx = (target.x - p.x) / n,
      dz = (target.z - p.z) / n;
    for (let i = 0; i < n; i++) p = moveTribal(p, dx, dz);
    assert.ok(Math.hypot(p.x - target.x, p.z - target.z) < 0.02);
  }
  assert.equal(tribalBlocked(-30.7, 17.5), true);
  assert.equal(tribalBlocked(VOTING.entrance.x, VOTING.entrance.z), false);
  assert.ok(route.some((p) => p.z > VOTING.entrance.z));
  assert.ok(SOLIDS.find((s) => s.id === "writing-table").height < 1.5);
});
test("portrait requires table side, facing and inner threshold; exit has hysteresis", () => {
  const w = VOTING.writing;
  assert.equal(votingZone(w.x, w.z, Math.PI, false, w), true);
  for (const [x, z, f] of [
    [w.x, w.z, 0],
    [w.x, 15.8, Math.PI],
    [w.x + 1, w.z, Math.PI],
    [w.x, w.z + 1.5, Math.PI],
  ])
    assert.equal(votingZone(x, z, f, false, w), false);
  assert.equal(votingZone(w.x, w.z + 1.2, 0, true, w), true);
  assert.equal(votingZone(w.x, w.z + 1.6, Math.PI, true, w), false);
  for (const hz of [20, 30, 60, 120]) {
    let b = 0;
    for (let i = 0; i < hz * 0.4; i++) b += (1 - b) * ease(1 / hz, 5.5);
    assert.ok(b > 0.88 && b < 0.9);
    for (let i = 0; i < hz; i++) b += (0 - b) * ease(1 / hz, 5.5);
    assert.ok(b < 0.004);
  }
});
test("manual/stationary inspection retains yaw; moving follow takes shortest turn behind heading", () => {
  assert.equal(followYaw(1, 0, true, true, 0, 0.1), 1);
  assert.equal(followYaw(1, 0, true, false, 0.5, 0.1), 1);
  assert.equal(followYaw(1, 0, false, false, 0, 0.1), 1);
  let yaw = -Math.PI + 0.05;
  for (let i = 0; i < 120; i++) yaw = followYaw(yaw, 0, true, false, 0, 1 / 60);
  assert.ok(Math.abs(angleDelta(Math.PI, yaw)) < 0.001);
  const back = movementVector(0, -1, 0);
  assert.ok(back.z > 0 && Math.abs(back.x) < 1e-8);
  const diag = movementVector(1, 1, Math.PI / 2);
  assert.ok(diag.x < -0.99 && diag.z < -0.99);
});
test("practice ballot folds/deposits once, refuses duplicates; cancel releases portrait", () => {
  tribalInteractions.reset();
  tribalInteractions.deposit();
  assert.equal(tribalInteractions.getSnapshot().deposited, false);
  tribalInteractions.open("ballot");
  tribalInteractions.fold("Sandra");
  tribalInteractions.fold("Rob");
  assert.equal(tribalInteractions.getSnapshot().ballot, "Sandra");
  tribalInteractions.deposit();
  const s = tribalInteractions.getSnapshot();
  tribalInteractions.deposit();
  assert.equal(tribalInteractions.getSnapshot(), s);
  tribalInteractions.close();
  assert.equal(tribalInteractions.cameraSuppressed, true);
  tribalInteractions.reset();
});
test("focus/scene release clears movement, run and camera without relying on keyup", () => {
  Object.assign(input, {
    joyX: 1,
    joyY: 1,
    run: true,
    looking: true,
    lookGrace: 1,
  });
  const epoch = input.epoch;
  clearInput();
  assert.deepEqual(
    [input.joyX, input.joyY, input.run, input.looking, input.lookGrace],
    [0, 0, false, false, 0],
  );
  assert.equal(input.epoch, epoch + 1);
});
test("real Blender close-up assets have finite meshes, compatible mouth and bounded cost", () => {
  const base = new URL("../src/assets/sanctuary/", import.meta.url),
    bytes = readFileSync(new URL("voting-props.glb", base));
  const m = JSON.parse(readFileSync(new URL("voting-props.json", base)));
  assert.equal(
    createHash("sha256")
      .update(
        readFileSync(
          new URL("../../../tools/blender/voting_props.py", import.meta.url),
        ),
      )
      .digest("hex"),
    m.generatorSha256,
  );
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), m.sha256);
  const len = bytes.readUInt32LE(12),
    g = JSON.parse(bytes.subarray(20, 20 + len)),
    bin = bytes.subarray(28 + len);
  assert.match(g.asset.generator, /Blender/);
  assert.equal(g.materials.length, 1);
  assert.equal(g.images.length, 1);
  assert.deepEqual(
    new Set(g.nodes.filter((n) => n.mesh !== undefined).map((n) => n.name)),
    new Set(["voting_urn", "voting_pen", "shot_dark_bag", "parchment"]),
  );
  let tris = 0;
  for (const mesh of g.meshes)
    for (const p of mesh.primitives) {
      tris += g.accessors[p.indices].count / 3;
      const uv = g.accessors[p.attributes.TEXCOORD_0];
      const bv = g.bufferViews[uv.bufferView];
      for (let i = 0; i < uv.count; i++)
        for (let k = 0; k < 2; k++) {
          const u = bin.readFloatLE(
            (bv.byteOffset || 0) +
              (uv.byteOffset || 0) +
              i * (bv.byteStride || 8) +
              k * 4,
          );
          assert.ok(u > 0.01 && u < 0.99, "padded atlas coordinates");
        }
      for (const key of ["NORMAL", "TEXCOORD_0", "COLOR_0"])
        assert.notEqual(p.attributes[key], undefined);
      for (const id of Object.values(p.attributes)) {
        const a = g.accessors[id],
          v = g.bufferViews[a.bufferView],
          c = { VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
        if (a.componentType === 5126)
          for (let i = 0; i < a.count; i++)
            for (let k = 0; k < c; k++)
              assert.ok(
                Number.isFinite(
                  bin.readFloatLE(
                    (v.byteOffset || 0) +
                      (a.byteOffset || 0) +
                      i * (v.byteStride || c * 4) +
                      k * 4,
                  ),
                ),
              );
      }
    }
  assert.ok(tris < 20000);
  assert.ok(bytes.length < 2e6);
  assert.ok(
    Math.hypot(m.foldedBallotSize[0], m.foldedBallotSize[2]) <
      m.urnOpeningDiameter,
  );
  assert.equal(VOTING.urn.y, VOTING.table.y);
  assert.equal(VOTING.bag.y, VOTING.table.y);
});
