/** Compare genuine saved renders; camera parity and resource budgets are independent of image appearance. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(
  process.env.ART_EVIDENCE_ROOT || "../../docs/tonsai-art/evidence",
);
const load = async (phase) =>
  JSON.parse(await readFile(`${root}/${phase}/report.json`, "utf8"));
const before = await load("before"),
  after = await load("after");
for (const report of [before, after]) {
  assert.equal(report.result, "PASS");
  assert.equal(report.captureContract, "static-camp-v1", "recapture both refs with the same static camp fixture");
  assert.deepEqual(report.errors, []);
  assert.equal(
    report.poses.length,
    28,
    "12 native and 2 inspection poses per quality",
  );
}
const summary = {
  method:
    "Paired production WebGL reports from the same runner and static NPC fixture; timings are excluded from budget assertions.",
  nativePairs: 0,
  inspectionPairs: 0,
  maxCameraDifference: 0,
  samples: [],
  poses: [],
};
for (const a of before.poses) {
  const b = after.poses.find(
    (p) => p.quality === a.quality && p.name === a.name,
  );
  assert.ok(b, `missing ${a.quality}/${a.name}`);
  if (a.camera.inspection) {
    assert.deepEqual(b.camera, a.camera);
    summary.inspectionPairs++;
  } else {
    for (const key of ["x", "y", "z", "yaw", "pitch"]) {
      const error = Math.abs(a.camera[key] - b.camera[key]);
      assert.ok(
        Number.isFinite(error) && error < 1e-6,
        `camera changed ${a.quality}/${a.name}/${key}`,
      );
      summary.maxCameraDifference = Math.max(
        summary.maxCameraDifference,
        error,
      );
    }
    assert.ok(
      b.render.calls <= a.render.calls + 2,
      `draw-call budget ${a.quality}/${a.name}: ${a.render.calls} -> ${b.render.calls}`,
    );
    assert.ok(
      b.render.triangles <= a.render.triangles * 1.05,
      `triangle budget ${a.name}`,
    );
    summary.poses.push({
      quality: a.quality,
      name: a.name,
      before: { calls: a.render.calls, triangles: a.render.triangles },
      after: { calls: b.render.calls, triangles: b.render.triangles },
    });
    summary.nativePairs++;
  }
}
for (const a of before.samples) {
  const b = after.samples.find((s) => s.quality === a.quality);
  assert.ok(b);
  assert.equal(after.browser, before.browser, "paired captures must use the same browser");
  assert.deepEqual(b.renderer, a.renderer, "paired renderer settings");
  assert.deepEqual(b.npcSnapshot, a.npcSnapshot, "identical initial NPC staging");
  assert.equal(
    b.geometryBytes,
    a.geometryBytes,
    "no additional resident geometry arrays",
  );
  assert.equal(
    b.textureBytesEstimate,
    a.textureBytesEstimate,
    "no additional image storage",
  );
  assert.equal(b.calls, a.calls, "spawn draw calls remain unchanged");
  assert.ok(b.triangles <= a.triangles * 1.05, "spawn triangle budget");
  summary.samples.push({
    quality: a.quality,
    before: {
      calls: a.calls,
      triangles: a.triangles,
      geometryBytes: a.geometryBytes,
      textureBytesEstimate: a.textureBytesEstimate,
    },
    after: {
      calls: b.calls,
      triangles: b.triangles,
      geometryBytes: b.geometryBytes,
      textureBytesEstimate: b.textureBytesEstimate,
    },
  });
}
summary.result = "PASS";
await writeFile(
  `${root}/comparison.json`,
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  `PASS ${summary.nativePairs} native and ${summary.inspectionPairs} inspection pairs; camera error ${summary.maxCameraDifference}; resource budgets preserved`,
);
