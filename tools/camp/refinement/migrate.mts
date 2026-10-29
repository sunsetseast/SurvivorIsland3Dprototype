/** Ray-validate candidate surfaces independently of reachable approach markers. */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire(
  new URL(
    "../../../artifacts/survivor-camp-prototype/package.json",
    import.meta.url,
  ),
);
const T = await import(require.resolve("three"));
import { buildLandmarks } from "./model.mts";
import { southernCliffGeometry } from "../../../artifacts/survivor-camp-prototype/src/game/environment/limestone.ts";
import { createHidingCandidates } from "../../../artifacts/survivor-camp-prototype/src/game/environment/hidingSpots.ts";
import {
  NATURAL_LANDMARKS,
  SPRING,
  cliffFaceZ,
} from "../../../artifacts/survivor-camp-prototype/src/game/environment/geography.ts";
import { baseHeight } from "../../../artifacts/survivor-camp-prototype/src/game/world.ts";
const records = buildLandmarks("near"),
  material = new T.MeshBasicMaterial({ side: T.DoubleSide }),
  meshes = records.map((r) => {
    const l =
        r.site === "spring-seep"
          ? SPRING
          : NATURAL_LANDMARKS.find((l) => l.id === r.site)!,
      m = new T.Mesh(r.geometry, material);
    m.position.set(l.x, baseHeight(l.x, l.z), l.z);
    m.name = r.name;
    m.userData.site = r.site;
    m.updateMatrixWorld(true);
    return m;
  });
const cliff = new T.Mesh(southernCliffGeometry(), material);
cliff.name = "southern-cliff-rock-near";
cliff.updateMatrixWorld();
const data: Record<string, unknown> = {},
  missing: string[] = [];
for (const c of createHidingCandidates(false)) {
  const siteMeshes = ["southern-cave", "roof-shelter"].includes(c.landmarkId)
    ? [cliff]
    : meshes.filter((m) => m.userData.site === c.landmarkId);
  const p = { ...c.position },
    a = { ...c.interactionPosition },
    hits = [];
  if (c.landmarkId === "roof-shelter") {
    a.z = cliffFaceZ(a.x, 1.8) - 1.5;
    a.y = baseHeight(a.x, a.z);
    p.z = cliffFaceZ(p.x, 0.8);
    p.y = baseHeight(p.x, 98) + 0.8;
  }

  for (const dy of [0, 0.2, -0.2, 0.55, -0.1, -0.05, 0.05])
    for (const dx of [0, -0.45, 0.45, -0.9, 0.9])
      for (const dz of [0, -0.45, 0.45, -0.9, 0.9]) {
        const target = new T.Vector3(p.x + dx, p.y + dy, p.z + dz),
          origin = new T.Vector3(a.x, target.y, a.z),
          dir = target.clone().sub(origin).normalize(),
          ray = new T.Raycaster(origin, dir, 0, c.collision.inspectRadius);
        const hit = ray.intersectObjects(siteMeshes, false)[0];
        if (!hit || hit.point.y < baseHeight(hit.point.x, hit.point.z) + 0.02)
          continue;
        hits.push({
          hit,
          origin,
          score: hit.point.distanceTo(new T.Vector3(p.x, p.y, p.z)),
        });
      }
  for (const dx of [0, -0.3, 0.3])
    for (const dz of [0, -0.3, 0.3]) {
      const origin = new T.Vector3(p.x + dx, p.y + 1.2, p.z + dz),
        ray = new T.Raycaster(origin, new T.Vector3(0, -1, 0), 0, 1.5),
        hit = ray.intersectObjects(siteMeshes, false)[0];
      if (
        hit &&
        Math.hypot(hit.point.x - a.x, hit.point.z - a.z) <=
          c.collision.inspectRadius &&
        hit.point.y >= baseHeight(hit.point.x, hit.point.z) + 0.01
      )
        hits.push({
          hit,
          origin,
          score: hit.point.distanceTo(new T.Vector3(p.x, p.y, p.z)),
        });
    }
  hits.sort((a, b) => a.score - b.score);
  const found = hits[0];
  if (!found) {
    missing.push(c.id);
    continue;
  }
  const point = found.hit.point,
    position = point
      .clone()
      .addScaledVector(found.origin.clone().sub(point).normalize(), 0.055);
  data[c.id] = {
    interactionPosition: a,
    position: { x: position.x, y: position.y, z: position.z },
    surfaceAnchor: {
      x: point.x,
      y: point.y,
      z: point.z,
      mesh: found.hit.object.name,
    },
  };
}
if(missing.length||Object.keys(data).length!==39)throw Error("Unvalidated hiding surfaces: "+missing.join(","));
writeFileSync(
  new URL(
    "../../../artifacts/survivor-camp-prototype/src/game/environment/candidate-surfaces.json",
    import.meta.url,
  ),
  JSON.stringify(data, null, 2) + "\n",
);
console.log({ migrated: Object.keys(data).length, missing });
