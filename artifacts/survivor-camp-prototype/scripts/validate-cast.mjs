import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../src/game/character/cast.json", import.meta.url)));
const appearances = JSON.parse(await readFile(new URL("../../../tools/character/appearances.json", import.meta.url)));
const assetDir = new URL("../src/assets/characters/cast/", import.meta.url);
const expectedClips = ["idle", "walk", "run", "turn", "turn_right", "crouch", "crawl", "climb", "balance", "recover", "interact", "talk", "sit"];
const ids = new Set(), avatars = new Set(), files = new Set(), hashes = new Set();
const metrics = [];
assert.equal(manifest.version, 1);
assert.match(manifest.source.revision, /^[0-9a-f]{40}$/);
assert.equal(manifest.survivors.length, Object.keys(appearances.people).length);
let rigNames;
for (const { source, appearance, model, status } of manifest.survivors) {
  const { id, name, season, gender, traitClass, avatarUrl } = source;
  assert.ok(Number.isSafeInteger(id) && id > 0 && !ids.has(id), `Invalid source ID ${id}`);
  ids.add(id);
  assert.ok(name && season && gender && traitClass && avatarUrl?.startsWith("Assets/Avatars/") && !avatars.has(avatarUrl));
  avatars.add(avatarUrl);
  for (const key of ["strength", "speed", "endurance", "dexterity", "focus", "connections"]) {
    assert.ok(Number.isFinite(source[key]) && source[key] >= 1 && source[key] <= 10, `${id} ${key}`);
  }
  assert.equal(appearance, `tools/character/appearances.json#people/${id}`);
  assert.ok(appearances.people[id]?.cues);
  assert.equal(model, `survivor-${id}.glb`);
  assert.ok(["generated", "webgl-reviewed"].includes(status));
  assert.ok(!files.has(model));
  files.add(model);
  const bytes = await readFile(new URL(model, assetDir));
  const hash = createHash("sha256").update(bytes).digest("hex");
  assert.ok(!hashes.has(hash), `Duplicate model payload ${model}`);
  hashes.add(hash);
  assert.ok(bytes.length <= 650_000, `${model} is ${bytes.length} bytes`);
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(bytes.toString("ascii", 16, 20), "JSON");
  const json = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
  assert.equal(json.asset.version, "2.0");
  const bin = 20 + jsonLength;
  assert.equal(bytes.readUInt32LE(bin) + bin + 8, bytes.length);
  assert.equal(bytes.toString("ascii", bin + 4, bin + 7), "BIN");
  const bufferLength = bytes.readUInt32LE(bin);
  const actor = json.nodes.find((node) => node.name === `Survivor_${id}`);
  assert.ok(actor && Number.isInteger(actor.mesh) && Number.isInteger(actor.skin), `Wrong actor identity in ${model}`);
  assert.equal(json.skins.length, 1);
  const joints = json.skins[actor.skin].joints.map((joint) => json.nodes[joint].name);
  assert.equal(joints.length, 66);
  assert.ok(joints.includes("LeftToeBase") && joints.includes("RightToeBase"));
  rigNames ??= joints;
  assert.deepEqual(joints, rigNames);
  assert.deepEqual(json.animations.map((clip) => clip.name).sort(), [...expectedClips].sort());
  for (const clip of json.animations) {
    assert.ok(clip.channels.some((channel) => channel.target.path === "rotation"));
    assert.ok(clip.samplers.some((sampler) => (json.accessors[sampler.input].max?.[0] ?? 0) > 0));
  }
  let triangles = 0;
  for (const primitive of json.meshes[actor.mesh].primitives) {
    const { POSITION, NORMAL, JOINTS_0, WEIGHTS_0 } = primitive.attributes;
    assert.ok([POSITION, NORMAL, JOINTS_0, WEIGHTS_0, primitive.indices].every((index) => Number.isInteger(index) && json.accessors[index]));
    const position = json.accessors[POSITION];
    for (const index of [NORMAL, JOINTS_0, WEIGHTS_0]) assert.equal(json.accessors[index].count, position.count);
    assert.ok(position.count > 0 && [...position.min, ...position.max].every(Number.isFinite));
    const count = json.accessors[primitive.indices].count;
    assert.ok(count > 0 && count % 3 === 0);
    triangles += count / 3;
  }
  assert.ok(triangles < 23_000, `${model} exceeded triangle budget with ${triangles}`);
  assert.ok(json.images.length > 0);
  for (const image of json.images) {
    assert.ok(!image.uri && /^image\/(webp|png|jpeg)$/.test(image.mimeType));
    const { buffer, byteOffset = 0, byteLength } = json.bufferViews[image.bufferView];
    assert.ok(buffer === 0 && byteLength > 0 && byteOffset + byteLength <= bufferLength, `Missing texture in ${model}`);
  }
  metrics.push({ id, bytes: bytes.length, triangles, clips: json.animations.length });
}
assert.deepEqual((await readdir(assetDir)).filter((path) => path.endsWith(".glb")).sort(), [...files].sort());
console.table(metrics);
console.log(`Validated ${metrics.length} assets, ${metrics.reduce((sum, item) => sum + item.bytes, 0)} bytes`);
