import * as THREE from 'three';
import { Builder, col, frond, hash3, leaf, limb, M, merge, mk, paintFn, rng, tube, V, type Geo } from './geo';

const up = V(0, 1, 0);

/** Palm in three maturity stages. Trunk and crown are separate so only the trunk blocks the camera. */
export function makePalm(variant: number, lo = false): { trunk: Geo; crown: Geo } {
  const r = rng(100 + variant * 17);
  const H = [3.6, 6.4, 8.6][variant]!, bend = [0.6, 1.5, 2.6][variant]!, r0 = [0.17, 0.22, 0.27][variant]!;
  const dir = V(1, 0, 0.25).normalize();
  const path = (t: number) => V(dir.x * bend * t * t, H * t, dir.z * bend * t * t);
  const tb = new Builder(), light = col('#a9835a'), dark = col('#6d4f33');
  tube(tb, path, t => r0 * (1 - 0.42 * t) + r0 * 0.7 * Math.exp(-t * 14), Math.round(H * (lo ? 1.1 : 3.2)), lo ? 5 : 7,
    (t, k) => (k % 2 ? light : dark).clone().lerp(col('#8b6b45'), t * 0.3));
  const top = path(1).add(V(0, 0.08, 0));
  const cb = new Builder(), n = Math.max(5, Math.round([8, 11, 13][variant]! * (lo ? 0.6 : 1))), Lf = [2.0, 3.2, 3.7][variant]!;
  const greens = [[col('#2f6f2d'), col('#8fc23f')], [col('#276628'), col('#7fb73a')]];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.35;
    const pitch = variant === 0 ? 0.95 - 0.45 * (i % 2) : 0.7 - (i % 3) * 0.42 + (r() - 0.5) * 0.2;
    const g = greens[i % 2]!;
    frond(cb, top, a, pitch, Lf * (0.85 + r() * 0.3), [0.3, 0.6, 0.85][variant]! * (0.7 + r() * 0.6), g[0]!, g[1]!, r, lo ? 7 : 14);
  }
  const extra: Geo[] = [];
  if (variant === 2) {
    for (let i = 0; i < 3; i++) frond(cb, top.clone().add(V(0, -0.2, 0)), i * 2.1 + 0.5, -0.7, 2.4, 0.15, col('#6b4a22'), col('#a68a4b'), r, 10, 0.22, 0.9);
  }
  if (variant > 0 && !lo) {
    for (let i = 0; i < 4; i++) extra.push(mk(new THREE.IcosahedronGeometry(0.17, 0), M(top.x + Math.cos(i * 1.7) * 0.28, top.y - 0.2, top.z + Math.sin(i * 1.7) * 0.28), '#5c7a2a', 0.1, '#7d5a2a', top.y - 0.4, top.y));
  }
  extra.push(mk(new THREE.ConeGeometry(0.34, 0.5, 7, 1, true), M(top.x, top.y - 0.25, top.z), '#5a3f24', 0.15));
  return { trunk: tb.build(), crown: merge([cb.build(), ...extra]) };
}

/** Broadleaf rainforest trees: canopy of leaf cards over dark cores, branching trunks. */
export function makeBroadleaf(variant: number, lo = false): { trunk: Geo; crown: Geo } {
  const r = rng(300 + variant * 31);
  const H = [5.2, 3.4, 6.2][variant]!, tb = new Builder(), cb = new Builder(), parts: Geo[] = [];
  const bark = col('#6a4a30'), bark2 = col('#8a6a48');
  const path = (t: number) => V(Math.sin(t * 3 + variant) * 0.35 * t, H * t, Math.cos(t * 2.4) * 0.25 * t);
  tube(tb, path, t => 0.34 * (1 - t * 0.55) + 0.3 * Math.exp(-t * 9), lo ? 5 : 10, lo ? 5 : 7, (t, k) => bark.clone().lerp(bark2, (k % 3) / 4 + t * 0.2));
  // buttress roots
  for (let i = 0; i < (lo ? 0 : 4); i++) {
    const a = i * 1.57 + r();
    tube(tb, t => V(Math.cos(a) * (0.2 + t * 0.7), 0.5 * (1 - t) * (1 - t) - 0.05, Math.sin(a) * (0.2 + t * 0.7)), t => 0.14 * (1 - t) + 0.03, 4, 5, () => bark);
  }
  const blobs: { c: V3x; R: number }[] = [];
  const nb = variant === 1 ? 5 : 6;
  for (let i = 0; i < nb; i++) {
    const t0 = 0.55 + r() * 0.35, a = (i / nb) * Math.PI * 2 + r(), start = path(t0);
    const reach = (variant === 1 ? 2.8 : 2.0) + r() * 1.1, rise = (variant === 1 ? 0.6 : 1.3) + r() * 1.0;
    const end = start.clone().add(V(Math.cos(a) * reach, rise, Math.sin(a) * reach));
    tube(tb, t => start.clone().lerp(end, t).add(V(0, Math.sin(t * Math.PI) * 0.3, 0)), t => 0.14 * (1 - t) + 0.045, lo ? 2 : 4, lo ? 4 : 5, () => bark);
    blobs.push({ c: end.clone().add(V(0, 0.5, 0)), R: (variant === 1 ? 2.1 : 1.7) + r() * 0.5 });
  }
  const topc = path(1).add(V(0, 1.2, 0));
  blobs.push({ c: topc, R: 2.2 + r() * 0.4 });
  const lows = ['#2f6b2f', '#3c7a30', '#2a5e32'], tips = ['#8cc04a', '#6fae3e', '#a3cf55'];
  for (const { c, R } of blobs) {
    parts.push(mk(new THREE.IcosahedronGeometry(R * 0.74, lo ? 0 : 1), M(c.x, c.y, c.z, r(), r(), r(), 1, 0.72, 1), '#24542a', 0.1));
    for (let k = 0; k < (lo ? 15 : 46); k++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const d = V(s * Math.cos(th), Math.max(u, -0.35), s * Math.sin(th)).normalize();
      const pos = c.clone().add(V(d.x * R, d.y * R * 0.72, d.z * R));
      const tang = V(r() - 0.5, r() * 0.2 - 0.3, r() - 0.5);
      const axis = d.clone().multiplyScalar(0.8).add(tang).normalize();
      const sd = new THREE.Vector3().crossVectors(axis, up).normalize();
      const flower = variant === 2 && r() < 0.22 && d.y > 0.1;
      const c0 = flower ? col('#b8321f') : col(lows[k % 3]!), c1 = flower ? col('#f28a2a') : col(tips[k % 3]!).lerp(col('#2a5e32'), 0.4 - d.y * 0.4);
      leaf(cb, pos, axis, sd, (flower ? 0.7 : 0.9 + r() * 0.6) * (lo ? 1.4 : 1), (flower ? 0.6 : 0.62) * (lo ? 1.3 : 1), c0, c1, V(d.x * 0.5, 0.8 + d.y * 0.3, d.z * 0.5).normalize());
    }
  }
  return { trunk: tb.build(), crown: merge([cb.build(), ...parts]) };
}
type V3x = THREE.Vector3;

/** Leafy bamboo thicket: arching jointed culms with drooping lanceolate leaf sprays. */
export function makeBamboo(lo = false): Geo {
  const r = rng(7), cb = new Builder(), lb = new Builder();
  const nodeA = col('#9fbf4a'), nodeB = col('#6f9632');
  for (let i = 0; i < (lo ? 6 : 10); i++) {
    const a = i * 2.4, rad = 0.1 + 0.55 * Math.sqrt(i / (lo ? 6 : 10)), H = 4.6 + r() * 3.6, lean = 0.35 + r() * 0.7, la = a + (r() - 0.5);
    const base = V(Math.cos(a) * rad, -0.05, Math.sin(a) * rad);
    const path = (t: number) => base.clone().add(V(Math.cos(la) * lean * t * t * H * 0.35, H * t, Math.sin(la) * lean * t * t * H * 0.35));
    const segs = Math.round(H / 0.55);
    tube(cb, path, t => 0.062 * (1 - t * 0.5), segs, lo ? 4 : 6, (_t, k) => (k % 2 ? nodeA : nodeB));
    for (let k = Math.floor(segs * 0.4); k <= segs; k += lo ? 2 : 1) {
      const t = k / segs, p = path(t), cl = 3 + (k % 2);
      for (let j = 0; j < (lo ? 3 : cl + 2); j++) {
        const ang = j * 2.2 + k * 1.3 + r(), outward = V(Math.cos(ang), 0, Math.sin(ang));
        const axis = outward.clone().multiplyScalar(0.85).add(V(0, 0.25 - 0.55 * r(), 0)).normalize();
        const sd = new THREE.Vector3().crossVectors(axis, up).normalize();
        leaf(lb, p, axis, sd, (0.5 + r() * 0.35) * (lo ? 1.3 : 1), 0.085 * (lo ? 1.4 : 1), col('#3f7d2c'), col(j % 2 ? '#a5cf55' : '#8dbb3c'), V(0.2, 1, 0.2).normalize());
      }
    }
  }
  return merge([cb.build(), lb.build()]);
}

/** Neutral-toned (tinted by instance color) leafy shrub. */
export function makeShrub(): Geo {
  const r = rng(11), b = new Builder();
  for (let k = 0; k < 40; k++) {
    const th = r() * Math.PI * 2, el = r() * 1.35, d = V(Math.cos(th) * Math.cos(el), Math.sin(el), Math.sin(th) * Math.cos(el));
    const base = V(d.x * 0.12, 0.05 + d.y * 0.15, d.z * 0.12);
    const axis = d.clone().multiplyScalar(1).add(V(0, 0.25, 0)).normalize();
    leaf(b, base, axis, new THREE.Vector3().crossVectors(axis, up).normalize(), 0.7 + r() * 0.45, 0.34, col('#7f8f6f'), col('#ffffff').multiplyScalar(0.7 + 0.3 * r()), V(d.x * 0.5, 1, d.z * 0.5).normalize());
  }
  return b.build();
}
export function makeBlossoms(): Geo {
  const r = rng(21), b = new Builder();
  for (let k = 0; k < 7; k++) {
    const th = r() * 6.28, el = 0.5 + r() * 0.8, c = V(Math.cos(th) * Math.cos(el) * 0.6, 0.3 + Math.sin(el) * 0.6, Math.sin(th) * Math.cos(el) * 0.6);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * 6.28, e = V(Math.cos(a), 0.2, Math.sin(a));
      leaf(b, c, e.clone().normalize(), V(-Math.sin(a), 0, Math.cos(a)), 0.2, 0.14, col('#ffffff').multiplyScalar(0.8), col('#ffffff'), up);
    }
    b.tri(c, c.clone().add(V(0.02, 0.07, 0)), c.clone().add(V(-0.02, 0.07, 0.01)), col('#f2c230'));
  }
  return b.build();
}
export function makeFern(): Geo {
  const r = rng(5), b = new Builder();
  for (let i = 0; i < 8; i++) {
    frond(b, V(0, 0.05, 0), (i / 8) * 6.28 + r() * 0.3, 0.55 + r() * 0.35, 1.1 + r() * 0.5, 0.65 + r() * 0.3, col('#6f8a5f'), col('#ffffff').multiplyScalar(0.9), r, 6, 0.22, 0.5);
  }
  return b.build();
}
export function makeGrass(): Geo {
  const r = rng(9), b = new Builder();
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.28, d = V(Math.cos(a), 0, Math.sin(a)), s = V(-d.z, 0, d.x), h = 0.45 + r() * 0.5, o = r() * 0.12;
    const p = d.clone().multiplyScalar(o), w = 0.045, bend = 0.1 + r() * 0.3;
    const m = p.clone().addScaledVector(d, bend * 0.4).add(V(0, h * 0.55, 0)), tip = p.clone().addScaledVector(d, bend).add(V(0, h, 0));
    const c0 = col('#6d7d54'), c1 = col('#ffffff').multiplyScalar(0.95);
    b.tri(p.clone().addScaledVector(s, w), p.clone().addScaledVector(s, -w), m.clone().addScaledVector(s, -w * 0.6), c0, c0, c1, up);
    b.tri(p.clone().addScaledVector(s, w), m.clone().addScaledVector(s, -w * 0.6), m.clone().addScaledVector(s, w * 0.6), c0, c1, c1, up);
    b.tri(m.clone().addScaledVector(s, w * 0.6), m.clone().addScaledVector(s, -w * 0.6), tip, c1, c1, c1, up);
  }
  return b.build();
}

export function makeRock(variant: number): Geo {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const sx = [1, 1.3, 0.9][variant]!, sy = [0.65, 0.55, 0.95][variant]!, sz = [0.9, 0.8, 1.1][variant]!;
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 0.82 + hash3(Math.round(x * 100) / 100 + variant, Math.round(y * 100) / 100, Math.round(z * 100) / 100) * 0.4;
    p.setXYZ(i, x * k * sx, Math.max(y * k * sy, -0.3), z * k * sz);
  }
  g.computeVertexNormals();
  g.translate(0, 0.22, 0);
  const base = col('#9a9486'), warm = col('#b4a98f'), moss = col('#5f7f3c'), t = new THREE.Color();
  return paintFn(g, (x, y, z, _nx, ny) => {
    t.copy(base).lerp(warm, 0.5 + 0.5 * Math.sin(y * 7 + hash3(variant, 0, 0) * 6));
    if (ny > 0.5) t.lerp(moss, Math.min(1, (ny - 0.5) * 2.2));
    if (y < -0.05) t.multiplyScalar(0.7);
    return t.multiplyScalar(0.92 + hash3(x, y, z) * 0.16);
  });
}
export { limb };
