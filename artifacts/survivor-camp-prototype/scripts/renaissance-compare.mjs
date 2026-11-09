import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [beforePath, afterPath] = process.argv.slice(2);
assert.ok(beforePath && afterPath, "pass the baseline and branch report paths");
const [before, after] = await Promise.all(
  [beforePath, afterPath].map(async (file) =>
    JSON.parse(await readFile(file, "utf8")),
  ),
);
const views = [
  "01-panorama",
  "02-jungle-cliff",
  "03-shoreline",
  "04-tidal-shelf",
];
for (const report of [before, after]) {
  assert.equal(report.result, "PASS");
  assert.equal(report.captureContract, "railay-fixed-views-v3");
  assert.deepEqual(report.errors, []);
  assert.deepEqual(
    report.qualities.map(({ quality }) => quality),
    ["low", "high"],
  );
  for (const { views: captures } of report.qualities)
    assert.deepEqual(
      captures.map(({ name }) => name),
      views,
    );
}
assert.equal(before.phase, "before");
assert.equal(after.phase, "after");
assert.equal(before.browser, after.browser, "same browser build");

function metrics(view) {
  assert.equal(
    view.frameFinishMs.length,
    12,
    "capture twelve software render samples",
  );
  assert.ok(
    view.frameFinishMs.every((time) => Number.isFinite(time) && time >= 0),
  );
  const sorted = [...view.frameFinishMs].sort((a, b) => a - b);
  return {
    calls: view.stats.calls,
    triangles: view.stats.triangles,
    geometryBytes: view.geometryBytes,
    textureBytes: view.textureBytes,
    softwareMedianMs: (sorted[5] + sorted[6]) / 2,
  };
}
const pairs = before.qualities.flatMap(({ quality, views: baseline }, i) =>
  baseline.map((a, j) => {
    const b = after.qualities[i].views[j];
    const label = `${quality}/${a.name}`;
    assert.deepEqual(
      [a.position, a.target, a.fov],
      [b.position, b.target, b.fov],
      label,
    );
    assert.deepEqual(a.renderer, b.renderer, `${label} renderer`);
    assert.deepEqual(
      [a.renderer.width, a.renderer.height, a.renderer.pixelRatio],
      [932, 430, 1],
    );
    const original = metrics(a),
      changed = metrics(b);
    assert.equal(
      changed.geometryBytes,
      original.geometryBytes,
      `${label} geometry storage`,
    );
    assert.equal(
      changed.textureBytes,
      original.textureBytes,
      `${label} texture storage`,
    );
    assert.ok(
      changed.calls <= original.calls + 2,
      `${label} draw calls ${original.calls} -> ${changed.calls}`,
    );
    assert.ok(
      changed.triangles <= original.triangles * 1.05,
      `${label} triangle budget`,
    );
    return { quality, name: a.name, before: original, after: changed };
  }),
);
await writeFile(
  path.join(path.dirname(afterPath), "comparison.json"),
  JSON.stringify(
    { result: "PASS", pairs, timing: "SwiftShader wall time, not device FPS" },
    null,
    2,
  ) + "\n",
);
console.log(`PASS ${pairs.length} Railay camera pairs and render budgets`);
