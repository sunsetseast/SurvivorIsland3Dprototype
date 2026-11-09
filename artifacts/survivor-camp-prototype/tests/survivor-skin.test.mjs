import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { AnimationClip, Bone, Group, NumberKeyframeTrack } from "three";
import { SkeletalPlayback } from "../src/game/character/SkeletalPlayback.ts";

test("interrupted skeletal blends keep the current pose and release mixer bindings", () => {
  const root = new Group();
  const joint = new Bone();
  joint.name = "Hip";
  root.add(joint);
  const pose = (name, position) => new AnimationClip(name, 1, [
    new NumberKeyframeTrack("Hip.position[y]", [0, 1], [position, position]),
  ]);
  const playback = new SkeletalPlayback(root, [pose("rest", 1), pose("step", 2), pose("dash", 3)], {
    idle: "rest", walk: "step", run: "dash",
  });
  playback.update("idle", 1, 0);
  playback.update("walk", 1, 0.08);
  assert.equal(joint.position.y, 1.5);
  playback.update("run", 1, 0);
  assert.equal(joint.position.y, 1.5, "an interrupted blend must start at its current pose");
  playback.update("run", 1, 0.16);
  assert.equal(joint.position.y, 3);
  playback.dispose();
  assert.equal(joint.position.y, 0, "disposing restores the original binding");
});

test("the bundled survivor ships one skin and all player actions within its asset budget", () => {
  const bytes = readFileSync(new URL("../src/assets/characters/tonsai-survivor.glb", import.meta.url));
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.ok(bytes.length < 800_000);
  const doc = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
  assert.equal(doc.skins.length, 1);
  assert.ok(doc.skins[0].joints.length <= 70);
  const primitives = doc.meshes.flatMap(({ primitives }) => primitives);
  assert.ok(primitives.every(({ attributes }) => attributes.JOINTS_0 !== undefined && attributes.WEIGHTS_0 !== undefined));
  assert.ok(primitives.reduce((sum, { indices }) => sum + doc.accessors[indices].count / 3, 0) <= 16_000);
  assert.deepEqual(doc.animations.map(({ name }) => name).sort(), [
    "balance", "climb", "crawl", "crouch", "idle", "interact", "recover",
    "run", "talk", "turn", "turn_right", "walk",
  ]);
});
