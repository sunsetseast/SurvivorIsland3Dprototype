import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { random } from "../vegetation";
import { heightAt, slopeAt } from "../terrain";
import {
  KARSTS,
  inside,
  COAST,
  edgeDistance,
  trailDistance,
  noise,
} from "../geography";
import { inTonsai, cliffFootDistance, rockInterior } from "./domain";
export type Botanical =
  "canopy" | "ficus" | "palm" | "pandanus" | "fern" | "aroid" | "litter";
export type Specimen = {
  ledge?: boolean;
  x: number;
  y: number;
  z: number;
  scale: number;
  turn: number;
  tint: number;
  variant: number;
  kind: Botanical;
};
export const SPECIES: Botanical[] = [
  "canopy",
  "ficus",
  "palm",
  "pandanus",
  "fern",
  "aroid",
  "litter",
];
let highCache: Specimen[] | undefined;
export function tonsaiPlants(low: boolean): Specimen[] {
  if (highCache)
    return low
      ? highCache.filter(
          (p) => Math.abs(Math.sin(p.x * 23.7 + p.z * 17.3)) < 0.73,
        )
      : highCache;
  const r = random(801775),
    out: Specimen[] = [];
  const add = (x: number, z: number, kind: Botanical, scale: number) =>
    out.push({
      x,
      z,
      y: heightAt(x, z),
      kind,
      scale,
      turn: r() * 6.283,
      tint: r(),
      variant: Math.floor(
        r() * (kind === "canopy" ? 4 : kind === "palm" ? 3 : 2),
      ),
    });
  // Stable candidates across quality changes: low mode is a subset, never a
  // different forest that repositions itself around the player.
  for (let z = -1530; z < -350; z += 14)
    for (let x = -1270; x < 45; x += 14) {
      const px = x + r() * 14,
        pz = z + r() * 14,
        h = heightAt(px, pz),
        s = slopeAt(px, pz),
        shore = edgeDistance(px, pz, COAST),
        td = trailDistance(px, pz),
        f = cliffFootDistance(px, pz);
      const accept = r();
      if (
        inside(
          px,
          pz,
          KARSTS.find((k) => k.id === "tonsai-divider")!.outline,
        ) ||
        !inTonsai(px, pz) ||
        h < 1.1 ||
        s > (h > 35 ? 1.65 : 0.8) ||
        td < 5 ||
        shore < 25 ||
        (f < 0 && !rockInterior(px, pz, 22))
      )
        continue;
      const cluster = 0.5 + noise(px * 0.55, pz * 0.55) * 0.22;
      if (accept > cluster) continue;
      if (shore < 70 && h < 8 && f > 7)
        add(px, pz, r() < 0.78 ? "palm" : "pandanus", 0.7 + r() * 0.65);
      else if (shore > 45)
        add(px, pz, r() < 0.21 ? "ficus" : "canopy", 0.72 + r() * 0.9);
    }
  // Understory clusters and leaf litter, with a strictly clear natural route.
  for (let i = 0; i < 19000; i++) {
    const x = -1230 + r() * 1270,
      z = -1490 + r() * 1100,
      choice = r();
    const h = heightAt(x, z),
      td = trailDistance(x, z),
      shore = edgeDistance(x, z, COAST),
      foot = cliffFootDistance(x, z);
    if (
      inside(x, z, KARSTS.find((k) => k.id === "tonsai-divider")!.outline) ||
      !inTonsai(x, z) ||
      h < 2 ||
      h > 195 ||
      slopeAt(x, z) > 0.65 ||
      shore < 29 ||
      td < 2.8 ||
      (foot < 0 && !rockInterior(x, z, 24))
    )
      continue;
    if (noise(x * 0.5, z * 0.5) < -0.55) continue;
    add(
      x,
      z,
      choice < 0.17 ? "aroid" : choice < 0.58 ? "fern" : "litter",
      0.45 + r() * 1.2,
    );
  }
  highCache = out;
  return tonsaiPlants(low);
}
function merged(a: T.BufferGeometry[], uv = false) {
  if (!a.length) return null;
  const parts = a.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    if (!uv) n.deleteAttribute("uv");
    return n;
  });
  const g = mergeGeometries(parts, false)!;
  new Set([...parts, ...a]).forEach((p) => p.dispose());
  return g;
}
function limb(a: T.Vector3, b: T.Vector3, r: number, tip = r * 0.45) {
  const d = b.clone().sub(a),
    g = new T.CylinderGeometry(tip, r, d.length(), 8, 1);
  g.applyQuaternion(
    new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      d.normalize(),
    ),
  );
  g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
  return g;
}
function blade(a: T.Vector3, b: T.Vector3, width: number, bend = 0) {
  const d = b.clone().sub(a),
    side = new T.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(width),
    mid = a.clone().lerp(b, 0.5);
  mid.y += bend;
  const g = new T.BufferGeometry();
  g.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      [
        ...a.toArray(),
        ...mid.clone().add(side).toArray(),
        ...b.toArray(),
        ...mid.clone().sub(side).toArray(),
      ],
      3,
    ),
  );
  g.setAttribute(
    "uv",
    new T.Float32BufferAttribute([0.5, 0, 0, 0.5, 0.5, 1, 1, 0.5], 2),
  );
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
}
/** Different branch topology and crown forms, not merely rotated clones. Each
 * kind/variant is a reusable instanced asset with a matching coarse crown LOD. */
export function tropicalGeometry(
  kind: Botanical,
  variant: number,
  detail: boolean,
) {
  const r = random(800 + variant * 719 + kind.length * 71),
    wood: T.BufferGeometry[] = [],
    leaves: T.BufferGeometry[] = [];
  const v = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  if (kind === "canopy" || kind === "ficus") {
    const ficus = kind === "ficus",
      h = (ficus ? 12 : 17) + variant * 2.2,
      w = (ficus ? 10 : 7) + variant * 0.8;
    const fork = v((r() - 0.5) * 2, h * 0.55, (r() - 0.5) * 2);
    if (detail) {
      for (let seg = 0; seg < 4; seg++) {
        const a = seg / 4,
          b = (seg + 1) / 4;
        const at = (t: number) =>
          fork
            .clone()
            .multiplyScalar(t)
            .add(
              v(
                Math.sin(t * Math.PI) * 0.65,
                0,
                Math.sin(t * Math.PI * 1.4) * 0.4,
              ),
            );
        const base = ficus ? 0.8 : 0.5;
        wood.push(
          limb(at(a), at(b), base * (1 - a * 0.58), base * (1 - b * 0.58)),
        );
      }
      for (let i = 0; i < (ficus ? 7 : 3); i++) {
        const a = i * 2.1 + r() * 0.4,
          dx = Math.cos(a),
          dz = Math.sin(a),
          reach = ficus ? 3.4 : 2.2;
        const g = new T.BufferGeometry();
        g.setAttribute(
          "position",
          new T.Float32BufferAttribute(
            [
              dx * 0.28,
              3.2,
              dz * 0.28,
              dx * reach,
              0.02,
              dz * reach,
              dx * 0.25 + dz * 0.28,
              0.02,
              dz * 0.25 - dx * 0.28,
              dx * 0.25 - dz * 0.28,
              0.02,
              dz * 0.25 + dx * 0.28,
            ],
            3,
          ),
        );
        g.setIndex([0, 1, 2, 0, 3, 1, 0, 2, 3, 1, 3, 2]);
        g.computeVertexNormals();
        wood.push(g);
      }
    }
    const branches = (ficus ? 9 : 6) + variant;
    for (let j = 0; j < branches; j++) {
      const a = j * 2.399 + r() * 0.7,
        rad = w * (0.3 + r() * 0.65),
        end = v(Math.cos(a) * rad, h + (r() - 0.5) * 6, Math.sin(a) * rad);
      if (detail) {
        const elbow = fork.clone().lerp(end, 0.5);
        elbow.y -= 1;
        wood.push(
          limb(fork, elbow, ficus ? 0.28 : 0.18),
          limb(elbow, end, ficus ? 0.17 : 0.11, 0.035),
        );
        if (ficus && j % 3 === 0)
          wood.push(limb(end, end.clone().setY(0.2), 0.045, 0.08));
      }
      const count = detail ? 14 : 3;
      for (let k = 0; k < count; k++) {
        const p = end
          .clone()
          .add(v((r() - 0.5) * 5, (r() - 0.5) * 3.5, (r() - 0.5) * 5));
        const g = new T.PlaneGeometry(detail ? 5.8 : 7.2, detail ? 4.7 : 5.8);
        g.rotateX(-0.4 - r() * 1.5);
        g.rotateY(r() * 6.28);
        g.translate(...p.toArray());
        leaves.push(g);
      }
    }
  } else if (kind === "palm" || kind === "pandanus") {
    const palm = kind === "palm",
      h = palm ? 12 + variant * 3 : 3.2,
      lean = palm ? 1.1 + variant * 0.75 : 0.3;
    const crown = v(lean, h, 0);
    if (detail) {
      for (let i = 0; i < 9; i++)
        wood.push(
          limb(
            v(lean * (i / 9) ** 2, (h * i) / 9, 0),
            v(lean * ((i + 1) / 9) ** 2, (h * (i + 1)) / 9, 0),
            palm ? 0.27 * (1 - i * 0.028) : 0.19,
            palm ? 0.27 * (1 - (i + 1) * 0.028) : 0.19,
          ),
        );
      if (!palm)
        for (let i = 0; i < 5; i++) {
          const a = i * 1.256;
          wood.push(
            limb(
              v(Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4),
              v(0, 1.4, 0),
              0.09,
            ),
          );
        }
    }
    const count = palm ? 13 + variant : 23;
    for (let f = 0; f < count; f++) {
      const a = f * 2.399 + r() * 0.3,
        len = palm ? 5.5 + r() * 1.5 : 2.6 + r(),
        drop = palm ? 3.5 + r() * 2 : 2.2;
      const at = (t: number) =>
        crown
          .clone()
          .add(
            v(
              Math.cos(a) * len * t,
              2.4 * Math.sin(Math.PI * t) - drop * t * t,
              Math.sin(a) * len * t,
            ),
          );
      if (palm) {
        const pairs = detail ? 15 : 7;
        for (let j = 1; j <= pairs; j++) {
          const t = j / (pairs + 1),
            p = at(t);
          for (const s of [-1, 1]) {
            const reach = (0.95 * Math.sin(t * Math.PI) ** 0.6 + 0.07) * s;
            const end = p
              .clone()
              .add(
                v(
                  Math.cos(a + 1.2) * reach + Math.cos(a) * 0.5,
                  -0.25 - Math.abs(reach) * 0.22,
                  Math.sin(a + 1.2) * reach + Math.sin(a) * 0.5,
                ),
              );
            leaves.push(blade(p, end, detail ? 0.075 : 0.12, 0.1));
          }
        }
      } else leaves.push(blade(crown, at(1), 0.18, 0.9));
    }
  } else if (kind === "aroid" || kind === "fern") {
    for (let i = 0; i < (kind === "aroid" ? 7 : detail ? 9 : 5); i++) {
      const a = i * 2.399 + variant,
        len = kind === "aroid" ? 1.6 : 1.4;
      if (kind === "aroid")
        leaves.push(
          blade(
            v(0, 0.12, 0),
            v(Math.cos(a) * len, 1 + r(), Math.sin(a) * len),
            0.39,
            0.4,
          ),
        );
      else
        for (let j = 1; j <= (detail ? 7 : 4); j++) {
          const t = j / (detail ? 7 : 4),
            rr = len * t,
            p = v(
              Math.cos(a) * rr,
              0.3 + Math.sin(t * Math.PI) * 0.7,
              Math.sin(a) * rr,
            );
          for (const s of [-1, 1])
            leaves.push(
              blade(
                p,
                p
                  .clone()
                  .add(
                    v(
                      Math.cos(a + s * 1.1) * 0.43 * (1 - t * 0.7),
                      -0.08,
                      Math.sin(a + s * 1.1) * 0.43 * (1 - t * 0.7),
                    ),
                  ),
                0.08,
              ),
            );
        }
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const a = r() * 6.28,
        p = v((r() - 0.5) * 2, 0.025 + r() * 0.025, (r() - 0.5) * 2);
      leaves.push(
        blade(
          p,
          p.clone().add(v(Math.cos(a) * 0.28, 0.01, Math.sin(a) * 0.28)),
          0.065,
        ),
      );
    }
    if (detail)
      wood.push(limb(v(-0.8, 0.08, 0), v(0.8, 0.12, 0.35), 0.04, 0.018));
  }
  return {
    wood: merged(wood),
    leaves: merged(leaves, kind === "canopy" || kind === "ficus")!,
  };
}
