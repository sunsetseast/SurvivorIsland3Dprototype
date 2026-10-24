import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BAMBOO, BOUNDS, COLLIDERS, LANDMARKS, PALMS, PATH, ROCKS, SEATING_LOGS, SPAWN,
  baseHeight, groundHeight, locationAt, movePlayer, type Point,
} from './world';
import { dbg, input } from './state';

const lam = (color: string, extra: object = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
function part(g: THREE.BufferGeometry, hex: string, m?: THREE.Matrix4) {
  const ng = g.index ? g.toNonIndexed() : g;
  if (m) ng.applyMatrix4(m);
  const c = new THREE.Color(hex);
  const n = ng.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  ng.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return ng;
}
const T = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
const compose = (p: THREE.Vector3, e: THREE.Euler, s = new THREE.Vector3(1, 1, 1)) =>
  new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(e), s);

function segDist(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}

/* ---------- Terrain ---------- */
function Terrain() {
  const geo = useMemo(() => {
    const x0 = -72, x1 = 56, z0 = -82, z1 = 56;
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, x1 - x0, z1 - z0);
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const sand = new THREE.Color('#f1d596'), wet = new THREE.Color('#c9a36a'), grass = new THREE.Color('#3f9a3a'),
      deep = new THREE.Color('#2b7a35'), dirt = new THREE.Color('#b8884d'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      let h = baseHeight(x, z);
      if (x < -56) h -= (-56 - x) * 0.12;
      pos.setY(i, h);
      const k = Math.max(0, Math.min(1, (x + 36) / 10));
      c.copy(sand).lerp(grass, k);
      if (x < -50) c.lerp(wet, Math.min(1, (-50 - x) / 8));
      if (k > 0.5) c.lerp(deep, 0.35 * (0.5 + 0.5 * Math.sin(x * 0.7) * Math.cos(z * 0.6)));
      const p = { x, z };
      let d = 99;
      for (let j = 1; j < PATH.length; j++) d = Math.min(d, segDist(p, PATH[j - 1]!, PATH[j]!));
      d = Math.min(d, Math.hypot(x + 9, z + 31) - 5);
      d = Math.min(d, Math.hypot(x + 34, z - 8) - 2);
      if (d < 1.9) c.lerp(dirt, Math.min(1, (1.9 - d) / 0.8) * (x < -36 ? 0.4 : 0.9));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geo} receiveShadow><meshLambertMaterial vertexColors /></mesh>;
}

/* ---------- Ocean ---------- */
function Ocean() {
  const foam = useRef<THREE.Group>(null);
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (water.current) water.current.position.y = 0.02 + Math.sin(t * 0.8) * 0.03;
    foam.current?.children.forEach((m, i) => {
      const ph = (t * 0.35 + i / 3) % 1;
      m.position.x = -57.2 - ph * 3.2 + 0.8;
      (m as THREE.Mesh).scale.set(1, 1, 1);
      ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.sin(ph * Math.PI) * 0.75;
    });
  });
  const foamMat = () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false });
  return (
    <>
      <mesh ref={water} rotation-x={-Math.PI / 2} position={[-120, 0.02, -10]}>
        <planeGeometry args={[130, 400]} />
        <meshLambertMaterial color="#12b8c9" transparent opacity={0.92} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-56.4, 0.045, -13]}>
        <planeGeometry args={[1.6, 120]} />
        <meshBasicMaterial color="#e8fffb" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <group ref={foam}>
        {[0, 1, 2].map(i => (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[-58, 0.06, -13]} material={foamMat()}>
            <planeGeometry args={[0.9, 120]} />
          </mesh>
        ))}
      </group>
    </>
  );
}

/* ---------- Instanced foliage ---------- */
function Instanced({ geo, mat, items, colors }: {
  geo: THREE.BufferGeometry; mat: THREE.Material;
  items: { x: number; z: number; scale: number; lean?: number; rotation: number; y?: number }[];
  colors?: string[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useMemo(() => {
    // matrices applied in ref callback below
  }, []);
  return (
    <instancedMesh
      ref={(m) => {
        (ref as { current: THREE.InstancedMesh | null }).current = m;
        if (!m) return;
        const o = new THREE.Object3D();
        const c = new THREE.Color();
        items.forEach((it, i) => {
          o.position.set(it.x, (it.y ?? groundHeight(it.x, it.z)) - 0.05, it.z);
          o.rotation.set(0, it.rotation, it.lean ?? 0);
          o.scale.setScalar(it.scale);
          o.updateMatrix();
          m.setMatrixAt(i, o.matrix);
          if (colors) m.setColorAt(i, c.set(colors[i % colors.length]!));
        });
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }}
      args={[geo, mat, items.length]}
      frustumCulled={false}
    />
  );
}

function Foliage() {
  const palmGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(part(new THREE.CylinderGeometry(0.2, 0.33, 6, 6), '#9a6b3d', T(0, 3, 0)));
    for (let r = 0; r < 4; r++) parts.push(part(new THREE.TorusGeometry(0.3, 0.05, 4, 6), '#6f4a28', compose(new THREE.Vector3(0, 0.8 + r * 1.3, 0), new THREE.Euler(Math.PI / 2, 0, 0))));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.9, 0.07, 3.4, 1, 1, 4);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const w = 1 - Math.abs(p.getZ(k)) / 1.9; p.setX(k, p.getX(k) * Math.max(0.1, w)); p.setY(k, p.getY(k) - Math.pow(Math.abs(p.getZ(k) + 1.7) / 3.4, 2) * 0.8); }
      parts.push(part(g, i % 2 ? '#2f9a3c' : '#47b34a', compose(new THREE.Vector3(0, 6.05, 0), new THREE.Euler(0.18, a, 0, 'YXZ'), new THREE.Vector3(1, 1, 1)).multiply(T(0, 0, 1.7))));
    }
    for (let i = 0; i < 3; i++) parts.push(part(new THREE.SphereGeometry(0.22, 6, 5), '#5a3b1c', T(Math.cos(i * 2.1) * 0.3, 5.8, Math.sin(i * 2.1) * 0.3)));
    return mergeGeometries(parts)!;
  }, []);
  const bambooGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.7, r = 0.15 + (i % 3) * 0.22, h = 4.5 + (i % 4) * 0.9;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      parts.push(part(new THREE.CylinderGeometry(0.08, 0.1, h, 5), i % 2 ? '#a7c957' : '#8fb840', compose(new THREE.Vector3(x, h / 2, z), new THREE.Euler(Math.sin(a) * 0.06, 0, Math.cos(a) * 0.06))));
      for (let n = 1; n < 4; n++) parts.push(part(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 5), '#6f8f2a', T(x, n * h / 4, z)));
      parts.push(part(new THREE.ConeGeometry(0.5, 0.9, 5), '#58a93a', T(x, h, z)));
    }
    return mergeGeometries(parts)!;
  }, []);
  const rockGeo = useMemo(() => {
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(1, 0.7, 0.8);
    return part(g, '#ffffff', T(0, 0.35, 0));
  }, []);
  const mats = useMemo(() => ({ v: lam('#fff', { vertexColors: true }), r: lam('#fff', { flatShading: true }) }), []);
  const boundary = useMemo(() => {
    const out: { x: number; z: number; scale: number; rotation: number }[] = [];
    for (let z = BOUNDS.minZ; z <= BOUNDS.maxZ; z += 4.5) out.push({ x: BOUNDS.maxX + 0.6, z, scale: 1.4 + ((z * 7) % 3) * 0.2, rotation: z });
    for (let x = BOUNDS.minX + 4; x <= BOUNDS.maxX; x += 4.5) {
      out.push({ x, z: BOUNDS.minZ - 0.6, scale: 1.5 + ((x * 3) % 3) * 0.2, rotation: x });
      out.push({ x, z: BOUNDS.maxZ + 0.6, scale: 1.4 + ((x * 5) % 3) * 0.2, rotation: x });
    }
    return out;
  }, []);
  const rockCols = ['#8b8577', '#6f6a60', '#9c9484', '#7a7468'];
  return (
    <>
      <Instanced geo={palmGeo} mat={mats.v} items={PALMS} />
      <Instanced geo={bambooGeo} mat={mats.v} items={BAMBOO} />
      <Instanced geo={rockGeo} mat={mats.r} items={ROCKS} colors={rockCols} />
      <Instanced geo={rockGeo} mat={mats.r} items={boundary} colors={rockCols} />
    </>
  );
}

/* ---------- Camp props ---------- */
const WOOD = '#8a5a2f', THATCH = '#d9a441', THATCH2 = '#c28a2c';
function Fire() {
  const flames = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const { x, z } = LANDMARKS.campfire;
  const y = groundHeight(x, z);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flames.current?.children.forEach((f, i) => {
      const s = 1 + Math.sin(t * (9 + i * 3) + i * 2) * 0.22;
      f.scale.set(1 - (s - 1) * 0.5, s, 1 - (s - 1) * 0.5);
      f.rotation.y = t * (1 + i);
    });
    if (light.current) light.current.intensity = 14 + Math.sin(t * 17) * 3 + Math.sin(t * 29) * 2;
  });
  return (
    <group position={[x, y, z]}>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} position={[Math.cos(i * 0.628) * 1, 0.18, Math.sin(i * 0.628) * 1]} castShadow>
          <dodecahedronGeometry args={[0.28, 0]} />
          <meshLambertMaterial color={i % 2 ? '#8b8577' : '#6f6a60'} flatShading />
        </mesh>
      ))}
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[0, 0.2, 0]} rotation={[0, i * 0.8, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 1.4, 5]} /><meshLambertMaterial color="#4a2d17" />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.9, 10]} /><meshBasicMaterial color="#2a2018" /></mesh>
      <group ref={flames}>
        <mesh position={[0, 0.7, 0]}><coneGeometry args={[0.5, 1.4, 6]} /><meshBasicMaterial color="#f2551c" transparent opacity={0.92} /></mesh>
        <mesh position={[0.1, 0.6, 0.05]}><coneGeometry args={[0.35, 1.1, 5]} /><meshBasicMaterial color="#ff9a2a" /></mesh>
        <mesh position={[0, 0.45, 0]}><coneGeometry args={[0.2, 0.8, 5]} /><meshBasicMaterial color="#ffe27a" /></mesh>
      </group>
      <pointLight ref={light} position={[0, 1.2, 0]} color="#ff9a4a" distance={16} decay={2} />
    </group>
  );
}

function Logs() {
  return (
    <>
      {SEATING_LOGS.map((l, i) => {
        const along = l.hx > l.hz;
        return (
          <group key={i} position={[l.x, groundHeight(l.x, l.z) + 0.38, l.z]} rotation={along ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.43, 0.43, Math.max(l.hx, l.hz) * 2, 9]} />
              <meshLambertMaterial color="#7b4f2a" />
            </mesh>
            {[-1, 1].map(s => (
              <mesh key={s} position={[0, s * (Math.max(l.hx, l.hz) + 0.005), 0]} rotation-x={s > 0 ? -Math.PI / 2 : Math.PI / 2}>
                <circleGeometry args={[0.38, 9]} />
                <meshLambertMaterial color="#c99a5d" />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
}

function Well() {
  const { x, z } = LANDMARKS.well;
  const y = groundHeight(x, z);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[1.35, 1.45, 1, 12, 1, true]} /><meshLambertMaterial color="#9b958a" flatShading side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 1.02, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[1.35, 0.13, 5, 12]} /><meshLambertMaterial color="#b3ad9f" /></mesh>
      <mesh position={[0, 0.8, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[1.3, 12]} /><meshLambertMaterial color="#17a3b8" /></mesh>
      {[-1.2, 1.2].map(s => (
        <mesh key={s} position={[s, 1.6, 0]}><boxGeometry args={[0.16, 2.2, 0.16]} /><meshLambertMaterial color={WOOD} /></mesh>
      ))}
      <mesh position={[0, 2.8, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.9, 1, 4]} /><meshLambertMaterial color={THATCH} flatShading /></mesh>
      <mesh position={[0, 2.1, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 2.4, 5]} /><meshLambertMaterial color="#5a3b1c" /></mesh>
      <mesh position={[0, 1.7, 0]}><cylinderGeometry args={[0.2, 0.17, 0.35, 6]} /><meshLambertMaterial color="#6b4423" /></mesh>
    </group>
  );
}

function Shelter() {
  const bh = baseHeight(12, -33);
  const rise = 1.8 - bh, len = 7, ang = Math.atan2(rise, len);
  const posts = COLLIDERS.filter(c => c.kind === 'post');
  const mats = [[9, -45, '#e0533a'], [12, -45.5, '#2fa3a8'], [15, -44.8, '#f2b134']] as const;
  return (
    <group>
      <mesh position={[12, 1.7, -44]} castShadow receiveShadow><boxGeometry args={[10, 0.2, 8]} /><meshLambertMaterial color="#b98650" /></mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[7.6 + i * 1.2, 1.81, -44]}><boxGeometry args={[0.04, 0.02, 8]} /><meshLambertMaterial color="#8a5a2f" /></mesh>
      ))}
      {posts.map((p, i) => (
        <group key={i}>
          <mesh position={[p.x, 1, p.z]} castShadow><boxGeometry args={[0.44, 2.2, 0.44]} /><meshLambertMaterial color="#6b4423" /></mesh>
          <mesh position={[p.x, 3.1, p.z]}><boxGeometry args={[0.3, 2.6, 0.3]} /><meshLambertMaterial color="#6b4423" /></mesh>
        </group>
      ))}
      {[7.5, 16.5].map(x => (
        <mesh key={x} position={[x, 1.78 + 0.5, -44]}><boxGeometry args={[0.1, 0.1, 7.6]} /><meshLambertMaterial color="#6b4423" /></mesh>
      ))}
      {[-47.7, -40.3].map(z => (
        <mesh key={z} position={[12, 2.3, z]}><boxGeometry args={[9.4, 0.1, 0.1]} /><meshLambertMaterial color="#6b4423" /></mesh>
      ))}
      {/* gabled thatch roof: ridge along z */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[12 + s * 2.85, 4.75, -44]} rotation={[0, 0, -s * 0.62]} castShadow>
          <boxGeometry args={[6.3, 0.35, 9.4]} /><meshLambertMaterial color={s > 0 ? THATCH : THATCH2} flatShading />
        </mesh>
      ))}
      <mesh position={[12, 5.95, -44]}><boxGeometry args={[0.5, 0.3, 9.6]} /><meshLambertMaterial color="#7d5524" /></mesh>
      {mats.map(([x, z, c], i) => (
        <group key={i} position={[x, 1.84, z]} rotation-y={i * 0.15 - 0.1}>
          <mesh><boxGeometry args={[1.3, 0.07, 3.2]} /><meshLambertMaterial color={c} /></mesh>
          <mesh position={[0, 0.1, -1.2]}><boxGeometry args={[1, 0.18, 0.5]} /><meshLambertMaterial color="#f6ead0" /></mesh>
        </group>
      ))}
      <mesh position={[16, 2.2, -41]}><boxGeometry args={[1.1, 0.8, 0.9]} /><meshLambertMaterial color="#8a5a2f" /></mesh>
      <mesh position={[12, (bh + 1.8) / 2 - 0.08, -36.5]} rotation-x={ang} castShadow receiveShadow>
        <boxGeometry args={[4, 0.18, Math.hypot(len, rise) + 0.2]} /><meshLambertMaterial color="#a9763f" />
      </mesh>
      {[10, 14].map(x => (
        <mesh key={x} position={[x, (bh + 1.8) / 2 + 0.55, -36.5]} rotation-x={ang}>
          <boxGeometry args={[0.1, 0.1, Math.hypot(len, rise)]} /><meshLambertMaterial color="#6b4423" />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- Signposts ---------- */
function Sign({ text, x, z }: { text: string; x: number; z: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#e8b866'; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#6b4423'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 118);
    g.fillStyle = '#3a210d'; g.font = 'bold 54px ui-rounded, Trebuchet MS, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text.toUpperCase(), 256, 68);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [text]);
  const y = groundHeight(x, z);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 1.3, 0]}><cylinderGeometry args={[0.07, 0.09, 2.6, 5]} /><meshLambertMaterial color="#6b4423" /></mesh>
      <Billboard position={[0, 2.5, 0]} lockX lockZ>
        <mesh><planeGeometry args={[2.6, 0.65]} /><meshBasicMaterial map={tex} side={THREE.DoubleSide} /></mesh>
      </Billboard>
    </group>
  );
}

/* ---------- Player ---------- */
const skin = '#e0a878';
function Limb({ r, len, color, p }: { r: number; len: number; color: string; p: [number, number, number] }) {
  return (
    <group position={p}>
      <mesh position={[0, -len / 2, 0]} castShadow><capsuleGeometry args={[r, len - r * 2, 3, 6]} /><meshLambertMaterial color={color} /></mesh>
    </group>
  );
}
function Player() {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const la = useRef<THREE.Group>(null), ra = useRef<THREE.Group>(null), ll = useRef<THREE.Group>(null), rl = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const st = useRef({ pos: { ...SPAWN } as Point, face: Math.PI, speed: 0, phase: 0, y: groundHeight(SPAWN.x, SPAWN.z), fpsT: 0, fpsN: 0 });
  const [, get] = useKeyboardControls();
  const light = useRef<THREE.DirectionalLight>(null);
  const camP = useRef(new THREE.Vector3());
  const camInit = useRef(false);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    if (dbg.resetRequested) {
      dbg.resetRequested = false;
      s.pos = { ...SPAWN }; s.speed = 0; input.yaw = 0.3; input.pitch = 0.38;
    }
    s.fpsT += rawDt; s.fpsN++;
    if (s.fpsT > 0.5) { dbg.fps = Math.round(s.fpsN / s.fpsT); s.fpsT = 0; s.fpsN = 0; }

    const k = get();
    let ix = input.joyX + (k.right ? 1 : 0) - (k.left ? 1 : 0);
    let iy = input.joyY + (k.forward ? 1 : 0) - (k.back ? 1 : 0);
    const mag = Math.hypot(ix, iy);
    if (mag > 1) { ix /= mag; iy /= mag; }
    const m = Math.min(1, mag);
    const running = (input.run || k.run) && m > 0.05;
    const sy = Math.sin(input.yaw), cy = Math.cos(input.yaw);
    const wx = -sy * iy + cy * ix, wz = -cy * iy - sy * ix;
    const speed = m > 0.05 ? (running ? 7.2 : 3.8 * Math.max(0.5, m)) : 0;
    if (speed > 0) {
      const len = Math.hypot(wx, wz) || 1;
      s.pos = movePlayer(s.pos, (wx / len) * speed * dt, (wz / len) * speed * dt);
      const target = Math.atan2(wx, wz);
      let d = target - s.face; d = Math.atan2(Math.sin(d), Math.cos(d));
      s.face += d * Math.min(1, dt * 12);
    }
    s.speed += (speed - s.speed) * Math.min(1, dt * 10);
    const gy = groundHeight(s.pos.x, s.pos.z);
    s.y += (gy - s.y) * Math.min(1, dt * 14);
    s.phase += dt * (s.speed * 1.9);

    const amp = Math.min(1, s.speed / 3.8) * (running ? 1.1 : 0.7);
    const sw = Math.sin(s.phase) * amp;
    const t = performance.now() / 1000;
    if (root.current) root.current.position.set(s.pos.x, s.y, s.pos.z);
    if (body.current) {
      body.current.rotation.y = s.face;
      body.current.position.y = Math.abs(Math.cos(s.phase)) * 0.08 * Math.min(1, s.speed / 3) + Math.sin(t * 2) * 0.01;
    }
    if (torso.current) torso.current.rotation.x = (running ? 0.22 : 0.05) * Math.min(1, s.speed / 3);
    const idle = Math.sin(t * 1.8) * 0.04;
    if (la.current) la.current.rotation.x = sw + idle;
    if (ra.current) ra.current.rotation.x = -sw - idle;
    if (ll.current) ll.current.rotation.x = -sw;
    if (rl.current) rl.current.rotation.x = sw;

    if (light.current) {
      light.current.position.set(s.pos.x + 18, 30, s.pos.z + 12);
      light.current.target.position.set(s.pos.x, 0, s.pos.z);
      light.current.target.updateMatrixWorld();
    }
    const dist = 8.5, pitch = input.pitch;
    const tx = s.pos.x, ty = s.y + 1.5, tz = s.pos.z;
    const des = new THREE.Vector3(tx + sy * Math.cos(pitch) * dist, ty + Math.sin(pitch) * dist, tz + cy * Math.cos(pitch) * dist);
    des.y = Math.max(des.y, groundHeight(des.x, des.z) + 0.8);
    if (!camInit.current) { camP.current.copy(des); camInit.current = true; }
    camP.current.lerp(des, 1 - Math.exp(-dt * 9));
    camera.position.copy(camP.current);
    camera.lookAt(tx, ty - 0.2, tz);

    dbg.x = s.pos.x; dbg.y = s.y; dbg.z = s.pos.z;
    dbg.cx = camera.position.x; dbg.cy = camera.position.y; dbg.cz = camera.position.z;
    dbg.location = locationAt(s.pos.x, s.pos.z);
    dbg.moving = s.speed > 0.3; dbg.running = running && s.speed > 0.3;
  });

  return (
    <>
      <directionalLight ref={light} intensity={2.1} color="#fff1d0" castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22}
        shadow-camera-near={1} shadow-camera-far={80} shadow-bias={-0.0005} />
      <group ref={root}>
        <group ref={body}>
          <group ref={torso} position={[0, 1.0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[0.55, 0.7, 0.3]} /><meshLambertMaterial color="#e8512f" /></mesh>
            <mesh position={[0, 0.0, 0]}><boxGeometry args={[0.56, 0.18, 0.31]} /><meshLambertMaterial color="#1d9aa6" /></mesh>
            <mesh position={[0, 0.9, 0]} castShadow><sphereGeometry args={[0.24, 8, 7]} /><meshLambertMaterial color={skin} /></mesh>
            <mesh position={[0, 1.0, -0.04]}><sphereGeometry args={[0.25, 8, 6, 0, Math.PI * 2, 0, Math.PI / 1.9]} /><meshLambertMaterial color="#2b1a10" /></mesh>
            <mesh position={[0, 1.07, 0.02]}><cylinderGeometry args={[0.36, 0.36, 0.04, 10]} /><meshLambertMaterial color="#e8c46a" /></mesh>
            <mesh position={[0.09, 0.93, 0.22]}><sphereGeometry args={[0.03, 4, 4]} /><meshBasicMaterial color="#2b1a10" /></mesh>
            <mesh position={[-0.09, 0.93, 0.22]}><sphereGeometry args={[0.03, 4, 4]} /><meshBasicMaterial color="#2b1a10" /></mesh>
            <group ref={la} position={[0.37, 0.65, 0]}><Limb r={0.09} len={0.65} color={skin} p={[0, 0, 0]} /></group>
            <group ref={ra} position={[-0.37, 0.65, 0]}><Limb r={0.09} len={0.65} color={skin} p={[0, 0, 0]} /></group>
          </group>
          <group ref={ll} position={[0.15, 1.0, 0]}><Limb r={0.11} len={1.0} color="#1d9aa6" p={[0, 0, 0]} /></group>
          <group ref={rl} position={[-0.15, 1.0, 0]}><Limb r={0.11} len={1.0} color="#1d9aa6" p={[0, 0, 0]} /></group>
        </group>
      </group>
    </>
  );
}

export function Scene() {
  return (
    <>
      <color attach="background" args={['#8fd8e8']} />
      <fog attach="fog" args={['#bfe8e6', 45, 120]} />
      <hemisphereLight args={['#d6f4ff', '#c9a56a', 1.1]} />
      <Terrain />
      <Ocean />
      <Foliage />
      <Fire />
      <Logs />
      <Well />
      <Shelter />
      <Sign text="West Beach" x={-44} z={-31} />
      <Sign text="Campfire" x={-12} z={-26} />
      <Sign text="Shelter" x={8} z={-30} />
      <Sign text="Water Well" x={-31} z={4.5} />
      <Player />
    </>
  );
}
