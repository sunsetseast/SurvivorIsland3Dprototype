import * as T from "three";
import {
  approachSurface,
  pathDistance,
  ARRIVAL,
  trailDistance,
  tribalHeight,
} from "./layout";

/** Shared pavement mask. Mortared tesserae sit ON the controller surface, never suspended slabs. */
export function pavedAt(x: number, z: number) {
  const a = approachSurface(x, z);
  if (a.distance < 1.55) return false; // The physical stairs and bridge own this surface.
  const council = (x / 14.8) ** 2 + ((z + 1) / 12.5) ** 2 < 1;
  const booth = x > -37.7 && x < -30.2 && z > 14.2 && z < 21.7;
  const gallery = x > -23.8 && x < -13.5 && z > -7.7 && z < 2.5;
  return (
    council ||
    booth ||
    gallery ||
    trailDistance(x, z) < 1.35 ||
    pathDistance(ARRIVAL.slice(0, 2), x, z) < 1.35
  );
}
const noise = (x: number, z: number) => {
  const a = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return a - Math.floor(a);
};
/** Irregular shared vertices keep joints narrow and avoid radial stepping-stone gaps.
 * Fine triangles conform to grades. Underlying earth/mortar fills every joint. */
export function pavementTiles() {
  const tiles: { geometry: T.BufferGeometry; moss: boolean }[] = [];
  const size = 1.02;
  const seed = (i: number, j: number) => ({
    x: (i + 0.5 + (noise(i, j) - 0.5) * 0.82) * size,
    z: (j + 0.5 + (noise(i + 31, j) - 0.5) * 0.82) * size,
  });
  // Voronoi flagstones: bisectors between neighbouring seeded quarry stones.
  // Shared boundaries tessellate exactly; there are no square rows or overlapping slabs.
  for (let i = -41; i < 42; i++)
    for (let j = -47; j < 29; j++) {
      const centre = seed(i, j),
        { x, z } = centre;
      if (!pavedAt(x, z)) continue;
      let polygon = [
        { x: x - 2.5, z: z - 2.5 },
        { x: x - 2.5, z: z + 2.5 },
        { x: x + 2.5, z: z + 2.5 },
        { x: x + 2.5, z: z - 2.5 },
      ];
      for (let di = -2; di <= 2; di++)
        for (let dj = -2; dj <= 2; dj++) {
          if (di === 0 && dj === 0) continue;
          const other = seed(i + di, j + dj),
            nx = other.x - x,
            nz = other.z - z;
          const boundary =
            (other.x * other.x + other.z * other.z - x * x - z * z) / 2;
          const clipped: { x: number; z: number }[] = [];
          for (let k = 0; k < polygon.length; k++) {
            const a = polygon[k]!,
              b = polygon[(k + 1) % polygon.length]!;
            const da = a.x * nx + a.z * nz - boundary,
              db = b.x * nx + b.z * nz - boundary;
            if (da <= 0) clipped.push(a);
            if (da < 0 !== db < 0) {
              const t = da / (da - db);
              clipped.push({
                x: a.x + (b.x - a.x) * t,
                z: a.z + (b.z - a.z) * t,
              });
            }
          }
          polygon = clipped;
        }
      const points = polygon.map((p) => ({
        x: p.x + (x - p.x) * 0.018,
        z: p.z + (z - p.z) * 0.018,
      }));
      const positions: number[] = [],
        uv: number[] = [];
      for (let k = 0; k < points.length; k++)
        for (const p of [
          centre,
          points[k]!,
          points[(k + 1) % points.length]!,
        ]) {
          positions.push(p.x, tribalHeight(p.x, p.z) - 0.004, p.z);
          uv.push(p.x * 0.65, p.z * 0.65);
        }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      geometry.computeVertexNormals();
      tiles.push({ geometry, moss: false });
    }
  return tiles;
}
