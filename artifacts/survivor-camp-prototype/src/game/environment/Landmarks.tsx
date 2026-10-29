import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useEffect, useMemo } from "react";
import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { baseHeight, noise2 } from "../world";
import { Builder, V, col, limb, mk, M, tube } from "../geo";
import {
  CAVE,
  NATURAL_LANDMARKS,
  FEATURE_SOLIDS,
  cliffFaceZ,
  cliffTopHeight,
} from "./geography";
import type { Geo } from "../geo";

/** A single authored continuous wall rather than enlarged boulder analogues.
 * Water erosion undercuts the first storey; fluted vertical faces carry the mass.
 * The entrance is a true hole with an interior vault, side walls and a back. */
export function southernCliffGeometry(low = false) {
  const pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => {
    const n = pos.length / 3;
    for (const p of [a, b, c]) {
      pos.push(...p);
      uv.push((p[0]! + p[2]! * 0.73) * 0.12, p[1]! * 0.12 + p[2]! * 0.09);
    }
    idx.push(n, n + 1, n + 2);
  };
  const v = (x: number, y: number) => [
    x -
      Math.sign(x - 1) *
        Math.pow(Math.abs(x - 1) / 41, 4) *
        (2 + y * 0.07 + 2 * Math.sin(y * 0.16) + 1.5 * Math.sin(y * 0.43)) *
        Math.min(1, y / 8),
    baseHeight(x, 98) + y,
    cliffFaceZ(x, y) + (y > 5 ? (noise2(x * 0.14, y * 0.18) - 0.5) * 1.3 : 0),
  ];
  const step = low ? 2 : 1;
  const columns = [
    ...new Set([
      ...Array.from({ length: Math.ceil(82 / step) + 1 }, (_, i) =>
        Math.min(42, -40 + i * step),
      ),
      CAVE.minX,
      CAVE.maxX,
    ]),
  ].sort((a, b) => a - b);
  for (let ix = 0; ix < columns.length - 1; ix++)
    for (let y = 0; y < 76; y += step) {
      const x = columns[ix]!,
        nextX = columns[ix + 1]!;
      if (x >= CAVE.minX && x < CAVE.maxX && y < CAVE.height) continue;
      const top = cliffTopHeight(x);
      if (y >= top) continue;
      const a = v(x, y),
        b = v(nextX, y),
        c = v(nextX, Math.min(y + step, top)),
        d = v(x, Math.min(y + step, top));
      tri(a, c, b);
      tri(a, d, c);
    }
  // Solid return sides and upper mass join the jungle ridge behind the face.
  for (const x of [-40, 42])
    for (let y = 0; y < 72; y += 3) {
      const a = v(x, y),
        b = v(x, y + 3),
        c = [b[0]!, b[1]!, 127],
        d = [a[0]!, a[1]!, 127];
      tri(a, b, c);
      tri(a, c, d);
    }
  for (let x = -40; x < 42; x += step) {
    const a = v(x, cliffTopHeight(x)),
      b = v(x + step, cliffTopHeight(x + step)),
      c = [b[0]!, b[1]!, 127],
      d = [a[0]!, a[1]!, 127];
    tri(a, b, c);
    tri(a, c, d);
  }
  // Cavern sides are vertical at the player's height, roof is an actual vault.
  const floor = baseHeight(11, 104);
  for (let z = CAVE.mouthZ; z < CAVE.backZ; z++)
    for (let j = 0; j < 18; j++) {
      const point = (zz: number, k: number) => {
        const a = (k / 18) * Math.PI,
          ripple = 0.12 * Math.sin(zz * 1.7 + k * 0.8);
        return [
          11 + (4 + ripple) * Math.cos(a),
          floor + 1.5 + (4.2 + ripple) * Math.sin(a),
          zz,
        ];
      };
      const a = point(z, j),
        b = point(z + 1, j),
        c = point(z + 1, j + 1),
        d = point(z, j + 1);
      tri(a, b, c);
      tri(a, c, d);
    }
  for (const x of [7, 15]) {
    tri([x, floor - 0.4, 97], [x, floor + 1.5, 97], [x, floor + 1.5, 111]);
    tri([x, floor - 0.4, 97], [x, floor + 1.5, 111], [x, floor - 0.4, 111]);
  }
  tri([7, floor - 0.3, 111], [15, floor - 0.3, 111], [15, floor + 5.7, 111]);
  tri([7, floor - 0.3, 111], [15, floor + 5.7, 111], [7, floor + 5.7, 111]);
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const colors: number[] = [];
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i]!,
      y = pos[i + 1]!,
      z = pos[i + 2]!,
      streak = 0.88 + 0.12 * noise2(x * 0.45, y * 0.018),
      moss = Math.max(0, Math.min(1, (y - 52) / 20));
    const c = new T.Color("#e1d9c7").multiplyScalar(streak);
    c.lerp(new T.Color("#566343"), moss * 0.65);
    if (z > 99 && y < floor + 6) c.multiplyScalar(0.6);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.computeBoundingSphere();
  return g;
}
function merge(parts: Geo[]) {
  const g = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return g;
}
function landmarkGeometry() {
  const wood: Geo[] = [],
    rocks: Geo[] = [];
  for (const l of NATURAL_LANDMARKS) {
    const y = baseHeight(l.x, l.z),
      at = (x: number, h: number, z: number) => V(l.x + x, y + h, l.z + z);
    const branch = (a: number[], b: number[], r0: number, r1: number) =>
      wood.push(
        limb(
          at(a[0]!, a[1]!, a[2]!),
          at(b[0]!, b[1]!, b[2]!),
          r0,
          r1,
          "#66513b",
          "#857258",
          12,
        ),
      );
    const root = (a: number, len: number, h: number) => {
      const b = new Builder();
      tube(
        b,
        (t) =>
          at(
            Math.cos(a) * len * t,
            h * (1 - t) ** 2 + 0.06,
            Math.sin(a) * len * t,
          ),
        (t) => 0.35 * (1 - t) + 0.04,
        14,
        7,
        () => col("#6a5940"),
      );
      wood.push(b.build());
    };
    if (l.kind === "buttress") {
      const trunk = new T.CylinderGeometry(0.9, 1.9, 27, 32, 36, true),
        tp = trunk.attributes.position;
      for (let i = 0; i < tp.count; i++) {
        const x = tp.getX(i),
          yy = tp.getY(i) + 13.5,
          z = tp.getZ(i),
          a = Math.atan2(z, x),
          f = 1 + 0.1 * Math.cos(a * 9) + 0.04 * Math.sin(yy * 3 + a * 5);
        tp.setXYZ(
          i,
          l.x + x * f + Math.sin(yy * 0.15) * 0.4,
          y + yy,
          l.z + z * f + Math.sin(yy * 0.1) * 0.35,
        );
      }
      trunk.computeVertexNormals();
      wood.push(mk(trunk, null, "#a18b65", 0.12));
      for (let k = 0; k < 9; k++) {
        const a = (k * 6.283) / 9 + 0.2;
        root(a, 4.8, 2.1);
        const d = V(Math.cos(a), 0, Math.sin(a)),
          n = V(-d.z, 0, d.x),
          bb = new Builder(),
          c = col("#9c8662");
        const q = (r: number, h: number, w: number) =>
          at(d.x * r + n.x * w, h, d.z * r + n.z * w);
        const a0 = q(1.45, 0.1, -0.4),
          a1 = q(1.45, 0.1, 0.4),
          b0 = q(1.45, 3.3, -0.12),
          b1 = q(1.45, 3.3, 0.12),
          c0 = q(4.8, 0.08, -0.16),
          c1 = q(4.8, 0.08, 0.16);
        bb.tri(a0, b0, c0, c);
        bb.tri(a1, c1, b1, c);
        bb.quad(b0, b1, c1, c0, c);
        bb.quad(a0, a1, b1, b0, c);
        bb.quad(a0, c0, c1, a1, c);
        wood.push(bb.build());
      }
      for (let k = 0; k < 7; k++) {
        const a = k * 2.4;
        branch(
          [0, 16 + k, 0],
          [Math.cos(a) * 9, 26 + k * 0.5, Math.sin(a) * 9],
          0.75,
          0.18,
        );
      }
    }
    if (l.kind === "roots" || l.kind === "strangler" || l.kind === "leaning") {
      const lean = l.kind === "leaning" ? 5 : 0;
      branch([0, 0, 0], [lean, 12, 1], l.kind === "strangler" ? 0.6 : 1, 0.4);
      for (let k = 0; k < 6; k++) {
        root(k * 1.07, 4.8, 1.5);
        branch(
          [lean, 9, 1],
          [lean + Math.cos(k * 2.4) * 5, 16, Math.sin(k * 2.4) * 5],
          0.34,
          0.08,
        );
      }
      if (l.kind === "strangler")
        for (let k = 0; k < 5; k++)
          branch([Math.cos(k) * 2, 0, Math.sin(k) * 2], [0, 6, 0], 0.2, 0.12);
    }
    if (l.kind === "fallen") {
      // Two nested open tubes and rim rings: actual hollow ends, no dark decal.
      for (const [radius, color] of [
        [0.92, "#68513a"],
        [0.68, "#382c21"],
      ] as const) {
        const g = new T.CylinderGeometry(
          radius,
          radius * 0.94,
          8.6,
          18,
          9,
          true,
        );
        g.rotateZ(Math.PI / 2);
        g.translate(l.x, y + 1, l.z);
        wood.push(mk(g, null, color, 0.12));
      }
      for (const side of [-1, 1]) {
        const ring = new T.TorusGeometry(0.8, 0.12, 6, 18);
        ring.rotateY(Math.PI / 2);
        ring.translate(l.x + side * 4.3, y + 1, l.z);
        wood.push(mk(ring, null, "#9b815a"));
      }
      for (let k = 0; k < 8; k++) {
        const a = k * 0.79;
        branch(
          [-3.8, 1, 0],
          [-4.2, 1 + Math.sin(a) * 2.5, Math.cos(a) * 2],
          0.25,
          0.06,
        );
      }
      branch([1, 0.9, 0], [2, 2.7, 2], 0.35, 0.1);
    }
    if (l.kind === "bridge") {
      // A slim bowed, stripped trunk spans a shallow wash; distinct from the
      // straight, massive storm-fallen giant and its upturned root plate.
      for (const radius of [0.55, 0.36]) {
        const b = new Builder();
        tube(
          b,
          (t) =>
            at(
              (t - 0.5) * 8.6,
              1 + 0.65 * Math.sin(t * Math.PI),
              0.18 * Math.sin(t * 4),
            ),
          () => radius,
          22,
          14,
          () => col(radius > 0.4 ? "#a28f6c" : "#4b4030"),
        );
        wood.push(b.build());
      }
      for (const side of [-1, 1]) {
        const g = new T.TorusGeometry(0.455, 0.095, 6, 14);
        g.rotateY(Math.PI / 2);
        g.translate(
          l.x + side * 4.3,
          y + 1,
          l.z + 0.18 * Math.sin(side > 0 ? 4 : 0),
        );
        wood.push(mk(g, null, "#b7a580"));
      }
      branch([-2, 1.5, 0], [-2.8, 1.1, 1.2], 0.13, 0.025);
      branch([2, 1.5, 0], [2.4, 1.2, -1], 0.1, 0.025);
    }
    if (l.kind === "stump") {
      for (const [r, c] of [
        [1, "#736048"],
        [0.69, "#352d23"],
      ] as const) {
        const g = new T.CylinderGeometry(r * 0.9, r, 2.5, 19, 6, true);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++)
          if (p.getY(i) > 1)
            p.setY(
              i,
              p.getY(i) + 0.3 * Math.sin(p.getX(i) * 7 + p.getZ(i) * 4),
            );
        g.computeVertexNormals();
        g.translate(l.x, y + 1.2, l.z);
        wood.push(mk(g, null, c, 0.12));
      }
      for (let k = 0; k < 5; k++) root(k * 1.3, 2.7, 0.7);
    }
    if (l.kind === "ferns") {
      for (let k = 0; k < 5; k++)
        branch([k * 0.65 - 2, 0.1, 2], [k * 0.65 - 1, 0.12, 3.4], 0.07, 0.03);
    }
    if (l.kind === "overhang") {
      // Thin roof fingers join the monolithic undercut; walking space stays open.
      for (let k = 0; k < 5; k++)
        rocks.push(
          mk(
            new T.ConeGeometry(0.15 + k * 0.04, 1.4 + k * 0.3, 9),
            M(l.x - 4 + k * 1.6, y + 5.9, l.z + 1, Math.PI, 0, 0),
            "#b8ad95",
          ),
        );
    }
  }
  // Boulders follow their exact conservative collision footprints. Corners are
  // bevelled inward, avoiding huge invisible cushions or decorative rock holes.
  for (const c of FEATURE_SOLIDS.filter((c) =>
    /moss-gates|strangler-stone|quiet-alcove/.test(c.kind),
  )) {
    const h = c.kind.includes("moss")
      ? 6
      : c.kind.includes("strangler")
        ? 4.4
        : 5;
    const g = new RoundedBoxGeometry(c.hx * 2, h, c.hz * 2, 4, 0.65),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        yy = p.getY(i),
        z = p.getZ(i),
        f = 0.82 + 0.16 * noise2(x * 1.4 + c.x, z * 1.7 + yy);
      p.setXYZ(i, x * f, yy + 0.12 * Math.sin(x * 2 + z), z * f);
    }
    g.computeVertexNormals();
    g.translate(c.x, baseHeight(c.x, c.z) + h / 2 - 0.15, c.z);
    rocks.push(
      mk(
        g,
        null,
        "#918f76",
        0.14,
        "#536b40",
        baseHeight(c.x, c.z),
        baseHeight(c.x, c.z) + h,
      ),
    );
  }
  const result = { wood: merge(wood), rocks: merge(rocks) };
  for (const [kind, g] of Object.entries(result)) {
    const p = g.attributes.position!,
      uv = [];
    for (let i = 0; i < p.count; i++)
      uv.push(
        (p.getX(i) + p.getZ(i) * 0.71) * (kind === "wood" ? 0.45 : 0.17),
        p.getY(i) * (kind === "wood" ? 0.35 : 0.17) + p.getZ(i) * 0.13,
      );
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  }
  return result;
}
export function NaturalLandmarks({
  low,
  rockMaterial,
  barkMaterial,
}: {
  low: boolean;
  rockMaterial?: T.Material | T.Material[];
  barkMaterial?: T.Material | T.Material[];
}) {
  const cliff = useMemo(() => southernCliffGeometry(low), [low]),
    geos = useMemo(landmarkGeometry, []);
  const bark = useMemo(() => {
    const source = Array.isArray(barkMaterial) ? barkMaterial[0] : barkMaterial;
    const m = (source?.clone() ??
      new T.MeshStandardMaterial()) as T.MeshStandardMaterial;
    m.vertexColors = true;
    m.roughness = 1;
    m.side = T.DoubleSide;
    m.color.set("#c2af87");
    m.emissive.set("#514431");
    m.emissiveIntensity = 0.18;
    return m;
  }, [barkMaterial]);
  const rock = useMemo(() => {
    const base = (
      Array.isArray(rockMaterial) ? rockMaterial[0] : rockMaterial
    )?.clone() as T.MeshStandardMaterial | undefined;
    const m = base ?? new T.MeshStandardMaterial({ roughness: 0.95 });
    m.vertexColors = true;
    m.side = T.DoubleSide;
    const source = Array.isArray(rockMaterial) ? rockMaterial[0] : rockMaterial;
    if (source) {
      m.onBeforeCompile = source.onBeforeCompile;
      m.customProgramCacheKey = source.customProgramCacheKey;
    }
    return m;
  }, [rockMaterial]);
  useEffect(
    () => () => {
      cliff.dispose();
    },
    [cliff],
  );
  useEffect(
    () => () => {
      geos.wood.dispose();
      geos.rocks.dispose();
    },
    [geos],
  );
  useEffect(() => () => rock.dispose(), [rock]);
  useEffect(() => () => bark.dispose(), [bark]);
  return (
    <group name="tonsai-authored-landmarks">
      <mesh
        name="southern-continuous-limestone"
        geometry={cliff}
        material={rock}
        receiveShadow
        castShadow={!low}
        userData={{ cameraBlocker: true }}
      />
      <mesh
        name="signature-root-and-hollow-wood"
        geometry={geos.wood}
        material={bark}
        castShadow
        receiveShadow
        userData={{ cameraBlocker: true }}
      />
      <mesh
        name="signature-moss-gates-and-alcove"
        geometry={geos.rocks}
        material={rock}
        castShadow
        receiveShadow
        userData={{ cameraBlocker: true }}
      />
    </group>
  );
}
