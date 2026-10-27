import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { COAST, edgeDistance, trailDistance, noise } from "./geography";
import { heightAt, slopeAt, isMud } from "./terrain";
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export type Plant = {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  kind: "tree" | "palm" | "mangrove" | "fern" | "pandanus";
  tint: number;
};
export function plantsInChunk(x: number, z: number, low: boolean) {
  const r = random((x + 1600) * 719 + (z + 1600) * 1031),
    out: Plant[] = [];
  const add = (px: number, pz: number, kind: Plant["kind"], scale: number) =>
    out.push({
      x: px,
      y: heightAt(px, pz),
      z: pz,
      scale,
      rotation: r() * Math.PI * 2,
      kind,
      tint: r(),
    });
  for (let j = 0; j < 300; j += low ? 24 : 18)
    for (let i = 0; i < 300; i += low ? 24 : 18) {
      const px = x + i + r() * (low ? 24 : 18),
        pz = z + j + r() * (low ? 24 : 18),
        h = heightAt(px, pz),
        s = slopeAt(px, pz),
        d = edgeDistance(px, pz, COAST),
        td = trailDistance(px, pz);
      if (h < 0.5 || s > 1.1 || td < 4 || h > 240) continue;
      if (isMud(px, pz) && h < 4.8 && d < 65)
        add(px, pz, "mangrove", 0.8 + r() * 0.7);
      else if (d > 23 && d < 110 && h < 7 && r() < 0.65)
        add(px, pz, "palm", 0.8 + r() * 0.6);
      else if (d > 47 && r() > 0.08) add(px, pz, "tree", 0.7 + r() * 0.9);
      else if (d > 27 && h < 9 && r() < 0.5)
        add(px, pz, "pandanus", 0.7 + r() * 0.6);
    }
  // Understory is a separate local detail layer, never a citywide card cloud.
  for (let i = 0; i < (low ? 900 : 2400); i++) {
    const px = x + r() * 300,
      pz = z + r() * 300,
      h = heightAt(px, pz);
    if (
      h > 2 &&
      h < 190 &&
      slopeAt(px, pz) < 0.7 &&
      edgeDistance(px, pz, COAST) > 27 &&
      trailDistance(px, pz) > 2.5
    )
      add(px, pz, "fern", 0.65 + r() * 1.2);
  }
  return out;
}
function merge(parts: T.BufferGeometry[]) {
  const g = mergeGeometries(
    parts.map((p) => {
      if (p.index) p = p.toNonIndexed();
      p.deleteAttribute("uv");
      return p;
    }),
    false,
  )!;
  parts.forEach((p) => p.dispose());
  g.computeVertexNormals();
  return g;
}
function branch(a: T.Vector3, b: T.Vector3, r: number) {
  const d = b.clone().sub(a),
    g = new T.CylinderGeometry(r * 0.45, r, d.length(), 5, 1);
  g.applyQuaternion(
    new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      d.normalize(),
    ),
  );
  g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
  return g;
}
export function plantGeometry(kind: Plant["kind"], detail: boolean) {
  const wood: T.BufferGeometry[] = [],
    leaves: T.BufferGeometry[] = [],
    r = random(kind.length * 123 + (detail ? 1 : 0));
  if (kind === "tree" || kind === "mangrove") {
    const h = kind === "mangrove" ? 5 : 13;
    if (!detail)
      wood.push(
        branch(new T.Vector3(), new T.Vector3(0.6, h * 0.85, 0.2), 0.28),
      );
    if (detail) {
      wood.push(
        branch(
          new T.Vector3(),
          new T.Vector3(0.6, h * 0.75, 0.2),
          kind === "tree" ? 0.48 : 0.25,
        ),
      );
      for (let i = 0; i < 5; i++) {
        const a = i * 2.4,
          ex = Math.cos(a) * 3,
          ez = Math.sin(a) * 3;
        wood.push(
          branch(
            new T.Vector3(0.3, h * 0.4, 0),
            new T.Vector3(ex, h * 0.86, ez),
            0.17,
          ),
        );
        wood.push(
          branch(
            new T.Vector3(0.25, kind === "mangrove" ? 2.4 : 1.2, 0),
            new T.Vector3(
              Math.cos(a) * (kind === "mangrove" ? 2.7 : 1.8),
              0,
              Math.sin(a) * 2,
            ),
            0.14,
          ),
        );
      }
    }
    // Volumetric sprays of original alpha-cutout leaf clusters, rather than solid polygon balls.
    const cards: T.BufferGeometry[] = [];
    const count = detail ? 22 : 9;
    for (let i = 0; i < count; i++) {
      const a = i * 2.399,
        rad = Math.sqrt(r()) * (kind === "mangrove" ? 3 : 4.2);
      const g = new T.PlaneGeometry(
        kind === "mangrove" ? 4.5 : 6.5,
        kind === "mangrove" ? 3.7 : 5.5,
      );
      g.rotateY(a);
      g.rotateX((r() - 0.5) * 1.8);
      g.translate(
        Math.cos(a) * rad,
        h + (r() - 0.5) * (kind === "mangrove" ? 2.4 : 4.6),
        Math.sin(a) * rad,
      );
      cards.push(g);
    }
    const g = mergeGeometries(cards, false)!;
    cards.forEach((c) => c.dispose());
    leaves.push(g);
  } else if (kind === "palm" || kind === "pandanus") {
    const palm = kind === "palm",
      h = palm ? 13 : 2.3;
    if (detail)
      for (let j = 0; j < 5; j++)
        wood.push(
          branch(
            new T.Vector3(j * j * 0.025, (h * j) / 5, 0),
            new T.Vector3((j + 1) ** 2 * 0.025, (h * (j + 1)) / 5, 0),
            palm ? 0.21 : 0.22,
          ),
        );
    const v: number[] = [],
      ix: number[] = [];
    const count = palm ? 11 : 19,
      n = detail ? 10 : 5;
    for (let f = 0; f < count; f++) {
      const a = f * 2.399,
        base = v.length / 3,
        len = palm ? 5.9 : 2.6;
      for (let j = 0; j <= n; j++) {
        const t = j / n,
          rr = t * len,
          y =
            h +
            (palm ? 2 : 1.3) * Math.sin(t * Math.PI * 0.9) -
            (palm ? 2.4 : 1.8) * t * t,
          w = (palm ? 0.75 : 0.34) * Math.sin(Math.PI * t);
        const serr = detail && j % 2 === 0 ? 1 : 0.6;
        for (const side of [-1, 0, 1])
          v.push(
            0.625 +
              Math.cos(a) * rr +
              Math.cos(a + Math.PI / 2) * w * side * serr,
            y + (side === 0 ? 0.1 : 0),
            Math.sin(a) * rr + Math.sin(a + Math.PI / 2) * w * side * serr,
          );
      }
      for (let j = 0; j < n; j++)
        for (let s = 0; s < 2; s++) {
          const b = base + j * 3 + s;
          ix.push(b, b + 3, b + 1, b + 1, b + 3, b + 4);
        }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(v, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    leaves.push(g);
  } else {
    const cards: T.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const g = new T.PlaneGeometry(2.1, 1.8);
      g.translate(0, 0.8, 0);
      g.rotateY((i * Math.PI) / 5);
      cards.push(g);
    }
    const g = mergeGeometries(cards, false)!;
    cards.forEach((g) => g.dispose());
    leaves.push(g);
  }
  return {
    wood: wood.length ? merge(wood) : null,
    leaves:
      kind === "tree" || kind === "mangrove" || kind === "fern"
        ? leaves[0]!
        : merge(leaves),
  };
}
