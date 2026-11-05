/** Offline-only relief transfer from the existing CC0 boulder. No runtime mesh work. */
import { createRequire } from "node:module";
const require = createRequire(
  new URL(
    "../../../artifacts/survivor-camp-prototype/package.json",
    import.meta.url,
  ),
);
const T = require("three") as typeof import("three");
let heightField: Float32Array | undefined;
const SIZE = 65;
export function transferRockRelief(
  target: T.BufferGeometry,
  scan: T.BufferGeometry,
) {
  if (!heightField) {
    scan.computeBoundingBox();
    const b = scan.boundingBox!,
      size = b.getSize(new T.Vector3());
    const mesh = new T.Mesh(
      scan,
      new T.MeshBasicMaterial({ side: T.DoubleSide }),
    );
    mesh.updateMatrixWorld();
    const ray = new T.Raycaster(),
      field = new Float32Array(SIZE * SIZE);
    for (let j = 0; j < SIZE; j++)
      for (let i = 0; i < SIZE; i++) {
        ray.set(
          new T.Vector3(
            b.min.x + (i / (SIZE - 1)) * size.x,
            b.max.y + 1,
            b.min.z + (j / (SIZE - 1)) * size.z,
          ),
          new T.Vector3(0, -1, 0),
        );
        const hit = ray.intersectObject(mesh)[0];
        field[j * SIZE + i] = hit ? (hit.point.y - b.min.y) / size.y : 0;
      }
    mesh.material.dispose();
    heightField = field;
  }
  const sample = (u: number, v: number) => {
    const x = (u - Math.floor(u)) * (SIZE - 1),
      y = (v - Math.floor(v)) * (SIZE - 1),
      i = Math.floor(x),
      j = Math.floor(y),
      a = x - i,
      b = y - j;
    return (
      heightField![j * SIZE + i]! * (1 - a) * (1 - b) +
      heightField![j * SIZE + i + 1]! * a * (1 - b) +
      heightField![(j + 1) * SIZE + i]! * (1 - a) * b +
      heightField![(j + 1) * SIZE + i + 1]! * a * b
    );
  };
  const p = target.attributes.position!,
    n = target.attributes.normal!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      nx = n.getX(i),
      nz = n.getZ(i),
      horizontal = Math.hypot(nx, nz);
    const safe =
      T.MathUtils.smoothstep(y, 11, 20) *
      (1 - T.MathUtils.smoothstep(Math.abs(n.getY(i)), 0.38, 0.75));
    if (!safe || horizontal < 0.1) continue;
    const detail =
      sample((x + z * 0.65) * 0.13, y * 0.11) * 0.7 +
      sample((z - x * 0.27) * 0.053, y * 0.061 + 0.37) * 0.3;
    const offset = (detail - 0.36) * 2.0 * safe;
    p.setXYZ(
      i,
      x + (nx / horizontal) * offset,
      y,
      z + (nz / horizontal) * offset,
    );
  }
  target.computeVertexNormals();
  target.computeBoundingBox();
  target.computeBoundingSphere();
}
