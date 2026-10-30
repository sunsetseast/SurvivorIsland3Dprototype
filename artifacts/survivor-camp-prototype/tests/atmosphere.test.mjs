import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import {
  ATMOSPHERES,
  atmosphereName,
  skyUniforms,
  sunDirection,
} from "../src/game/environment/atmosphere.ts";

test("daytime remains the default; art presets require the developer gate and own names", () => {
  for (const query of [
    "",
    "?atmosphere=golden",
    "?devTravel=0&atmosphere=afternoon",
    "?devTravel=1&atmosphere=constructor",
    "?devTravel=1&atmosphere=toString",
    "?devTravel=1&atmosphere=unknown",
  ])
    assert.equal(atmosphereName(query), "midday", query);
  for (const name of Object.keys(ATMOSPHERES))
    assert.equal(atmosphereName(`?devTravel=1&atmosphere=${name}`), name);
});
test("all atmosphere presets keep sky/water inputs finite and use the visible sun's normalized direction", () => {
  for (const a of Object.values(ATMOSPHERES)) {
    const u = skyUniforms(a),
      dir = sunDirection(a);
    assert.ok(Math.abs(dir.length() - 1) < 1e-12);
    assert.ok(dir.y > 0.2);
    assert.deepEqual(u.uSun.value.toArray(), dir.toArray());
    for (const key of ["uZenith", "uHorizon", "uCloudLight", "uCloudShade"]) {
      const rgb = u[key].value.toArray();
      assert.ok(rgb.every((v) => Number.isFinite(v) && v >= 0 && v <= 1));
    }
    assert.ok(u.uZenith.value.b > u.uZenith.value.r * 2);
    assert.ok(a.ambientIntensity < a.sunIntensity);
    assert.ok(a.exposure < 1);
  }
});
test("cloud atlas retains its declared dimensions and verified authoring provenance", () => {
  const dir = new URL("../src/assets/camp/", import.meta.url);
  const bytes = readFileSync(new URL("tropical-clouds.png", dir));
  const manifest = JSON.parse(
    readFileSync(new URL("tropical-clouds-manifest.json", dir)),
  );
  assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  assert.deepEqual(
    [bytes.readUInt32BE(16), bytes.readUInt32BE(20)],
    manifest.dimensions,
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    manifest.sha256,
  );
  const source = readFileSync(
    new URL("../../../tools/camp/atmosphere/clouds.py", import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    manifest.sourceSha256,
  );
  assert.ok(bytes.length < 500_000);
});
