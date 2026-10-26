import test from "node:test";
import assert from "node:assert/strict";
import { inspectGLB, validateKit } from "../../../tools/blender/validate.mjs";
import {
  sanctuaryPlacements,
  reclaimedStone,
} from "../src/game/tribal/assetPlacements.ts";
import { corridorClear, PATHS } from "../src/game/tribal/layout.ts";

test("actual Blender GLBs contain complete finite Y-up meshes, embedded PBR atlases, and a cheaper fallback", () => {
  const summary = validateKit();
  assert.equal(Object.keys(summary).length, 2);
  assert.throws(() => inspectGLB(Buffer.alloc(32)), /GLB magic/);
});
test("authored decorations reserve a conservative footprint around all ceremony routes", () => {
  for (const low of [true, false])
    for (const p of sanctuaryPlacements(low)) {
      assert.ok([p.x, p.y, p.z, p.yaw, p.scale].every(Number.isFinite));
      if (!p.elevated)
        assert.ok(corridorClear(p.x, p.z, p.radius), JSON.stringify(p));
    }
});
test("reclaimed ground exposes soil without removing stone from the ceremonial walking lanes", () => {
  let missing = 0,
    moss = 0;
  for (let x = -13; x < 14; x++)
    for (let z = -12; z < 10; z++) {
      const s = reclaimedStone(x, z);
      missing += Number(s.missing);
      moss += Number(s.moss);
    }
  assert.ok(missing > 40 && moss > 30);
  for (const path of PATHS)
    for (let i = 1; i < path.length; i++)
      for (let k = 0; k <= 30; k++) {
        const a = path[i - 1],
          b = path[i],
          t = k / 30;
        assert.equal(
          reclaimedStone(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t).missing,
          false,
        );
      }
});
