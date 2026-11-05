import test from "node:test";
import assert from "node:assert/strict";
import { BoxGeometry, MeshBasicMaterial, Texture } from "three";
import { pruneDisposedResources } from "../src/game/locations/releasedResources.ts";

function observe(owned, resource) {
  const record = { disposed: false, notifications: 0, listener: null };
  record.listener = () => { record.disposed = true; record.notifications++; };
  resource.addEventListener("dispose", record.listener);
  owned.set(resource, record);
  return record;
}

test("disposed detached geometry, materials and textures release tracking references and listeners", () => {
  const owned = new Map();
  for (const resource of [new BoxGeometry(), new MeshBasicMaterial(), new Texture()]) {
    const record = observe(owned, resource);
    resource.dispose();
    pruneDisposedResources(owned, new Set());
    assert.equal(owned.has(resource), false);
    resource.dispose();
    assert.equal(record.notifications, 1, "tracking listener must be removed");
  }
  assert.equal(owned.size, 0);
});

test("a disposed asset still attached to the scene remains owned for a possible GPU re-upload", () => {
  const owned = new Map(), geometry = new BoxGeometry();
  const record = observe(owned, geometry);
  geometry.dispose();
  pruneDisposedResources(owned, new Set([geometry]));
  assert.equal(owned.has(geometry), true);
  geometry.dispose();
  assert.equal(record.notifications, 2, "final scene sweep must still observe live assets");
  pruneDisposedResources(owned, new Set());
  assert.equal(owned.size, 0);
});

test("a detached asset awaiting asynchronous disposal stays owned until released", () => {
  const owned = new Map(), geometry = new BoxGeometry();
  observe(owned, geometry);
  pruneDisposedResources(owned, new Set());
  assert.equal(owned.has(geometry), true);
  geometry.dispose();
  pruneDisposedResources(owned, new Set());
  assert.equal(owned.size, 0);
});

test("64 equipment replacements retain only current assets and can observe a reused asset again", () => {
  const owned = new Map(), environment = new Texture(), reused = new BoxGeometry();
  observe(owned, environment);
  let previous;
  for (let i = 0; i < 64; i++) {
    if (previous) previous.dispose();
    const current = i % 2 === 0 ? reused : new BoxGeometry();
    observe(owned, current);
    pruneDisposedResources(owned, new Set([environment, current]));
    assert.equal(owned.size, 2);
    assert.equal(owned.has(current), true);
    previous = current;
  }
  previous.dispose();
  environment.dispose();
  pruneDisposedResources(owned, new Set());
  assert.equal(owned.size, 0);
});
