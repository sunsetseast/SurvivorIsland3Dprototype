import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Builder, M, V, col, limb, merge, mk, paintFn, pick, rng, tube, type Geo } from './geo';
import { ROPE, STRAW, WOODS, thatchRoof } from './props';
import { LANDMARKS, PROPS, SEATING_LOGS, baseHeight, groundHeight } from './world';

const gh = groundHeight;
const solidMat = () => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
function Static({ geo, blocker, cast = true }: { geo: Geo; blocker?: boolean; cast?: boolean }) {
  const m = useMemo(solidMat, []);
  return <mesh geometry={geo} material={m} castShadow={cast} receiveShadow userData={blocker ? { cameraBlocker: true } : undefined} />;
}
const GREYS = ['#8d877a', '#9c9484', '#7a7468', '#a9a08c'];
const stone = (x: number, y: number, z: number, s: number, r: () => number) =>
  mk(new THREE.IcosahedronGeometry(1, 1), M(x, y, z, r(), r() * 6, r(), s * 1.15, s * 0.7, s), pick(GREYS, r()), 0.1, '#cfc6b0', y - s * 0.7, y + s * 0.7);

/* ---------------- Fire ---------------- */
function flameGeo(w: number, h: number, bend: number, seed: number) {
  const b = new Builder(), r = rng(seed), segs = 7;
  const cs = [col('#d93a12'), col('#f2701c'), col('#ffb02e'), col('#ffe27a'), col('#fff3b8')];
  const pts: [V3b, V3b][] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, ww = w * Math.pow(1 - t, 0.75) * (0.7 + 0.3 * Math.sin(t * 3)), cx = bend * t * t + (r() - 0.5) * 0.04;
    pts.push([V(cx - ww, h * t, 0), V(cx + ww, h * t, 0)]);
  }
  for (let i = 0; i < segs; i++) {
    const ca = cs[Math.min(4, Math.floor((i / segs) * 5))]!, cb = cs[Math.min(4, Math.floor(((i + 1) / segs) * 5))]!;
    b.tri(pts[i]![0], pts[i]![1], pts[i + 1]![1], ca, ca, cb, V(0, 0, 1)); b.tri(pts[i]![0], pts[i + 1]![1], pts[i + 1]![0], ca, cb, cb, V(0, 0, 1));
  }
  return b.build();
}
type V3b = THREE.Vector3;

export function Fire() {
  const { x, z } = LANDMARKS.campfire, y = gh(x, z);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const glow = useRef<THREE.Mesh>(null);
  const sparks = useRef<THREE.Points>(null);
  const { base, flames, embers, sparkGeo, glowTex, spit } = useMemo(() => {
    const r = rng(5), parts: Geo[] = [];
    parts.push(mk(new THREE.CylinderGeometry(1.0, 1.1, 0.05, 10), M(0, 0.02, 0), '#2b2420', 0.15));
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * Math.PI * 2 + (r() - 0.5) * 0.2, rad = 0.98 + (r() - 0.5) * 0.14;
      parts.push(stone(Math.cos(a) * rad, 0.12, Math.sin(a) * rad, 0.17 + r() * 0.13, r));
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3, len = 0.9 + r() * 0.4;
      parts.push(limb(V(Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62), V(Math.cos(a) * 0.1, 0.1 + len * 0.8, Math.sin(a) * 0.1), 0.11, 0.07, '#5a3a20', '#17110d'));
    }
    parts.push(limb(V(-0.7, 0.12, 0.2), V(0.5, 0.14, -0.3), 0.09, 0.08, '#3a2616', '#1a1210'));
    parts.push(limb(V(0.6, 0.12, 0.35), V(-0.4, 0.14, 0.5), 0.08, 0.07, '#4a2e1a', '#1a1210'));
    const em: Geo[] = [];
    for (let i = 0; i < 8; i++) em.push(mk(new THREE.IcosahedronGeometry(0.06 + r() * 0.04, 0), M((r() - 0.5) * 0.9, 0.14 + r() * 0.1, (r() - 0.5) * 0.9), '#ff7a2a', 0.2));
    const fl = [
      merge([flameGeo(0.26, 1.15, 0.12, 1), flameGeo(0.2, 0.9, -0.1, 2)].map((g, i) => (g.applyMatrix4(M(i ? 0.18 : -0.15, 0.1, i ? 0.1 : -0.08, 0, i * 1.9, 0)), g))),
      merge([flameGeo(0.22, 0.85, -0.08, 3), flameGeo(0.2, 1.0, 0.1, 4)].map((g, i) => (g.applyMatrix4(M(i ? -0.05 : 0.1, 0.1, i ? 0.17 : -0.12, 0, 1.2 + i * 1.5, 0)), g))),
      merge([flameGeo(0.14, 0.75, 0.05, 5).applyMatrix4(M(0, 0.12, 0, 0, 0.7, 0))]),
    ];
    const sp = new THREE.BufferGeometry();
    sp.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 3), 3));
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,170,70,0.75)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    // cooking spit
    const sp2: Geo[] = [];
    for (const p of PROPS.spit) {
      const dx = p.x - x, dz = p.z - z;
      sp2.push(limb(V(dx, gh(p.x, p.z) - y, dz), V(dx, 1.45, dz), 0.05, 0.04, '#5a3b1c'));
      sp2.push(limb(V(dx, 1.3, dz), V(dx * 0.75 + (dx > 0 ? -0.2 : 0.2), 1.62, dz), 0.025, 0.02, '#5a3b1c'));
    }
    sp2.push(limb(V(PROPS.spit[0]!.x - x, 1.42, 0), V(PROPS.spit[1]!.x - x, 1.42, 0), 0.04, 0.04, '#4a2e1a'));
    sp2.push(mk(new THREE.CylinderGeometry(0.32, 0.26, 0.34, 10), M(0, 0.98, 0), '#2a2624', 0.1, '#4a4440', 0.8, 1.15));
    sp2.push(mk(new THREE.TorusGeometry(0.32, 0.03, 4, 12), M(0, 1.15, 0, Math.PI / 2, 0, 0), '#1e1b1a', 0.05));
    sp2.push(limb(V(0, 1.42, 0), V(0, 1.15, 0), 0.012, 0.012, '#2a2624'));
    return { base: merge(parts), flames: fl, embers: merge(em), sparkGeo: sp, glowTex: new THREE.CanvasTexture(c), spit: merge(sp2) };
  }, [x, y, z]);
  useEffect(() => () => { sparkGeo.dispose(); }, [sparkGeo]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    groups.current.forEach((f, i) => {
      if (!f) return;
      const s = 1 + Math.sin(t * (8 + i * 3) + i * 2) * 0.16 + Math.sin(t * (13 + i * 5)) * 0.08;
      f.scale.set(1 - (s - 1) * 0.5, s, 1 - (s - 1) * 0.5);
      f.rotation.y = t * (0.8 + i * 0.7);
      f.rotation.z = Math.sin(t * (5 + i)) * 0.07;
    });
    const k = 14 + Math.sin(t * 17) * 3 + Math.sin(t * 29) * 2;
    if (light.current) light.current.intensity = k;
    if (glow.current) (glow.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + (k - 14) * 0.03;
    const pa = sparkGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < 16; i++) {
      const ph = (t * 0.45 + i / 16) % 1, a = i * 2.4;
      pa.setXYZ(i, Math.cos(a) * 0.25 * ph + Math.sin(t + i) * 0.15 * ph, 0.8 + ph * 2.2, Math.sin(a) * 0.25 * ph);
    }
    pa.needsUpdate = true;
    void sparks;
  });
  return (
    <group position={[x, y, z]}>
      <Static geo={base} />
      <Static geo={spit} />
      <mesh geometry={embers}><meshBasicMaterial vertexColors /></mesh>
      {flames.map((g, i) => (
        <group key={i} ref={el => { groups.current[i] = el; }} position={[0, 0.1, 0]}>
          <mesh geometry={g}><meshBasicMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.92} depthWrite={false} /></mesh>
        </group>
      ))}
      <points ref={sparks} geometry={sparkGeo} frustumCulled={false}><pointsMaterial color="#ffb347" size={0.07} sizeAttenuation transparent opacity={0.9} depthWrite={false} /></points>
      <mesh ref={glow} rotation-x={-Math.PI / 2} position={[0, 0.07, 0]} renderOrder={3}>
        <planeGeometry args={[9, 9]} /><meshBasicMaterial map={glowTex} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight ref={light} position={[0, 1.3, 0]} color="#ff9a4a" distance={18} decay={2} />
    </group>
  );
}

/* ---------------- Seating logs ---------------- */
export function Logs() {
  const geo = useMemo(() => {
    const parts: Geo[] = [], r = rng(31);
    for (const l of SEATING_LOGS) {
      const b = new Builder(), gy = gh(l.x, l.z), half = l.len / 2, c = Math.cos(l.yaw), s = Math.sin(l.yaw);
      const bark = col('#6d4a2c'), bark2 = col('#52371f');
      tube(b, t => V(l.x + c * (t * l.len - half), gy + 0.4, l.z - s * (t * l.len - half)), t => 0.4 + 0.04 * Math.sin(t * 9) + (t < 0.05 || t > 0.95 ? -0.03 : 0), 10, 9, (_t, k) => (k % 2 ? bark : bark2));
      parts.push(b.build());
      for (const e of [-1, 1]) {
        const cap = new THREE.CylinderGeometry(0.37, 0.37, 0.03, 12);
        cap.applyMatrix4(M(0, 0, 0, 0, 0, Math.PI / 2));
        cap.applyMatrix4(M(l.x + c * e * half, gy + 0.4, l.z - s * e * half, 0, l.yaw, 0));
        parts.push(paintFn(cap, (x, y, z) => col(Math.floor(Math.hypot(y - gy - 0.4, (x - l.x - c * e * half) * s + (z - l.z + s * e * half) * c) * 14) % 2 ? '#c99a5d' : '#a87a42')));
      }
      parts.push(mk(new THREE.BoxGeometry(0.6, 0.06, 0.2), M(l.x + (r() - 0.5), gy + 0.04, l.z + (r() - 0.5), 0, r(), 0), '#3a2a1a', 0.1));
    }
    return merge(parts);
  }, []);
  return <Static geo={geo} blocker />;
}

/* ---------------- Camp props: crates, baskets, rack, barrel ---------------- */
export function CampProps() {
  const { solid, cloth } = useMemo(() => {
    const r = rng(41), s: Geo[] = [], c: Geo[] = [];
    const cr = PROPS.crates, cy = gh(cr.x, cr.z);
    for (let k = 0; k < 3; k++) s.push(mk(new THREE.BoxGeometry(1.05, 0.2, 0.95), M(cr.x, cy + 0.12 + k * 0.22, cr.z, 0, (r() - 0.5) * 0.12, 0), pick(['#8a5a2f', '#7b4f2a', '#9a6a3a'], r()), 0.1));
    for (const [dx, dz] of [[-0.48, -0.43], [0.48, -0.43], [-0.48, 0.43], [0.48, 0.43]]) s.push(limb(V(cr.x + dx!, cy, cr.z + dz!), V(cr.x + dx!, cy + 0.72, cr.z + dz!), 0.05, 0.05, '#5a3b1c'));
    s.push(mk(new THREE.BoxGeometry(0.8, 0.5, 0.7), M(cr.x + 0.1, cy + 0.98, cr.z, 0, 0.3, 0), '#a8814b', 0.12, '#c9a463', cy + 0.7, cy + 1.2));
    // baskets
    const bk = (x: number, z: number, h: number, w: number, a: string, b: string) => {
      const y = gh(x, z), g = new THREE.CylinderGeometry(w, w * 0.7, h, 14, 3, true);
      g.applyMatrix4(M(x, y + h / 2, z));
      s.push(paintFn(g, (px, py, pz) => col(Math.sin(Math.atan2(pz - z, px - x) * 12) * Math.sin((py - y) * 22) > 0 ? a : b)));
      s.push(mk(new THREE.TorusGeometry(w, 0.025, 4, 14), M(x, y + h, z, Math.PI / 2, 0, 0), '#6b4423', 0.05));
      s.push(mk(new THREE.CylinderGeometry(w * 0.95, w * 0.95, 0.02, 12), M(x, y + h * 0.7, z), '#3a2a1a', 0.1));
    };
    bk(PROPS.basket.x, PROPS.basket.z, 0.6, 0.38, '#c9a463', '#a07838');
    bk(PROPS.basket.x + 0.9, PROPS.basket.z + 0.5, 0.42, 0.3, '#b8803f', '#8a5a2f');
    bk(PROPS.basket.x - 0.7, PROPS.basket.z + 0.7, 0.34, 0.26, '#d8b878', '#b08848');
    // clay jugs
    for (const [x, z, k] of [[-8, -37.7, 0], [-7.3, -38.1, 1], [-12.3, -34.6, 0]] as const) {
      const y = gh(x, z);
      s.push(mk(new THREE.SphereGeometry(0.26, 10, 8), M(x, y + 0.3, z, 0, 0, 0, 1, 1.1, 1), k ? '#b86a3c' : '#a85a30', 0.1, '#d88a52', y, y + 0.6));
      s.push(mk(new THREE.CylinderGeometry(0.1, 0.16, 0.2, 8), M(x, y + 0.64, z), '#a85a30', 0.1));
    }
    // sack and coiled rope
    s.push(mk(new THREE.SphereGeometry(0.36, 8, 7), M(-4.1, gh(-4.1, -36.2) + 0.28, -36.2, 0, 0, 0, 1, 0.85, 1), '#c9b48a', 0.12));
    s.push(mk(new THREE.ConeGeometry(0.1, 0.22, 6), M(-4.1, gh(-4.1, -36.2) + 0.62, -36.2), '#a8946a', 0.1));
    for (let k = 0; k < 3; k++) s.push(mk(new THREE.TorusGeometry(0.25 - k * 0.03, 0.04, 5, 12), M(-12.9, gh(-12.9, -25.4) + 0.05 + k * 0.06, -25.4, Math.PI / 2, 0, 0), ROPE, 0.06));
    // drying rack + cloths
    const [p0, p1] = PROPS.rack as [{ x: number; z: number }, { x: number; z: number }];
    for (const p of [p0, p1]) {
      const y = gh(p.x, p.z);
      s.push(limb(V(p.x, y - 0.05, p.z), V(p.x, y + 2.3, p.z), 0.09, 0.07, '#6b4423'));
      s.push(limb(V(p.x, y + 2.0, p.z), V(p.x + 0.3, y + 2.4, p.z), 0.04, 0.03, '#6b4423'));
      for (let k = 0; k < 3; k++) s.push(stone(p.x + (r() - 0.5) * 0.7, y + 0.06, p.z + (r() - 0.5) * 0.7, 0.14 + r() * 0.1, r));
    }
    const y0 = gh(p0.x, p0.z);
    s.push(limb(V(p0.x + 0.15, y0 + 2.3, p0.z), V(p1.x + 0.15, gh(p1.x, p1.z) + 2.3, p1.z), 0.025, 0.025, ROPE));
    const dz = p1.z - p0.z;
    [['#d85a3c', 0.18, 1.4], ['#2a9aa0', 0.42, 1.1], ['#e9ae3c', 0.66, 1.5], ['#f2e3c0', 0.85, 1.0]].forEach(([cl, f, hh], i) => {
      const g = new THREE.PlaneGeometry(0.85, hh as number, 4, 4), pp = g.attributes.position!;
      for (let k = 0; k < pp.count; k++) pp.setZ(k, Math.sin(pp.getY(k) * 3 + i) * 0.06);
      g.computeVertexNormals();
      g.applyMatrix4(M(p0.x + 0.15, y0 + 2.26 - (hh as number) / 2, p0.z + dz * (f as number), 0, Math.PI / 2 + (r() - 0.5) * 0.15, 0));
      c.push(mk(g, null, cl as string, 0.06, '#ffffff', y0 + 0.9, y0 + 2.4));
    });
    // barrel by the ramp
    const b = PROPS.barrel, by = gh(b.x, b.z);
    s.push(mk(new THREE.CylinderGeometry(0.46, 0.4, 0.95, 12), M(b.x, by + 0.48, b.z), '#8a5a2f', 0.1, '#a87644', by, by + 0.95));
    for (const hy of [0.15, 0.48, 0.8]) s.push(mk(new THREE.TorusGeometry(0.455 - Math.abs(hy - 0.48) * 0.1, 0.02, 4, 14), M(b.x, by + hy, b.z, Math.PI / 2, 0, 0), '#2e2a28', 0.05));
    s.push(mk(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 12), M(b.x, by + 0.95, b.z), '#2f7c86', 0.05));
    return { solid: merge(s), cloth: merge(c) };
  }, []);
  return <><Static geo={solid} /><Static geo={cloth} /></>;
}

/* ---------------- Beach ---------------- */
export function BeachProps() {
  const geo = useMemo(() => {
    const r = rng(55), p: Geo[] = [], cn = PROPS.canoe, cy = gh(cn.x, cn.z);
    // dugout canoe: hull loft along z
    const hb = new Builder(), wood = col('#8a5a35'), wood2 = col('#6b4426'), inner = col('#3d2916'), L = 4.2, st = 14, rad = 14;
    const sec = (t: number, j: number, inset: number) => {
      const a = (j / (rad - 1)) * Math.PI, w = (0.62 * Math.sin(Math.PI * Math.pow(t, 0.8)) + 0.05) - inset, dpt = 0.38 - inset;
      const lift = Math.pow(Math.abs(t * 2 - 1), 3) * 0.35;
      return V(-Math.cos(a) * w, -Math.sin(a) * dpt + 0.35 + lift, (t - 0.5) * L);
    };
    for (let i = 0; i < st; i++) for (let j = 0; j < rad - 1; j++) {
      const t0 = i / st, t1 = (i + 1) / st, c = (i + j) % 2 ? wood : wood2;
      hb.quad(sec(t0, j, 0), sec(t0, j + 1, 0), sec(t1, j + 1, 0), sec(t1, j, 0), c);
      hb.quad(sec(t0, j, 0.05), sec(t1, j, 0.05), sec(t1, j + 1, 0.05), sec(t0, j + 1, 0.05), inner);
    }
    const hull = hb.build();
    hull.applyMatrix4(M(cn.x, cy + 0.0, cn.z, 0.04, cn.yaw, 0.06));
    p.push(hull);
    for (const zz of [-0.9, 0.2, 1.1]) p.push(limb(V(cn.x - 0.6, cy + 0.62, cn.z + zz), V(cn.x + 0.6, cy + 0.62, cn.z + zz + 0.05), 0.045, 0.045, '#7a5230'));
    p.push(limb(V(cn.x + 1.2, cy + 0.1, cn.z - 0.2), V(cn.x + 0.85, cy + 1.5, cn.z - 0.45), 0.035, 0.03, '#a8814b'));
    p.push(mk(new THREE.BoxGeometry(0.22, 0.04, 0.5), M(cn.x + 0.85, cy + 1.5, cn.z - 0.5, 0.3, 0, 0.2), '#a8814b', 0.1));
    // outrigger float
    p.push(limb(V(cn.x + 1.35, cy + 0.2, cn.z - 1.6), V(cn.x + 1.35, cy + 0.25, cn.z + 1.7), 0.15, 0.1, '#7a5a38'));
    p.push(limb(V(cn.x + 0.5, cy + 0.55, cn.z - 0.5), V(cn.x + 1.35, cy + 0.3, cn.z - 0.4), 0.04, 0.04, '#6b4423'));
    p.push(limb(V(cn.x + 0.5, cy + 0.55, cn.z + 0.7), V(cn.x + 1.35, cy + 0.3, cn.z + 0.8), 0.04, 0.04, '#6b4423'));
    // driftwood
    const d = PROPS.driftwood, dy = gh(d.x, d.z);
    const db = new Builder();
    tube(db, t => V(d.x - 1.9 + t * 3.8, dy + 0.3 + Math.sin(t * 3) * 0.1, d.z + Math.sin(t * 5) * 0.12), t => 0.26 * (1 - Math.abs(t - 0.4) * 0.5), 9, 7, (_t, k) => (k % 2 ? col('#b9a589') : col('#9a8a6e')));
    p.push(db.build());
    for (const [ex, ez, ey] of [[-0.5, -0.4, 0.9], [0.6, 0.5, 0.7], [1.2, -0.2, 0.6]]) p.push(limb(V(d.x + ex!, dy + 0.3, d.z + ez! * 0.3), V(d.x + ex! + 0.3, dy + 0.3 + ey!, d.z + ez!), 0.06, 0.02, '#a89878'));
    // totem
    const t = PROPS.totem, ty = gh(t.x, t.z);
    p.push(limb(V(t.x, ty - 0.1, t.z), V(t.x, ty + 3.2, t.z), 0.2, 0.15, '#6b4426'));
    for (const [yy, c] of [[0.8, '#d85a3c'], [1.6, '#2a9aa0'], [2.4, '#e9ae3c']] as const) {
      p.push(mk(new THREE.CylinderGeometry(0.23, 0.23, 0.3, 10), M(t.x, ty + yy, t.z), c, 0.06));
      p.push(mk(new THREE.BoxGeometry(0.1, 0.1, 0.12), M(t.x, ty + yy + 0.05, t.z + 0.22), '#f2e3c0', 0.05));
    }
    p.push(mk(new THREE.BoxGeometry(1.4, 0.07, 0.07), M(t.x, ty + 2.9, t.z), '#5a3b1c', 0.05));
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(0.28, 1.1, 1, 3);
      g.applyMatrix4(M(t.x + s * 0.55, ty + 2.3, t.z, 0, 0.4, s * 0.06));
      p.push(mk(g, null, s > 0 ? '#e0452b' : '#f2e3c0', 0.08));
    }
    // shells, rocks, coconuts
    for (let k = 0; k < 14; k++) {
      const x = -52 + r() * 8, z = -40 + r() * 24;
      if (x < -53) continue;
      p.push(mk(new THREE.ConeGeometry(0.05 + r() * 0.04, 0.12, 5), M(x, gh(x, z) + 0.04, z, 1.2, r() * 6, 0), pick(['#f6e7d0', '#e8b8a0', '#f2d5b0'], r()), 0.06));
    }
    for (const [x, z] of [[-46.4, -24.6], [-45.8, -24.2], [-47, -23.8]]) p.push(mk(new THREE.IcosahedronGeometry(0.2, 1), M(x!, gh(x!, z!) + 0.13, z!, 0, 0, 0, 1, 0.9, 1), '#5a3f24', 0.12, '#8a6a3a', 0, 1));
    return merge(p);
  }, []);
  return <Static geo={geo} blocker />;
}

/* ---------------- Freshwater spring ---------------- */
/** Retains the semantic waterWell contract while presenting a natural spring. */
export function Well() {
  const { x, z } = LANDMARKS.well,
    y = baseHeight(x, z);
  const geo = useMemo(() => {
    const parts: Geo[] = [];
    // The shared scanned kit supplies the rim and seep; keep the bamboo catch.
    parts.push(
      limb(V(1.3, 0.68, 0.6), V(-0.4, 0.28, 0.2), 0.075, 0.065, "#927b41"),
    );
    parts.push(
      mk(
        new THREE.CylinderGeometry(0.26, 0.2, 0.4, 10),
        M(-2.5, 0.2, 1.9),
        "#7a5c36",
      ),
    );
    return merge(parts);
  }, []);
  return (
    <group name="remote-freshwater-spring" position={[x, y, z]}>
      <Static geo={geo} blocker />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.075, 0]}
        scale={[1.6, 1.3, 1]}
      >
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial
          color="#407f71"
          roughness={0.23}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
}

/* ---------------- Signs ---------------- */
function Sign({ text, x, z, yaw }: { text: string; x: number; z: number; yaw: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#c99a5d'; g.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(90,55,25,${0.08 + (i % 3) * 0.04})`; g.fillRect(0, i * 5.4, 256, 1.5); }
    g.fillStyle = '#3a210d'; g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text.toUpperCase(), 128, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [text]);
  const geo = useMemo(() => merge([
    limb(V(0, -0.1, 0), V(0.05, 2.1, 0), 0.08, 0.06, '#6b4423'),
    mk(new THREE.BoxGeometry(0.07, 0.07, 0.07), M(0.05, 2.15, 0), '#6b4423'),
    mk(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8), M(0.04, 1.75, 0), ROPE, 0.05),
    mk(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8), M(0.03, 1.35, 0), ROPE, 0.05),
  ]), []);
  const m = useMemo(solidMat, []);
  return (
    <group position={[x, gh(x, z), z]} rotation-y={yaw}>
      <mesh geometry={geo} material={m} castShadow />
      <mesh position={[0.05, 1.55, 0.07]} castShadow><boxGeometry args={[1.5, 0.4, 0.06]} /><meshLambertMaterial color="#c99a5d" /></mesh>
      <mesh position={[0.05, 1.55, 0.104]}><planeGeometry args={[1.44, 0.36]} /><meshBasicMaterial map={tex} /></mesh>
    </group>
  );
}
export function Signs() {
  return <>{PROPS.signs.map(s => <Sign key={s.text} {...s} />)}</>;
}
void STRAW;
