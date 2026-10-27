import { writeFileSync } from "node:fs";
import {
  GRID,
  SIZE,
  heightAt,
  walkable,
  moveOnTerrain,
} from "../src/game/railay/terrain.ts";
import { ZONES } from "../src/game/railay/geography.ts";
const valid = new Uint8Array(SIZE * SIZE),
  seen = new Uint8Array(SIZE * SIZE),
  parent = new Int32Array(SIZE * SIZE).fill(-1);
const point = (n) => ({
  x: GRID.min + (n % SIZE) * 6,
  z: GRID.min + Math.floor(n / SIZE) * 6,
});
for (let n = 0; n < valid.length; n++) {
  const p = point(n);
  valid[n] = Number(walkable(p.x, p.z));
}
const node = (p) =>
  Math.round((p.z - GRID.min) / 6) * SIZE + Math.round((p.x - GRID.min) / 6);
const start = node(ZONES[1].spawn),
  queue = [start];
seen[start] = 1;
for (let q = 0; q < queue.length; q++) {
  const n = queue[q],
    p = point(n);
  for (const d of [-1, 1, -SIZE, SIZE]) {
    const a = n + d;
    if (
      a < 0 ||
      a >= valid.length ||
      !valid[a] ||
      seen[a] ||
      Math.abs((n % SIZE) - (a % SIZE)) > 1
    )
      continue;
    const v = point(a);
    const next = moveOnTerrain(p, v.x - p.x, v.z - p.z);
    if (Math.hypot(next.x - v.x, next.z - v.z) > 0.1) continue;
    parent[a] = n;
    seen[a] = 1;
    queue.push(a);
  }
}
const report = {
  gridMetres: 6,
  reachableSamples: queue.length,
  zones: ZONES.map((z) => {
    const n = node(z.spawn),
      route = [];
    let a = n;
    if (seen[n]) {
      while (a !== start && a >= 0) {
        route.push(point(a));
        a = parent[a];
      }
      route.push(point(start));
      route.reverse();
    }
    return { id: z.id, reachable: !!seen[n], route };
  }),
};
writeFileSync(
  new URL("../../../docs/railay/evidence/reachability.json", import.meta.url),
  JSON.stringify(report),
);
console.log(
  report.zones.map(({ id, reachable, route }) => ({
    id,
    reachable,
    steps: route.length,
  })),
  report.reachableSamples,
);
if (report.zones.slice(0, 4).some((z) => !z.reachable)) process.exitCode = 1;
