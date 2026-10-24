import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BAMBOO, BROADLEAF, FERNS, FLOWERS, GRASS, PALMS, ROCKS, SHRUBS, groundHeight, type Veg } from './world';
import { makeBamboo, makeBlossoms, makeBroadleaf, makeFern, makeGrass, makePalm, makeRock, makeShrub } from './flora';

const CELL = 32;
type Cell = { cx: number; cz: number; s: number; e: number };
type BatchProps = { geo: THREE.BufferGeometry; far?: THREE.BufferGeometry; mat: THREE.Material; items: Veg[]; tints?: string[]; cast?: boolean; blocker?: boolean; lift?: number; radius: number; farFrom?: number; h?: number };

/** One InstancedMesh per plant/LOD. Per-chunk frustum + distance decisions compact visible instances into the batch. */
function Chunked({ items, geo, far, mat, tints, cast, blocker, lift = 0, radius, farFrom = 48, h = 1 }: BatchProps) {
  const data = useMemo(() => {
    const mp = new Map<string, Veg[]>();
    for (const it of items) {
      const k = Math.floor(it.x / CELL) + ',' + Math.floor(it.z / CELL);
      let l = mp.get(k); if (!l) { l = []; mp.set(k, l); } l.push(it);
    }
    const n = items.length, mats = new Float32Array(n * 16), cols = tints ? new Float32Array(n * 3) : null;
    const cells: Cell[] = [], o = new THREE.Object3D(), c = new THREE.Color();
    let i = 0;
    for (const [k, l] of mp) {
      const [gx, gz] = k.split(',').map(Number) as [number, number];
      const s = i;
      for (const it of l) {
        o.position.set(it.x, groundHeight(it.x, it.z) - 0.04 + lift * it.scale, it.z);
        o.rotation.set(0, it.rotation, 0); o.scale.setScalar(it.scale); o.updateMatrix();
        o.matrix.toArray(mats, i * 16);
        if (cols) { c.set(tints![it.variant % tints!.length]!).multiplyScalar(0.85 + ((i * 37) % 10) / 33); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
        i++;
      }
      cells.push({ cx: (gx + 0.5) * CELL, cz: (gz + 0.5) * CELL, s, e: i });
    }
    return { cells, mats, cols, n };
  }, [items, tints, lift]);
  const nearRef = useRef<THREE.InstancedMesh>(null);
  const farRef = useRef<THREE.InstancedMesh>(null);
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const mtx = useMemo(() => new THREE.Matrix4(), []);
  const sph = useMemo(() => new THREE.Sphere(), []);
  const tick = useRef(0);
  useLayoutEffect(() => {
    for (const m of [nearRef.current, farRef.current]) {
      if (!m) continue;
      m.count = 0; m.visible = false;
      if (data.cols) m.setColorAt(0, new THREE.Color());
      m.boundingSphere = new THREE.Sphere(new THREE.Vector3(-10, 0, -10), 400);
    }
  }, [data, far]);
  const copy = (m: THREE.InstancedMesh, cnt: number, s: number, e: number) => {
    const ma = m.instanceMatrix.array as Float32Array, ca = m.instanceColor ? (m.instanceColor.array as Float32Array) : null;
    for (let i = s; i < e; i++, cnt++) {
      const d = cnt * 16, q = i * 16;
      for (let k = 0; k < 16; k++) ma[d + k] = data.mats[q + k]!;
      if (ca && data.cols) { ca[cnt * 3] = data.cols[i * 3]!; ca[cnt * 3 + 1] = data.cols[i * 3 + 1]!; ca[cnt * 3 + 2] = data.cols[i * 3 + 2]!; }
    }
    return cnt;
  };
  useFrame(({ camera }) => {
    if (tick.current++ % 3) return;
    mtx.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(mtx);
    const cp = camera.position, nm = nearRef.current, fm = farRef.current;
    let nc = 0, fc = 0;
    for (const c of data.cells) {
      const d = Math.hypot(c.cx - cp.x, c.cz - cp.z);
      if (d >= radius + CELL * 0.7) continue;
      sph.center.set(c.cx, h, c.cz); sph.radius = CELL * 0.85 + h;
      if (!frustum.intersectsSphere(sph)) continue;
      if (far && d >= farFrom) { if (fm) fc = copy(fm, fc, c.s, c.e); }
      else if (nm) nc = copy(nm, nc, c.s, c.e);
    }
    if (nm) { nm.count = nc; nm.visible = nc > 0; nm.instanceMatrix.needsUpdate = true; if (nm.instanceColor) nm.instanceColor.needsUpdate = true; }
    if (fm) { fm.count = fc; fm.visible = fc > 0; fm.instanceMatrix.needsUpdate = true; if (fm.instanceColor) fm.instanceColor.needsUpdate = true; }
  });
  if (!data.n) return null;
  return (
    <>
      <instancedMesh ref={nearRef} args={[geo, mat, data.n]} frustumCulled={false} castShadow={cast} receiveShadow userData={blocker ? { cameraBlocker: true } : undefined} />
      {far && <instancedMesh ref={farRef} args={[far, mat, data.n]} frustumCulled={false} receiveShadow />}
    </>
  );
}

const byVariant = (list: Veg[], v: number) => list.filter(p => p.variant === v);
const SHRUB_TINT = ['#4f9a3a', '#6aa844', '#c9902a', '#a8452a', '#4f9a3a', '#5aa24a'];
const FERN_TINT = ['#4d9a3e', '#69ac48', '#3f8a38'];
const GRASS_TINT = ['#a8b85a', '#c9b45a', '#7aa84a', '#d6c27a'];
const BLOSSOM_TINT = ['#e8467a', '#f2763a', '#f6e7c8', '#d8344a'];
const ROCK_TINT = ['#ffffff', '#e8e2d4', '#d6d0c2', '#f4efe4'];

export function Flora() {
  const m = useMemo(() => ({
    leafy: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: new THREE.Color('#1c2a10'), emissiveIntensity: 0.9 }),
    solid: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    rock: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  }), []);
  const g = useMemo(() => ({
    palms: [0, 1, 2].map(v => makePalm(v)), palmsLo: [0, 1, 2].map(v => makePalm(v, true)), broad: [0, 1, 2].map(v => makeBroadleaf(v)), broadLo: [0, 1, 2].map(v => makeBroadleaf(v, true)), bamboo: makeBamboo(), bambooLo: makeBamboo(true), shrub: makeShrub(),
    blossom: makeBlossoms(), fern: makeFern(), grass: makeGrass(), rocks: [0, 1, 2].map(makeRock),
  }), []);
  const palms = useMemo(() => [0, 1, 2].map(v => byVariant(PALMS, v)), []);
  const broad = useMemo(() => [0, 1, 2].map(v => byVariant(BROADLEAF, v)), []);
  const rocks = useMemo(() => [0, 1, 2].map(v => byVariant(ROCKS, v)), []);
  return (
    <>
      {[0, 1, 2].map(v => (
        <group key={'p' + v}>
          <Chunked geo={g.palms[v]!.trunk} far={g.palmsLo[v]!.trunk} mat={m.solid} items={palms[v]!} cast blocker radius={125} farFrom={48} h={9} />
          <Chunked geo={g.palms[v]!.crown} far={g.palmsLo[v]!.crown} mat={m.leafy} items={palms[v]!} radius={125} farFrom={48} h={9} />
          <Chunked geo={g.broad[v]!.trunk} far={g.broadLo[v]!.trunk} mat={m.solid} items={broad[v]!} cast blocker radius={125} farFrom={42} h={8} />
          <Chunked geo={g.broad[v]!.crown} far={g.broadLo[v]!.crown} mat={m.leafy} items={broad[v]!} radius={125} farFrom={42} h={8} />
          <Chunked geo={g.rocks[v]!} mat={m.rock} items={rocks[v]!} tints={ROCK_TINT} cast blocker radius={110} h={3} />
        </group>
      ))}
      <Chunked geo={g.bamboo} far={g.bambooLo} mat={m.leafy} items={BAMBOO} radius={115} farFrom={38} h={5} />
      <Chunked geo={g.shrub} mat={m.leafy} items={SHRUBS} tints={SHRUB_TINT} radius={75} />
      <Chunked geo={g.blossom} mat={m.solid} items={FLOWERS} tints={BLOSSOM_TINT} radius={55} />
      <Chunked geo={g.fern} mat={m.leafy} items={FERNS} tints={FERN_TINT} radius={55} />
      <Chunked geo={g.grass} mat={m.leafy} items={GRASS} tints={GRASS_TINT} radius={38} />
    </>
  );
}
