import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export { rng } from './world';

export type Geo = THREE.BufferGeometry;
export type V3 = THREE.Vector3;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const col = (h: string) => new THREE.Color(h);
export const pick = <T,>(a: T[], r: number) => a[Math.floor(r * a.length) % a.length]!;
const c01 = (n: number) => Math.max(0, Math.min(1, n));
export function hash3(x: number, y: number, z: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function M(px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(px, py, pz), _q, _s.set(sx, sy, sz));
}
export function paintFn(g: Geo, fn: (x: number, y: number, z: number, nx: number, ny: number, nz: number) => THREE.Color): Geo {
  const ng = g.index ? g.toNonIndexed() : g;
  if (ng.attributes.uv) ng.deleteAttribute('uv');
  const p = ng.attributes.position!, n = ng.attributes.normal!;
  const arr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const c = fn(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i));
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  ng.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return ng;
}
export function mk(g: Geo, m: THREE.Matrix4 | null, hex: string, jit = 0.06, top?: string, y0 = 0, y1 = 1): Geo {
  if (m) g.applyMatrix4(m);
  const a = col(hex), b = top ? col(top) : null, t = new THREE.Color();
  return paintFn(g, (x, y, z) => {
    t.copy(a);
    if (b) t.lerp(b, c01((y - y0) / (y1 - y0)));
    return t.multiplyScalar(1 + (hash3(x, y, z) - 0.5) * 2 * jit);
  });
}
export const merge = (parts: Geo[]) => mergeGeometries(parts, false)!;
export const place = (parts: Geo[], m: THREE.Matrix4) => { parts.forEach(g => g.applyMatrix4(m)); return parts; };

/** Cylinder-ish limb between two points, tinted a->b. */
export function limb(a: V3, b: V3, r0: number, r1: number, hex: string, tip?: string, seg = 6, jit = 0.07): Geo {
  const d = b.clone().sub(a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, 1, 1)));
  const c0 = col(hex), c1 = tip ? col(tip) : null, t = new THREE.Color();
  return paintFn(g, (x, y, z) => {
    t.copy(c0);
    if (c1) t.lerp(c1, c01(((x - a.x) * d.x + (y - a.y) * d.y + (z - a.z) * d.z) / (len * len)));
    return t.multiplyScalar(1 + (hash3(x, y, z) - 0.5) * 2 * jit);
  });
}

export class Builder {
  pos: number[] = []; col: number[] = []; nor: number[] = [];
  tri(a: V3, b: V3, c: V3, ca: THREE.Color, cb: THREE.Color = ca, cc: THREE.Color = ca, n?: V3 | [V3, V3, V3]) {
    let N: V3[];
    if (!n) { const f = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize(); N = [f, f, f]; }
    else if (Array.isArray(n)) N = n; else N = [n, n, n];
    const P = [a, b, c], C = [ca, cb, cc];
    for (let i = 0; i < 3; i++) {
      this.pos.push(P[i]!.x, P[i]!.y, P[i]!.z); this.col.push(C[i]!.r, C[i]!.g, C[i]!.b); this.nor.push(N[i]!.x, N[i]!.y, N[i]!.z);
    }
  }
  quad(a: V3, b: V3, c: V3, d: V3, cl: THREE.Color, n?: V3) { this.tri(a, b, c, cl, cl, cl, n); this.tri(a, c, d, cl, cl, cl, n); }
  build(): Geo {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}

export function tube(b: Builder, path: (t: number) => V3, radius: (t: number) => number, segs: number, radial: number,
  color: (t: number, k: number) => THREE.Color, cap = false) {
  const rings: V3[][] = [], dirs: V3[][] = [], cs: THREE.Color[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, P = path(t), T = path(Math.min(1, t + 0.01)).sub(path(Math.max(0, t - 0.01))).normalize();
    const ref = Math.abs(T.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
    const N = new THREE.Vector3().crossVectors(ref, T).normalize(), B = new THREE.Vector3().crossVectors(T, N);
    const r = radius(t), ring: V3[] = [], dr: V3[] = [];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2, d = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      dr.push(d); ring.push(P.clone().addScaledVector(d, r * (1 + (hash3(i, j, 3) - 0.5) * 0.08)));
    }
    rings.push(ring); dirs.push(dr); cs.push(color(t, i));
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const j1 = (j + 1) % radial;
    const a = rings[i]![j]!, bb = rings[i]![j1]!, c = rings[i + 1]![j1]!, d = rings[i + 1]![j]!;
    b.tri(a, c, bb, cs[i]!, cs[i + 1]!, cs[i]!, [dirs[i]![j]!, dirs[i + 1]![j1]!, dirs[i]![j1]!]);
    b.tri(a, d, c, cs[i]!, cs[i + 1]!, cs[i + 1]!, [dirs[i]![j]!, dirs[i + 1]![j]!, dirs[i + 1]![j1]!]);
  }
  if (cap) {
    const tp = path(1), last = rings[segs]!;
    for (let j = 0; j < radial; j++) b.tri(tp, last[(j + 1) % radial]!, last[j]!, cs[segs]!, cs[segs]!, cs[segs]!, V(0, 1, 0));
  }
}

export function leaf(b: Builder, base: V3, axis: V3, side: V3, len: number, wid: number, c0: THREE.Color, c1: THREE.Color, n: V3) {
  const m = base.clone().addScaledVector(axis, len * 0.45), p1 = m.clone().addScaledVector(side, wid / 2), p2 = m.clone().addScaledVector(side, -wid / 2);
  const tip = base.clone().addScaledVector(axis, len), mid = c0.clone().lerp(c1, 0.55);
  b.tri(base, p1, p2, c0, mid, mid, n); b.tri(p1, tip, p2, mid, c1, mid, n);
}

/** Pinnate frond: arching rachis with drooping leaflet pairs. */
export function frond(b: Builder, base: V3, a: number, pitch: number, L: number, droop: number, c0: THREE.Color, c1: THREE.Color,
  r: () => number, N = 14, leafK = 0.3, drop = 0.55) {
  const dh = V(Math.cos(a), 0, Math.sin(a)), side = V(-Math.sin(a), 0, Math.cos(a)), up = V(0, 1, 0);
  const P = (t: number) => base.clone().addScaledVector(dh, L * t * Math.cos(pitch)).add(V(0, L * (Math.sin(pitch) * t - droop * t * t), 0));
  for (let k = 0; k < N; k++) {
    const t0 = k / N, p0 = P(t0), p1 = P((k + 1) / N), w = 0.04 * (1 - t0 * 0.7), cr = c0.clone().lerp(c1, t0);
    b.tri(p0.clone().addScaledVector(side, w), p0.clone().addScaledVector(side, -w), p1, cr, cr, cr, up);
    const t = (k + 0.5) / N, p = P(t), T = P(t + 0.02).sub(P(t - 0.02)).normalize();
    const cl = c0.clone().lerp(c1, t), ct = cl.clone().offsetHSL(0, 0, 0.07);
    for (const s of [-1, 1]) {
      const len = L * leafK * (1 - 0.6 * t) * (0.85 + r() * 0.3);
      const dir = V().addScaledVector(side, s).addScaledVector(T, 0.5).addScaledVector(up, -drop * (0.3 + 0.8 * t)).normalize();
      const tip = p.clone().addScaledVector(dir, len), p2 = p.clone().addScaledVector(T, (L / N) * 1.15);
      b.tri(p, p2, tip, cl, cl, ct, V().addScaledVector(side, s * 0.35).addScaledVector(up, 0.9).normalize());
    }
  }
}
