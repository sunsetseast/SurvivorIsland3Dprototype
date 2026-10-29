/** Offline mesh authoring. Artist-controlled cross sections, not scaled primitives.
 * Original MIT wood; scanned Poly Haven boulder derivative. Y-up local metres. */
import { createRequire } from "node:module";
const require = createRequire(
  new URL(
    "../../../artifacts/survivor-camp-prototype/package.json",
    import.meta.url,
  ),
);
const T = require("three") as typeof import("three");
const { mergeGeometries, mergeVertices } = await import(
  require.resolve("three/examples/jsm/utils/BufferGeometryUtils.js")
);
const { MeshoptSimplifier } = await import(
  require.resolve("three/examples/jsm/libs/meshopt_simplifier.module.js")
);
await MeshoptSimplifier.ready;
const scanCache = new Map<string, T.BufferGeometry>();
import { readFileSync } from "node:fs";
import {
  baseHeight,
  noise2,
} from "../../../artifacts/survivor-camp-prototype/src/game/world.ts";
import {
  NATURAL_LANDMARKS,
  SPRING,
} from "../../../artifacts/survivor-camp-prototype/src/game/environment/geography.ts";
export type MeshRecord = {
  name: string;
  site: string;
  kind: "wood" | "rock";
  lod: "near" | "far";
  geometry: T.BufferGeometry;
};
const v = (p: number[]) => new T.Vector3(...(p as [number, number, number]));
const tau = Math.PI * 2;
export function scan(lod: "near" | "far" | "tiny") {
  if (scanCache.has(lod)) return scanCache.get(lod)!.clone();
  const b = readFileSync(
      new URL(
        "../../../artifacts/survivor-camp-prototype/src/assets/camp/limestone.glb",
        import.meta.url,
      ),
    ),
    jl = b.readUInt32LE(12),
    j = JSON.parse(b.subarray(20, 20 + jl).toString()),
    offset = 28 + jl;
  const p = j.meshes[1].primitives[0];
  let g = new T.BufferGeometry();
  const attr = (i: number) => {
    const a = j.accessors[i],
      bv = j.bufferViews[a.bufferView],
      n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type as "VEC3"]!,
      C = a.componentType === 5126 ? Float32Array : Uint16Array,
      bytes = b.subarray(
        offset + bv.byteOffset + (a.byteOffset || 0),
        offset +
          bv.byteOffset +
          (a.byteOffset || 0) +
          a.count * n * C.BYTES_PER_ELEMENT,
      );
    return new T.BufferAttribute(
      new C(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
      ),
      n,
    );
  };
  g.setAttribute("position", attr(p.attributes.POSITION));
  g.setAttribute("uv", attr(p.attributes.TEXCOORD_0));
  g.setIndex(attr(p.indices));
  g.rotateX(-Math.PI / 2);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  g.translate(
    -(bb.min.x + bb.max.x) / 2,
    -bb.min.y,
    -(bb.min.z + bb.max.z) / 2,
  );
  g.computeVertexNormals();
  if (lod === "tiny") {
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
    g = mergeVertices(g, 0.001);
    g.computeVertexNormals();
    const p = g.attributes.position!,
      uv = [];
    for (let i = 0; i < p.count; i++) uv.push(p.getX(i), p.getZ(i));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  }
  let result = g;
  if (lod !== "near") {
    const idx = MeshoptSimplifier.simplify(
      g.index!.array,
      g.attributes.position.array,
      3,
      Math.floor((g.index!.count * (lod === "tiny" ? 0.035 : 0.35)) / 3) * 3,
      lod === "tiny" ? 0.2 : 0.03,
    )[0];
    const [remap, count] = MeshoptSimplifier.compactMesh(idx);
    result = new T.BufferGeometry();
    for (const [name, a] of Object.entries(g.attributes)) {
      const arr = new Float32Array(count * a.itemSize);
      for (let i = 0; i < remap.length; i++)
        if (remap[i] !== 0xffffffff)
          for (let k = 0; k < a.itemSize; k++)
            arr[remap[i]! * a.itemSize + k] = a.getComponent(i, k);
      result.setAttribute(name, new T.BufferAttribute(arr, a.itemSize));
    }
    result.setIndex(new T.BufferAttribute(idx, 1));
    result.computeVertexNormals();
  }
  scanCache.set(lod, result);
  return result.clone();
}
function finish(g: T.BufferGeometry, kind: "wood" | "rock", seed = 0) {
  g.computeVertexNormals();
  const p = g.getAttribute("position"),
    n = g.getAttribute("normal"),
    colors = [],
    uv = [];
  const c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      f = noise2(x * 0.47 + seed, z * 0.39 + y * 0.1);
    if (kind === "rock") {
      c.set("#d9d3c3").multiplyScalar(0.8 + f * 0.2);
      const damp =
        Math.max(0, 1 - y / 1.6) * Math.max(0, n.getZ(i)) * (f > 0.48 ? 1 : 0);
      c.lerp(new T.Color("#64704b"), damp * 0.38);
    } else {
      c.set("#d7ccba").multiplyScalar(0.82 + f * 0.18);
      c.lerp(
        new T.Color("#4c5940"),
        Math.max(0, 1 - y / 0.6) * Math.max(0, f - 0.5) * 0.45,
      );
    }
    colors.push(c.r, c.g, c.b);
    uv.push((x + z * 0.73) * 0.2, y * 0.22 + z * 0.07);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  if (!g.hasAttribute("uv"))
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
/** Skin a sequence of hand-shaped cross sections with changing ellipses and cambium ridges.
 * Per-ring profile controls taper/curvature; axes transported along the spline. */
function loft(
  points: number[][],
  radial: number,
  steps: number,
  seed: number,
  inside = false,
) {
  const curve = new T.CatmullRomCurve3(
      points.map((p) => v(p)),
      false,
      "centripetal",
    ),
    pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      P = curve.getPoint(t),
      d = curve.getTangent(t),
      ref = Math.abs(d.y) > 0.9 ? v([1, 0, 0]) : v([0, 1, 0]),
      N = new T.Vector3().crossVectors(ref, d).normalize(),
      B = new T.Vector3().crossVectors(d, N),
      f = t * (points.length - 1),
      a = Math.min(points.length - 2, Math.floor(f)),
      u = f - a;
    const rx = T.MathUtils.lerp(points[a]![3]!, points[a + 1]![3]!, u),
      ry = T.MathUtils.lerp(
        points[a]![4] ?? points[a]![3]!,
        points[a + 1]![4] ?? points[a + 1]![3]!,
        u,
      );
    for (let k = 0; k <= radial; k++) {
      const angle = (k / radial) * tau,
        shape =
          1 +
          0.1 * Math.sin(angle * 5 + seed) +
          0.055 * Math.sin(angle * 9 - seed * 0.3) +
          0.035 * Math.sin(i * 0.6 + angle * 3 + seed),
        p = P.clone()
          .addScaledVector(N, Math.cos(angle) * rx * shape)
          .addScaledVector(B, Math.sin(angle) * ry * shape);
      pos.push(p.x, p.y, p.z);
      uv.push((k / radial) * 2, t * curve.getLength() * 0.4);
      if (i && k) {
        const q = i * (radial + 1) + k,
          a = q - radial - 2,
          b = q - 1,
          c = q,
          d = q - radial - 1;
        idx.push(...(inside ? [a, b, c, a, c, d] : [a, c, b, a, d, c]));
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
function merged(parts: T.BufferGeometry[], kind: "wood" | "rock", seed = 0) {
  const out = mergeGeometries(
    parts.map((p) => finish(p, kind, seed)),
    false,
  )!;
  parts.forEach((p) => p.dispose());
  return out;
}
export const ROCK_LAYOUT: Record<string, number[][]> = {
  "moss-gates": [
    [-4.1, 0, 0, 3.2, 0.12],
    [4.15, 0, 2.0, 2.7, 2.2],
    [-1.4, 0, 7.5, 2.8, -0.7],
    [2.1, 0, 7.0, 1.35, 1.1],
  ],
  "quiet-alcove": [
    [-4.2, 0, 1, 2.65, 0.15],
    [4.2, 0, 1, 2.55, 2.6],
    [0, 0, 4.8, 2.5, 1.3],
  ],
  "strangler-stone": [[0, 0, 0, 2.8, 0.8]],
};
function rockAt(
  lod: "near" | "far",
  spec: number[],
  site: { x: number; z: number },
  seed: number,
) {
  const [x, y, z, s, a] = spec as [number, number, number, number, number],
    g = scan(lod);
  g.rotateY(a);
  g.scale(s, s, s);
  g.translate(
    x,
    baseHeight(site.x + x, site.z + z) - baseHeight(site.x, site.z) + y - 0.12,
    z,
  );
  return finish(g, "rock", seed);
}
export function buildLandmarks(lod: "near" | "far") {
  const result: MeshRecord[] = [],
    low = lod === "far",
    rad = low ? 8 : 16,
    steps = low ? 6 : 14;
  for (const l of [
    ...NATURAL_LANDMARKS,
    { id: "spring-seep", kind: "spring", ...SPRING },
  ]) {
    const wood: T.BufferGeometry[] = [],
      rocks: T.BufferGeometry[] = [],
      floor = baseHeight(l.x, l.z),
      ground = (x: number, z: number) => baseHeight(l.x + x, l.z + z) - floor;
    const limb = (p: number[][], seed = 1) =>
      wood.push(loft(p, rad, steps, seed));
    const root = (a: number, len: number, h: number, seed: number) => {
      const dx = Math.cos(a),
        dz = Math.sin(a),
        bend = 0.35 * Math.sin(seed * 2),
        points = [
          [dx * 0.9, 1.9 + h * 0.45, dz * 0.9, 0.45, h * 0.38],
          [
            dx * 1.5 + dz * bend,
            ground(dx * 1.5, dz * 1.5) + h * 0.6,
            dz * 1.5 - dx * bend,
            0.4,
            h * 0.52,
          ],
          [
            dx * 2.65,
            ground(dx * 2.65, dz * 2.65) + 0.3,
            dz * 2.65,
            0.22,
            0.36,
          ],
          [
            dx * len,
            ground(dx * len, dz * len) + 0.035,
            dz * len,
            0.035,
            0.025,
          ],
        ];
      limb(points, seed);
    };
    if (l.kind === "buttress") {
      // Unequal, fluted trunk lobes taper into offset crown leaders.
      limb(
        [
          [0, -0.1, 0, 1.85, 1.65],
          [0.08, 1.1, -0.1, 1.65, 1.48],
          [-0.2, 3.7, 0.03, 1.33, 1.23],
          [0.12, 7.4, 0.25, 1.06, 1.02],
          [0.55, 12, 0.05, 0.87, 0.82],
          [0.05, 17, -0.4, 0.7, 0.67],
          [-0.7, 21, -0.7, 0.48, 0.43],
          [-1.6, 26, -1.2, 0.12, 0.1],
        ],
        4,
      );
      for (const [i, a] of [
        0.2, 0.88, 1.61, 2.24, 2.93, 3.69, 4.38, 5.15, 5.81,
      ].entries())
        root(a, 4.55 + (i % 3) * 0.23, 1.8 + (i % 4) * 0.22, i + 2);
      const tips = [
        [-9, 24, -4],
        [7, 27, -7],
        [8, 25, 6],
        [-4, 28, 9],
        [1, 29, -3],
        [-7, 26, 6],
      ];
      tips.forEach((p, i) =>
        limb(
          [
            [0.1, 15 + i * 0.85, -0.2, 0.62 - i * 0.045],
            [p[0]! * 0.35, 21 + i * 0.6, p[2]! * 0.27, 0.43],
            [p[0]!, p[1]!, p[2]!, 0.07],
          ],
          i + 10,
        ),
      );
    }
    if (["roots", "leaning"].includes(l.kind)) {
      const lean = l.kind === "leaning" ? 4.3 : 1.1;
      limb(
        [
          [0, -0.12, 0, 1, 0.86],
          [0.1, 2.0, 0.1, 0.81, 0.72],
          [lean * 0.32, 5.5, 0.4, 0.61, 0.56],
          [lean * 0.81, 9.7, 0.75, 0.43, 0.4],
          [lean, 14, 1, 0.17],
        ],
        12,
      );
      for (let i = 0; i < 6; i++)
        root(i * 1.07, 4.7, 0.85 + (i % 3) * 0.25, 22 + i);
      for (let i = 0; i < 5; i++) {
        const a = i * 2.4;
        limb(
          [
            [lean * 0.8, 9.0 + i * 0.6, 0.7, 0.28],
            [lean + Math.cos(a) * 2.4, 13 + i * 0.4, Math.sin(a) * 2, 0.19],
            [
              lean + Math.cos(a) * 5,
              16 + Math.sin(i) * 0.8,
              Math.sin(a) * 5,
              0.025,
            ],
          ],
          i + 10,
        );
      }
    }
    if (l.kind === "fallen" || l.kind === "bridge" || l.kind === "stump") {
      const stump = l.kind === "stump",
        bridge = l.kind === "bridge",
        n = low ? 12 : 28,
        r = stump ? 1 : bridge ? 0.52 : 0.92,
        rings = low ? 6 : 16,
        pos: number[] = [],
        uv: number[] = [],
        idx: number[] = [];
      // Shared vertices between outside, jagged cambium lip and a genuine interior.
      for (let side = 0; side < 2; side++)
        for (let i = 0; i <= rings; i++)
          for (let k = 0; k <= n; k++) {
            const t = i / rings,
              a = (k / n) * tau,
              wave = 0.16 * Math.sin(a * 5 + 0.4) + 0.1 * Math.sin(a * 9 + 1.7),
              radius =
                (r * (1 - 0.13 * t) +
                  0.055 * Math.sin(a * 5 + t * 3) +
                  0.025 * Math.sin(a * 11)) *
                (side ? 0.7 : 1),
              edge = wave * (stump ? t ** 8 : Math.abs(t - 0.5) ** 6 * 64),
              x = stump ? Math.cos(a) * radius : (t - 0.5) * 8.6 + edge,
              y = stump
                ? 2.5 * t + edge
                : 1 +
                  Math.sin(a) * radius +
                  (bridge
                    ? 0.65 * Math.sin(t * Math.PI)
                    : 0.09 * Math.sin(t * 5)),
              z = stump
                ? Math.sin(a) * radius
                : Math.cos(a) * radius + 0.12 * Math.sin(t * 4);
            pos.push(x, y, z);
            uv.push((k / n) * 2, t * (stump ? 1.1 : 4));
            if (i && k) {
              const q = side * (rings + 1) * (n + 1) + i * (n + 1) + k,
                a = q - n - 2,
                b = q - 1,
                c = q,
                d = q - n - 1;
              idx.push(...(side ? [a, c, b, a, d, c] : [a, b, c, a, c, d]));
            }
          }
      const stride = (rings + 1) * (n + 1);
      for (const i of [0, rings])
        for (let k = 0; k < n; k++) {
          const a = i * (n + 1) + k,
            b = a + 1,
            c = b + stride,
            d = a + stride;
          idx.push(a, b, c, a, c, d);
        }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      wood.push(g);
      if (stump) for (let i = 0; i < 5; i++) root(i * 1.3, 2.7, 0.6, i + 7);
      else {
        for (let i = 0; i < 7; i++) {
          const a = [-2.6, -1.87, -0.78, 0.16, 0.87, 1.53, 2.29][i]!;
          limb(
            [
              [-3.9, 1, 0, 0.2],
              [
                -4.0,
                1 + Math.sin(a) * (1.1 + (i % 3) * 0.21),
                Math.cos(a) * (1.0 + (i % 2) * 0.23),
                0.13,
              ],
              [
                -4.1,
                1 + Math.sin(a) * (1.6 + (i % 3) * 0.23),
                Math.cos(a) * (1.4 + (i % 2) * 0.3),
                0.025,
              ],
            ],
            i,
          );
        }
        limb(
          [
            [0.7, 1, 0.2, 0.27],
            [1.2, 1.7, 0.9, 0.17],
            [1.9, 2.3, 1.4, 0.055],
          ],
          4,
        );
        limb(
          [
            [-1, 1, -0.1, 0.17],
            [-1.5, 1.3, -1, 0.1],
            [-2.3, 0.9, -1.6, 0.025],
          ],
          8,
        );
      }
    }
    if (l.kind === "spring") {
      [
        [1.2, 0, 0.7, 0.85, 0.4],
        [0.7, 0, 1.2, 0.55, 1.8],
        [-1.5, 0, 0.1, 0.4, 2.5],
      ].forEach((p, i) => rocks.push(rockAt(lod, p, l, 43 + i)));
    }
    if (ROCK_LAYOUT[l.id]) {
      ROCK_LAYOUT[l.id]!.forEach((p, i) =>
        rocks.push(rockAt(lod, p, l, i + 3)),
      );
      if (l.kind === "strangler") {
        const stone = new T.Mesh(
          rocks[0],
          new T.MeshBasicMaterial({ side: T.DoubleSide }),
        );
        stone.updateMatrixWorld();
        // Ray-fit descending roots to the actual scan. Offset along hit normal.
        for (let k = 0; k < 7; k++) {
          const pts: number[][] = [];
          for (let j = 0; j < 9; j++) {
            const y = 3.6 - j * 0.39,
              a = k * 0.94 + 0.24 * Math.sin(j * 0.32 + k),
              ray = new T.Raycaster(
                v([Math.cos(a) * 5, y, Math.sin(a) * 5]),
                v([-Math.cos(a), 0, -Math.sin(a)]),
              ),
              hit = ray.intersectObject(stone)[0];
            const p = hit
              ? hit.point.clone().addScaledVector(hit.face!.normal, 0.1)
              : v([Math.cos(a) * 0.8, y, Math.sin(a) * 0.8]);
            pts.push([p.x, p.y, p.z, 0.11 + (1 - j / 9) * 0.065]);
          }
          const end = pts.at(-1)!;
          pts.push([
            end[0]! * 1.35,
            ground(end[0]! * 1.35, end[2]! * 1.35) + 0.04,
            end[2]! * 1.35,
            0.025,
          ]);
          limb(pts, 30 + k);
        }
        limb(
          [
            [0, 2.5, 0, 0.58],
            [0.4, 5.0, 0.2, 0.5],
            [0.2, 9, 0.4, 0.36],
            [-0.8, 14, 0.8, 0.12],
          ],
          8,
        );
        for (let k = 0; k < 5; k++) {
          const a = k * 2.4;
          limb(
            [
              [0.2, 9, 0.4, 0.27],
              [Math.cos(a) * 2, 13, Math.sin(a) * 2, 0.17],
              [Math.cos(a) * 5, 16, Math.sin(a) * 5, 0.025],
            ],
            k,
          );
        }
        stone.material.dispose();
      }
    }
    if (l.kind === "ferns")
      for (let i = 0; i < 5; i++)
        limb(
          [
            [i * 0.65 - 2, 0.1, 2, 0.06],
            [i * 0.65 - 1.5, 0.14, 2.6, 0.05],
            [i * 0.65 - 1, 0.06, 3.4, 0.02],
          ],
          i,
        );
    for (const [kind, parts] of [
      ["wood", wood],
      ["rock", rocks],
    ] as const)
      if (parts.length)
        result.push({
          name: `${l.id}-${kind}-${lod}`,
          site: l.id,
          kind,
          lod,
          geometry: merged(parts, kind),
        });
  }
  return result;
}
