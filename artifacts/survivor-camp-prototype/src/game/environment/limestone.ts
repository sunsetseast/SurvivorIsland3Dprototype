import * as T from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { baseHeight, noise2, smoothstep } from "../world";
import { CAVE, cliffFaceZ, cliffTopHeight } from "./geography";
/** Authored headland sections. The front's body-height envelope is unchanged;
 * both exposed ends now wrap around eroded buttresses instead of planar caps.
 * These same functions author both offline LODs and their planting contacts. */
export function karstRimHeight(x: number, depth = 0) {
  return (
    cliffTopHeight(x) * (1 - 0.23 * depth) +
    Math.sin(Math.PI * depth) * (13 + 4 * Math.sin(x * 0.14 + depth * 5)) +
    Math.sin(Math.PI * depth * 3) * 3.2
  );
}
export function southernCliffSurface(
  x: number,
  depth: number,
  h: number,
): number[] {
  const high = smoothstep(9, 28, h),
    inward = smoothstep(13, 64, h);
  const shoulder =
    -Math.sign(x) * Math.pow(Math.abs(x) / 42, 1.8) * inward * 14;
  const blocks =
    4.2 * (noise2(x * 0.085 + 3, h * 0.08) - 0.5) +
    2.3 * (noise2(x * 0.24 + 8, h * 0.19) - 0.5);
  const shelves =
    2.4 * Math.exp(-(((h - 24 - x * 0.12) / 4) ** 2)) -
    1.8 * Math.exp(-(((h - 39 + x * 0.15) / 5) ** 2));
  const front =
    cliffFaceZ(x, h) * (1 - high) +
    high *
      (102 +
        blocks +
        shelves +
        inward * 5 +
        2.5 * Math.sin(x * 0.045 + h * 0.1)) +
    Math.min(1, Math.max(0, (h - 2) / 6)) *
      (0.55 * (noise2(x * 0.45, h * 0.31) - 0.5));
  const g = (v: number, centre: number, width: number) =>
    Math.exp(-(((v - centre) / width) ** 2));
  // Broad unequal ribs, then narrow erosion slots. Quiet surfaces separate them.
  const ribs =
    4.8 * g(x, -27 + Math.sin(h * 0.055), 5.5) +
    3.1 * g(x, -8, 3.8) +
    4.4 * g(x, 22 - h * 0.035, 6);
  const slots = 3.6 * g(x, -19 + h * 0.035, 1.35) + 2.3 * g(x, 4, 1.15);
  const frontZ = front + smoothstep(9, 19, h) * (slots - ribs);
  const d = depth,
    wave = Math.sin(Math.PI * d);
  const outer = Math.pow(Math.abs(x) / 42, 3);
  const lobes =
    8.5 * g(d, 0.27, 0.17) + 5.0 * g(d, 0.71, 0.16) - 2.8 * g(d, 0.51, 0.06);
  const undercut = 3.5 * g(h, 5.5, 2.7) + 1.7 * g(h, 19 + d * 5, 2.2);
  // The new western foot begins beyond z=105, outside the walkable beach end.
  const foot = (1 - smoothstep(0, 11, h)) * 3.4 * g(d, 0.7, 0.23);
  const side =
    outer *
    wave *
    (lobes * (1 - 0.36 * inward) -
      undercut +
      foot +
      0.75 * Math.sin(h * 0.43 + d * 7) +
      0.45 * Math.sin(h * 0.91 - d * 15));
  return [
    // The eastern ground-level edge must remain inside the existing x=42
    // collision envelope. Upper overhangs stay well above standing clearance.
    x + shoulder + Math.sign(x) * side * (x > 0 ? smoothstep(4, 12, h) : 1),
    baseHeight(x, 98) + h,
    frontZ +
      (133 + 3 * Math.sin(x * 0.12) - frontZ) * d +
      wave *
        (1.7 * Math.sin(x * 0.26 + h * 0.08) +
          1.1 * Math.sin(d * 13 + h * 0.17)),
  ];
}
export function southernCliffGeometry(low = false) {
  const pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => {
    const n = pos.length / 3;
    for (const p of [a, b, c]) {
      pos.push(...p);
      uv.push((p[0]! + p[2]! * 0.41) * 0.095, p[1]! * 0.1 + p[2]! * 0.035);
    }
    idx.push(n, n + 1, n + 2);
  };
  const floor = baseHeight(11, 104),
    step = low ? 2 : 1;
  const face = (x: number, h: number) => southernCliffSurface(x, 0, h);
  const roof = (x: number) =>
    3 +
    2.5 * Math.pow(Math.max(0, Math.sin(((x - 7) / 8) * Math.PI)), 0.65) +
    0.33 * Math.sin(x * 3.1);
  const columns = [
    ...new Set([
      ...Array.from({ length: Math.ceil(82 / step) + 1 }, (_, i) =>
        Math.min(42, -40 + i * step),
      ),
      7,
      15,
    ]),
  ].sort((a, b) => a - b);
  // Common upper row count means adjacent columns share every edge vertex.
  const rows = low ? 12 : 25;
  for (let i = 0; i < columns.length - 1; i++) {
    const x = columns[i]!,
      xx = columns[i + 1]!;
    const cave = x >= 7 && xx <= 15;
    const lo = cave ? roof(x) : 0,
      loo = cave ? roof(xx) : 0;
    // Preserve metre-sampled interaction surfaces at the lower front.
    const lowerRows = low ? 5 : 8;
    for (let k = 0; k < lowerRows; k++) {
      const t = k / lowerRows,
        u = (k + 1) / lowerRows;
      const a = face(x, lo + (9 - lo) * t),
        b = face(xx, loo + (9 - loo) * t),
        c = face(xx, loo + (9 - loo) * u),
        d = face(x, lo + (9 - lo) * u);
      tri(a, c, b);
      tri(a, d, c);
    }
    for (let k = 0; k < rows; k++) {
      const t = k / rows,
        u = (k + 1) / rows;
      const a = face(x, 9 + (karstRimHeight(x) - 9) * t),
        b = face(xx, 9 + (karstRimHeight(xx) - 9) * t),
        c = face(xx, 9 + (karstRimHeight(xx) - 9) * u),
        d = face(x, 9 + (karstRimHeight(x) - 9) * u);
      tri(a, c, b);
      tri(a, d, c);
    }
  }
  // Fully sampled, fractured end walls. No constant-x cap or fixed back edge.
  const depthSteps = low ? 14 : 20;
  const sideLevels = (x: number, d: number) => [
    -4,
    ...Array.from(
      { length: (low ? 5 : 8) + 1 },
      (_, i) => (9 * i) / (low ? 5 : 8),
    ),
    ...Array.from(
      { length: rows },
      (_, i) => 9 + ((karstRimHeight(x, d) - 9) * (i + 1)) / rows,
    ),
  ];
  for (const x of [-40, 42])
    for (let j = 0; j < depthSteps; j++) {
      const d = j / depthSteps,
        e = (j + 1) / depthSteps;
      const left = sideLevels(x, d),
        right = sideLevels(x, e);
      for (let k = 0; k < left.length - 1; k++) {
        const a = southernCliffSurface(x, d, left[k]!),
          b = southernCliffSurface(x, e, right[k]!),
          c = southernCliffSurface(x, e, right[k + 1]!),
          f = southernCliffSurface(x, d, left[k + 1]!);
        if (x < 0) {
          tri(a, b, c);
          tri(a, c, f);
        } else {
          tri(a, c, b);
          tri(a, f, c);
        }
      }
    }
  // Crown shares its border positions with both end walls; normals face the sky.
  for (let i = 0; i < columns.length - 1; i++)
    for (let j = 0; j < depthSteps; j++) {
      const x = columns[i]!,
        xx = columns[i + 1]!,
        d = j / depthSteps,
        e = (j + 1) / depthSteps;
      const point = (x: number, t: number) =>
        southernCliffSurface(x, t, karstRimHeight(x, t));
      const a = point(x, d),
        b = point(xx, d),
        c = point(xx, e),
        f = point(x, e);
      tri(a, c, b);
      tri(a, f, c);
    }
  // A rear skirt closes the silhouette beyond the unchanged exploration boundary.
  for (let i = 0; i < columns.length - 1; i++)
    for (let k = 0; k < 8; k++) {
      const x = columns[i]!,
        xx = columns[i + 1]!;
      const point = (x: number, t: number) =>
        southernCliffSurface(x, 1, -4 + (karstRimHeight(x, 1) + 4) * t);
      const a = point(x, k / 8),
        b = point(xx, k / 8),
        c = point(xx, (k + 1) / 8),
        d = point(x, (k + 1) / 8);
      tri(a, b, c);
      tri(a, c, d);
    }
  // Noncircular vault controls; all 7.4..14.6 m body positions stay clear below 2.3 m.
  const section = [
    [7, 0],
    [6.96, 1.5],
    [7.03, 2.7],
    [7.6, 3.35],
    [8.15, 4.7],
    [9.65, 5.1],
    [10.2, 5.85],
    [11.2, 5.5],
    [11.9, 4.8],
    [13.2, 5.05],
    [14.15, 4.2],
    [14.95, 2.7],
    [15.04, 1.5],
    [15, 0],
  ];
  const point = (z: number, k: number) => {
    const [x, y] = section[k]!;
    const w = Math.sin(((z - 96) / (111 - 96)) * Math.PI);
    return [
      x! + (y! > 2.3 ? 0.24 * Math.sin(z * 0.91 + k) * w : 0),
      floor + y! + (y! > 2.3 ? 0.42 * Math.sin(z * 1.23 + k * 0.7) * w : 0),
      z,
    ];
  };
  for (let z = 96; z < 111; z += low ? 1.5 : 0.75) {
    const zz = Math.min(111, z + (low ? 1.5 : 0.75));
    for (let k = 0; k < section.length - 1; k++) {
      const a = point(z, k),
        b = point(zz, k),
        c = point(zz, k + 1),
        d = point(z, k + 1);
      tri(a, b, c);
      tri(a, c, d);
    }
  }
  // Fractured back face with shallow recesses; corridor stops before z=110.6.
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 5; j++) {
      const p = (a: number, b: number) => [
        7 + a,
        floor + b * 1.15,
        111 +
          0.2 * (1 + Math.sin(a * 2 + b)) +
          0.15 * Math.sin(a * 0.8 + b * 2),
      ];
      const a = p(i, j),
        b = p(i + 1, j),
        c = p(i + 1, j + 1),
        d = p(i, j + 1);
      tri(a, b, c);
      tri(a, c, d);
    }
  let g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g = mergeVertices(g, 0.0005);
  g.computeVertexNormals();
  const p = g.attributes.position!,
    n = g.attributes.normal!,
    colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      interior = x > 6.8 && x < 15.2 && z > 98 && y < floor + 6.2;
    const c = new T.Color("#d9d4c8").multiplyScalar(
      0.84 + 0.16 * noise2(x * 0.17, y * 0.1 + z * 0.04),
    );
    const stain = Math.max(0, noise2(x * 0.19 + 8, y * 0.12 + z * 0.04) - 0.48);
    c.lerp(new T.Color("#9c7858"), stain * 1.15);
    const damp =
      Math.max(0, 1 - (y - floor) / 2.3) *
      Math.max(0, n.getZ(i)) *
      (noise2(x, z) > 0.5 ? 0.13 : 0);
    c.lerp(new T.Color("#55634a"), damp);
    if (interior)
      c.multiplyScalar(0.53 + 0.32 * Math.max(0, 1 - (z - 98) / 11));
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.computeBoundingSphere();
  return g;
}
