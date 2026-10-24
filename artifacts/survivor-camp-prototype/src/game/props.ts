import * as THREE from 'three';
import { M, V, col, limb, mk, paintFn, pick, rng, type Geo } from './geo';

export const STRAW = ['#d6a954', '#c4963f', '#b78530', '#e0b968', '#a8792d'];
export const WOODS = ['#7a5230', '#6b4423', '#8a6038', '#5a3b1c'];
export const ROPE = '#cdb98a';

/** Layered thatch roof: rows of overlapping straw bundles, ragged eaves, rolled ridge. Ridge runs along z. */
export function thatchRoof(o: { cx: number; cy: number; cz: number; half: number; rise: number; len: number; rows: number; bw: number; seed: number }): Geo[] {
  const r = rng(o.seed), parts: Geo[] = [], slope = Math.hypot(o.half, o.rise), ang = Math.atan2(o.rise, o.half), rowL = slope / o.rows;
  for (const side of [-1, 1]) {
    for (let row = 0; row < o.rows; row++) {
      const s = (row + 0.5) / o.rows;
      const px = o.cx + side * o.half * (1 - s), py = o.cy + o.rise * s;
      for (let z = -o.len / 2 + o.bw / 2; z < o.len / 2; z += o.bw * (0.88 + r() * 0.2)) {
        const L = rowL * (1.9 + r() * 0.6), t = 0.13 + r() * 0.06;
        const hex = pick(STRAW, r());
        const along = (r() - 0.5) * 0.12;
        parts.push(mk(new THREE.BoxGeometry(L, t, o.bw * (0.9 + r() * 0.25)),
          M(px - side * along * Math.cos(ang), py + along * Math.sin(ang) + 0.1, o.cz + z, 0, (r() - 0.5) * 0.12, -side * ang + (r() - 0.5) * 0.07), hex, 0.1, '#f0d28a', py - 0.3, py + 0.3));
        if (row < 2 && r() < 0.8) {
          const ex = px + side * (L / 2) * Math.cos(ang), ey = py - (L / 2) * Math.sin(ang) + 0.05;
          parts.push(mk(new THREE.ConeGeometry(0.05, 0.34 + r() * 0.2, 3), M(ex + side * 0.05, ey - 0.12, o.cz + z + (r() - 0.5) * 0.2, 0, 0, side * 0.2 + (r() - 0.5) * 0.3, 1, -1, 1), '#b88a38', 0.12));
        }
      }
    }
  }
  for (let i = 0; i < 3; i++) {
    parts.push(mk(new THREE.CylinderGeometry(0.2 - i * 0.03, 0.2 - i * 0.03, o.len + 0.5, 7), M(o.cx + (i - 1) * 0.16, o.cy + o.rise + 0.12 - Math.abs(i - 1) * 0.1, o.cz, Math.PI / 2, 0, 0), pick(STRAW, r()), 0.12));
  }
  for (const zz of [-o.len / 2 + 0.6, o.len / 2 - 0.6, 0]) parts.push(mk(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 8), M(o.cx, o.cy + o.rise + 0.16, o.cz + zz, Math.PI / 2, 0, 0), ROPE, 0.06));
  for (const zz of [-o.len / 2 - 0.25, o.len / 2 + 0.25]) for (const s of [-1, 1]) {
    parts.push(limb(V(o.cx, o.cy + o.rise + 0.1, o.cz + zz), V(o.cx + s * 0.6, o.cy + o.rise + 0.95, o.cz + zz + Math.sign(zz) * 0.12), 0.05, 0.03, '#6b4423'));
  }
  return parts;
}

/** Woven mat: checker weave with border stripes. */
export function matGeo(w: number, l: number, hexA: string, hexB: string, edge: string): Geo {
  const g = new THREE.BoxGeometry(w, 0.035, l);
  const a = col(hexA), b = col(hexB), e = col(edge), t = new THREE.Color();
  return paintFn(g, (x, _y, z) => {
    const border = Math.abs(x) > w / 2 - 0.1 || Math.abs(z) > l / 2 - 0.1;
    if (border) return t.copy(e);
    t.copy((Math.floor(x * 9) + Math.floor(z * 9)) % 2 === 0 ? a : b);
    return t.multiplyScalar(Math.abs(Math.sin(z * 2.2)) > 0.9 ? 0.85 : 1);
  });
}
