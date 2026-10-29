/** Repeatable CPU/data measurement; no fabricated GPU/phone frame rates. */
import { performance } from "node:perf_hooks";
import { writeFileSync, statSync } from "node:fs";
const importedAt = performance.now();
const w = await import("../src/game/world.ts");
const { CampNavigation, distance } = await import("../src/game/navigation.ts");
const geo = await import("../src/game/environment/geography.ts");
const { HIDING_CANDIDATES } =
  await import("../src/game/environment/hidingSpots.ts");
const importMs = performance.now() - importedAt;
const start = performance.now(),
  nav = new CampNavigation(),
  buildMs = performance.now() - start;
const targets = [{ x: 104, z: 36 }, ...Object.values(geo.EXPANDED_PLACES)];
const searches = targets.map((goal) => {
  const a = performance.now(),
    r = nav.route(w.SPAWN, goal),
    coldMs = performance.now() - a,
    b = performance.now();
  nav.route(w.SPAWN, goal);
  return {
    goal,
    reachable: !!r,
    coldMs,
    warmMs: performance.now() - b,
    metres: r?.reduce((v, p, i) => v + distance(i ? r[i - 1] : w.SPAWN, p), 0),
    waypoints: r?.length,
  };
});
let walkableAreaEstimate = 0;
for (let x = w.BOUNDS.minX; x < w.BOUNDS.maxX; x++)
  for (let z = w.BOUNDS.minZ; z < w.BOUNDS.maxZ; z++)
    if (w.isWalkable(x + 0.5, z + 0.5)) walkableAreaEstimate++;
const terrain = Object.fromEntries(
  [
    ["low", 2.5],
    ["high", 1.5],
  ].map(([quality, step]) => {
    let vertices = 0,
      triangles = 0,
      chunks = 0;
    for (let x = geo.TERRAIN_EXTENT.minX; x < geo.TERRAIN_EXTENT.maxX; x += 48)
      for (
        let z = geo.TERRAIN_EXTENT.minZ;
        z < geo.TERRAIN_EXTENT.maxZ;
        z += 48
      ) {
        const nx = Math.ceil(Math.min(48, geo.TERRAIN_EXTENT.maxX - x) / step),
          nz = Math.ceil(Math.min(48, geo.TERRAIN_EXTENT.maxZ - z) / step);
        vertices += (nx + 1) * (nz + 1);
        triangles += nx * nz * 2;
        chunks++;
      }
    return [quality, { chunks, vertices, triangles }];
  }),
);
const report = {
  method:
    "Node performance.now CPU observations; 1m area sample excludes solids and water. Terrain counts from exact chunk tessellation; not GPU submitted counts.",
  importMs,
  buildMs,
  nodes: nav.nodes.length,
  directedEdges: nav.nodes.reduce((v, n) => v + n.edges.length, 0),
  searches,
  walkableAreaEstimate,
  terrain,
  vegetation: Object.fromEntries(
    ["PALMS", "BROADLEAF", "FERNS", "SHRUBS", "ROCKS", "BAMBOO", "GRASS"].map(
      (k) => [k, w[k].length],
    ),
  ),
  hidingCandidates: HIDING_CANDIDATES.length,
  hidingDistribution: Object.fromEntries(
    [...new Set(HIDING_CANDIDATES.map((s) => s.category))].map((k) => [
      k,
      HIDING_CANDIDATES.filter((s) => s.category === k).length,
    ]),
  ),
  trailMetres: geo.TRAILS.reduce(
    (v, t) =>
      v +
      t.points.reduce(
        (s, p, i) => s + (i ? distance(t.points[i - 1], p) : 0),
        0,
      ),
    0,
  ),
  assetBytes: Object.fromEntries(
    [
      "limestone.glb",
      "coastal-tree.glb",
      "palms.glb",
      "sand_02-diff.jpg",
      "sand_02-normal.jpg",
      "brown_mud_leaves_01-diff.jpg",
      "brown_mud_leaves_01-normal.jpg",
    ].map((f) => [
      f,
      statSync(new URL("../src/assets/camp/" + f, import.meta.url)).size,
    ]),
  ),
};
writeFileSync(
  "../../docs/tonsai-expansion/evidence/data-metrics.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
