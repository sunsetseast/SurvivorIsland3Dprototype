import * as T from "three";
import { southernCliffGeometry } from "../src/game/environment/Landmarks.tsx";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  SPAWN,
  isWalkable,
  movePlayer,
  groundHeight,
  BOUNDS,
  LANDMARKS,
  COLLIDERS,
} from "../src/game/world.ts";
import { CampNavigation, distance } from "../src/game/navigation.ts";
import {
  TRAILS,
  TERRITORY,
  EXPANDED_PLACES,
  cliffFaceZ,
  CAVE,
  territoryContains,
  NATURAL_LANDMARKS,
} from "../src/game/environment/geography.ts";
import {
  HIDING_CANDIDATES,
  eligibleHidingCandidates,
} from "../src/game/environment/hidingSpots.ts";
import { CampRuntime, SPOTS } from "../src/game/CampRuntime.ts";
const t = performance.now(),
  nav = new CampNavigation();
console.log(
  JSON.stringify({
    navigationBuildOrReuseMs: performance.now() - t,
    nodes: nav.nodes.length,
    colliders: COLLIDERS.length,
  }),
);
const traverse = (start, points) => {
  let p = start;
  for (const b of points) {
    const d = distance(p, b),
      n = Math.ceil(d / 0.08),
      a = { ...p };
    for (let i = 1; i <= n; i++) {
      const target = {
        x: a.x + ((b.x - a.x) * i) / n,
        z: a.z + ((b.z - a.z) * i) / n,
      };
      p = movePlayer(p, target.x - p.x, target.z - p.z);
      assert.ok(
        distance(p, target) < 0.002,
        JSON.stringify({ a, b, p, target }),
      );
      assert.ok(Number.isFinite(groundHeight(p.x, p.z)));
    }
  }
  return p;
};
test("expanded irregular territory and remote spring have meaningful scale", () => {
  const area =
    Math.abs(
      TERRITORY.reduce((v, a, i) => {
        const b = TERRITORY[(i + 1) % TERRITORY.length];
        return v + a.x * b.z - b.x * a.z;
      }, 0),
    ) / 2;
  assert.ok(area > 2.5 * 94 * 94);
  assert.ok(distance(LANDMARKS.campfire, LANDMARKS.well) > 125);
  assert.equal(territoryContains(BOUNDS.maxX - 1, BOUNDS.maxZ - 1), false);
  assert.ok(
    nav
      .route(SPAWN, SPOTS.waterWell[0])
      .reduce((v, p, i, a) => v + (i ? distance(p, a[i - 1]) : 0), 0) > 130,
  );
});
test("every authored trail centreline is traversable by the real body solver", () => {
  for (const trail of TRAILS) {
    assert.ok(isWalkable(trail.points[0].x, trail.points[0].z), trail.id);
    traverse(trail.points[0], trail.points.slice(1));
  }
});
test("all expanded activity spaces and NPC anchors are graph-connected", () => {
  for (const p of [
    ...Object.values(EXPANDED_PLACES),
    ...Object.values(SPOTS).flat(),
  ]) {
    const r = nav.route(SPAWN, p);
    assert.ok(r, JSON.stringify(p));
    traverse(SPAWN, r);
  }
});
test("southern limestone is accessible but solid faces cannot be crossed or climbed", () => {
  traverse({ x: -17, z: 91 }, [{ x: -17, z: cliffFaceZ(-17, 1.8) - 0.6 }]);
  const a = { x: -17, z: cliffFaceZ(-17, 1.8) - 0.6 },
    b = movePlayer(a, 0, 8);
  assert.ok(b.z < cliffFaceZ(-17));
  assert.equal(isWalkable(-17, cliffFaceZ(-17) + 1), false);
  const cave = { x: 11, z: 104 };
  assert.ok(nav.route(SPAWN, cave));
  traverse(cave, [{ x: 11, z: CAVE.backZ - 1 }]);
  assert.equal(isWalkable(11, CAVE.backZ), false);
});
test("39 future hiding candidates have stable IDs, grounded reachable approaches, no spawning side effects", () => {
  assert.equal(HIDING_CANDIDATES.length, 39);
  assert.equal(new Set(HIDING_CANDIDATES.map((s) => s.id)).size, 39);
  assert.equal(eligibleHidingCandidates("idol").length, 39);
  for (const s of HIDING_CANDIDATES) {
    const p = s.interactionPosition;
    assert.ok(isWalkable(p.x, p.z), s.id);
    assert.ok(nav.route(SPAWN, p), s.id);
    assert.equal(p.y, groundHeight(p.x, p.z));
    assert.ok(s.position.y >= groundHeight(s.position.x, s.position.z));
    assert.ok(distance(p, s.position) <= s.collision.inspectRadius, s.id);
    assert.equal(s.collision.requiresClimbing, false);
    assert.ok(!("owner" in s));
  }
  assert.equal(new Set(HIDING_CANDIDATES.map((s) => s.landmarkId)).size, 13);
  assert.equal(NATURAL_LANDMARKS.length, 12);
});
test("an NPC physically completes the remote water trip and returns without expiring its intent en route", () => {
  const rt = new CampRuntime(undefined, 7141, nav),
    n = rt.npcs[0];
  assert.ok(
    rt.request(n, {
      activity: "collect_water",
      place: "waterWell",
      duration: 20,
      reason: "Expansion validation",
    }),
  );
  for (let i = 0; i < 24000 && n.traveling; i++)
    rt.step(1 / 60, {
      ...SPAWN,
      y: groundHeight(SPAWN.x, SPAWN.z),
      moving: false,
    });
  assert.equal(n.place, "waterWell");
  assert.ok(distance(n, LANDMARKS.well) < 6);
  assert.ok(
    rt.request(n, {
      activity: "rest",
      place: "campfire",
      duration: 20,
      reason: "Return from spring",
    }),
  );
  for (let i = 0; i < 24000 && n.traveling; i++)
    rt.step(1 / 60, {
      ...SPAWN,
      y: groundHeight(SPAWN.x, SPAWN.z),
      moving: false,
    });
  assert.equal(n.place, "campfire");
});

test("navigation can retreat out of a newly overlapping NPC avoidance ring", () => {
  const start = { x: 12, z: -38.9 },
    avoid = [{ x: 12, z: -38.1, radius: 0.95 }];
  const route = nav.route(start, { x: 12, z: -33 }, avoid);
  assert.ok(route);
  assert.ok(route[0].z < start.z);
  traverse(start, route);
});

test("real cliff triangles leave the cave mouth open and agree with near-contact collision", () => {
  for (const low of [true, false]) {
    const g = southernCliffGeometry(low),
      m = new T.Mesh(g, new T.MeshBasicMaterial({ side: T.DoubleSide }));
    m.updateMatrixWorld();
    const ray = new T.Raycaster(
      new T.Vector3(11, groundHeight(11, 104) + 1.5, 94),
      new T.Vector3(0, 0, 1),
    );
    const cave = ray.intersectObject(m)[0];
    assert.ok(
      cave && cave.point.z > 110.5,
      "Cave mouth must be an actual geometric opening",
    );
    for (const x of [7.8, 14.3]) {
      ray.set(
        new T.Vector3(x, groundHeight(11, 104) + 1.5, 94),
        new T.Vector3(0, 0, 1),
      );
      assert.ok(
        ray.intersectObject(m)[0]?.point.z > 110.5,
        "Both cave edges must stay open at both quality levels",
      );
    }
    ray.set(
      new T.Vector3(-17, groundHeight(-17, 94) + 1.5, 94),
      new T.Vector3(0, 0, 1),
    );
    const face = ray.intersectObject(m)[0];
    assert.ok(face);
    assert.ok(Math.abs(face.point.z - (cliffFaceZ(-17, 1.8) - 0.25)) < 1.1);
    assert.equal(isWalkable(-17, face.point.z + 0.5), false);
    assert.ok(g.index.count / 3 < (low ? 5000 : 16000));
    for (const n of g.attributes.position.array) assert.ok(Number.isFinite(n));
    g.dispose();
    m.material.dispose();
  }
});
