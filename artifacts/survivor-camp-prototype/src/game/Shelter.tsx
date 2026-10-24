import { useMemo } from 'react';
import * as THREE from 'three';
import { M, V, col, limb, merge, mk, pick, rng, type Geo } from './geo';
import { ROPE, WOODS, matGeo, thatchRoof } from './props';
import { SHELTER, baseHeight, groundHeight } from './world';

const mat = <T extends THREE.Material>(m: T) => m;
export function Shelter() {
  const { timber, thatch, deck, soft } = useMemo(() => {
    const r = rng(77), D = SHELTER.deck, E = SHELTER.eave, RG = SHELTER.ridge, cx = 12, cz = -44;
    const wood = () => pick(WOODS, r());
    const timber: Geo[] = [], deck: Geo[] = [], soft: Geo[] = [];
    // deck planks
    const n = 29, pw = (D.x1 - D.x0) / n;
    for (let i = 0; i < n; i++) {
      const th = 0.1 + r() * 0.03;
      deck.push(mk(new THREE.BoxGeometry(pw * 0.93, th, 8), M(D.x0 + pw * (i + 0.5), D.y - th / 2 - r() * 0.012, cz, 0, (r() - 0.5) * 0.01, 0), pick(['#b98650', '#a9763f', '#c29360', '#9a6a3a'], r()), 0.08));
    }
    // joists and stilts
    for (const z of [-47, -44, -41]) timber.push(limb(V(D.x0 - 0.2, 1.6, z), V(D.x1 + 0.2, 1.6, z), 0.09, 0.09, '#5a3b1c'));
    for (const x of [8.8, 12, 15.2]) for (const z of [-47, -41]) {
      timber.push(limb(V(x, baseHeight(x, z) - 0.1, z), V(x, 1.62, z), 0.12, 0.1, wood()));
      timber.push(mk(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8), M(x, 1.45, z), ROPE, 0.05));
    }
    // posts
    const corners: [number, number][] = [[7.3, -47.7], [16.7, -47.7], [7.3, -40.3], [16.7, -40.3], [7.3, -44], [16.7, -44]];
    for (const [x, z] of corners) {
      timber.push(limb(V(x, baseHeight(x, z) - 0.1, z), V(x, E + 0.28, z), 0.16, 0.12, wood(), '#7a5230'));
      for (const y of [2.0, 2.9, 3.7]) timber.push(mk(new THREE.CylinderGeometry(0.17, 0.17, 0.09, 8), M(x, y, z), ROPE, 0.06));
      for (let k = 0; k < 4; k++) timber.push(mk(new THREE.IcosahedronGeometry(0.2 + r() * 0.1, 0), M(x + (r() - 0.5) * 0.7, baseHeight(x, z) + 0.05, z + (r() - 0.5) * 0.7, r(), r(), r(), 1, 0.6, 1), pick(['#8d877a', '#9c9484', '#7a7468'], r()), 0.1));
    }
    for (const z of [-47.7, -40.3]) {
      timber.push(limb(V(7.0, E - 0.05, z), V(17.0, E - 0.05, z), 0.1, 0.1, '#6b4423'));
      timber.push(limb(V(cx, E, z), V(cx, RG - 0.05, z), 0.1, 0.08, '#6b4423'));
    }
    for (const x of [7.3, 16.7]) timber.push(limb(V(x, E, -48.6), V(x, E, -39.4), 0.1, 0.1, '#6b4423'));
    for (const x of [7.3, 16.7]) for (const y of [2.3, 2.85]) timber.push(limb(V(x, y, -47.7), V(x, y, -40.3), 0.045, 0.045, '#8a6038'));
    for (const y of [2.3, 2.85]) timber.push(limb(V(7.3, y, -47.7), V(16.7, y, -47.7), 0.045, 0.045, '#8a6038'));
    for (const [a, b] of [[7.3, 9.9], [14.1, 16.7]] as const) for (const y of [2.3, 2.85]) timber.push(limb(V(a, y, -40.3), V(b, y, -40.3), 0.045, 0.045, '#8a6038'));
    // rafters, purlins
    for (let z = -48.7; z <= -39.3; z += 1.15) for (const s of [-1, 1]) {
      timber.push(limb(V(cx + s * 5.9, E - 0.02, z), V(cx, RG - 0.04, z), 0.06, 0.05, '#7a5230'));
    }
    for (const s of [-1, 1]) for (const k of [1 / 3, 2 / 3]) timber.push(limb(V(cx + s * 5.9 * (1 - k), E + (RG - E) * k, -49), V(cx + s * 5.9 * (1 - k), E + (RG - E) * k, -39), 0.05, 0.05, '#6b4423'));
    // back wall canes and gable fill
    for (let x = 7.5; x <= 16.55; x += 0.24) {
      const top = E + (RG - E) * Math.max(0, 1 - Math.abs(x - cx) / 5.9) - 0.15;
      soft.push(limb(V(x, D.y, -48), V(x + (r() - 0.5) * 0.04, Math.max(top, E - 0.1), -48), 0.04, 0.035, pick(['#c9a463', '#b8934f', '#d4b273'], r())));
    }
    for (const y of [2.5, 3.3]) timber.push(limb(V(7.3, y, -48.05), V(16.7, y, -48.05), 0.04, 0.04, '#5a3b1c'));
    const roof = thatchRoof({ cx, cy: E - 0.05, cz, half: 5.9, rise: RG - E, len: 10.2, rows: 10, bw: 0.56, seed: 5 });
    // ramp
    const h0 = baseHeight(12, -33), ang = Math.atan2(D.y - h0, 7);
    for (let z = -33.15; z > -40; z -= 0.36) {
      const th = 0.1;
      timber.push(mk(new THREE.BoxGeometry(3.95, th, 0.32), M(12, groundHeight(12, z) - th / 2, z, ang, (r() - 0.5) * 0.02, 0), pick(['#a9763f', '#b98650', '#946236'], r()), 0.08));
    }
    for (const x of [10.15, 12, 13.85]) timber.push(limb(V(x, h0 - 0.15, -32.9), V(x, D.y - 0.15, -40.1), 0.09, 0.09, '#5a3b1c'));
    for (const x of [9.92, 14.08]) {
      for (const z of [-34.2, -36.4, -38.6]) {
        const y = groundHeight(x < 12 ? 10.1 : 13.9, z);
        timber.push(limb(V(x, y - 0.05, z), V(x, y + 1.05, z), 0.06, 0.05, '#6b4423'));
      }
      timber.push(limb(V(x, h0 + 1.05, -33.3), V(x, D.y + 1.05, -40), 0.045, 0.045, ROPE));
    }
    // soft furnishings
    const mats: [number, number, string, string, string, number][] = [
      [9.0, -45.6, '#d85a3c', '#b8402a', '#f2dcae', 0.1], [12.2, -46, '#2a9aa0', '#1e7a82', '#f2dcae', -0.05], [15.0, -45.2, '#e9ae3c', '#c88a28', '#f6ead0', 0.14],
    ];
    for (const [x, z, a, b, e, yaw] of mats) {
      soft.push(mk(matGeo(1.25, 3.0, a, b, e), M(x, D.y + 0.02, z, 0, yaw, 0), '#ffffff', 0));
      soft.push(mk(new THREE.CylinderGeometry(0.17, 0.17, 0.9, 8), M(x, D.y + 0.2, z - 1.15, 0, 0, Math.PI / 2, 1, 1, 1), '#f6ead0', 0.06));
    }
    // crate with slats (matches collider at 16,-41)
    for (let k = 0; k < 4; k++) soft.push(mk(new THREE.BoxGeometry(1.1, 0.17, 0.9), M(16, D.y + 0.1 + k * 0.19, -41, 0, (r() - 0.5) * 0.04, 0), pick(['#8a5a2f', '#7b4f2a', '#9a6a3a'], r()), 0.08));
    for (const [x, z] of [[15.6, -40.6], [16.4, -40.6], [15.6, -41.4], [16.4, -41.4]]) soft.push(limb(V(x!, D.y, z!), V(x!, D.y + 0.8, z!), 0.05, 0.05, '#5a3b1c'));
    soft.push(mk(new THREE.TorusGeometry(0.28, 0.06, 5, 10), M(8.2, D.y + 0.06, -41.5, Math.PI / 2, 0, 0), ROPE, 0.08));
    for (const [x, z, h] of [[8, -47.3, 0.5], [8.7, -47.2, 0.36]] as const) {
      soft.push(mk(new THREE.SphereGeometry(0.28, 8, 6), M(x, D.y + h * 0.55, z, 0, 0, 0, 1, 1.15, 1), '#b86a3c', 0.1, '#d88a52', D.y, D.y + 0.7));
      soft.push(mk(new THREE.CylinderGeometry(0.1, 0.14, 0.14, 8), M(x, D.y + h * 0.55 + 0.34, z), '#a85a30', 0.1));
    }
    for (const [x, c] of [[8.6, '#2a9aa0'], [15.3, '#d85a3c']] as const) soft.push(mk(new THREE.BoxGeometry(0.9, 1.25, 0.02), M(x, 3.1, -41.0, 0, 0.15, 0.04), c, 0.1, '#f2dcae', 2.5, 3.8));
    for (let k = 0; k < 6; k++) soft.push(mk(new THREE.ConeGeometry(0.05, 0.4, 4), M(10.3 + k * 0.12, 3.4 + (k % 2) * 0.05, -42.5, 0, 0, 3.1 + (r() - 0.5) * 0.3), pick(['#8a9a3a', '#6a8a3a'], r()), 0.1));
    timber.push(limb(V(10.2, 3.85, -42.5), V(10.9, 3.85, -42.5), 0.02, 0.02, ROPE));
    // lantern frame
    timber.push(limb(V(cx, 5.9, -45.5), V(cx, 3.9, -45.5), 0.012, 0.012, ROPE));
    soft.push(mk(new THREE.CylinderGeometry(0.15, 0.12, 0.08, 6), M(cx, 3.9, -45.5), '#3a2a1a', 0.05));
    return { timber: merge(timber), thatch: merge(roof), deck: merge(deck), soft: merge(soft) };
  }, []);
  const m = useMemo(() => mat(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })), []);
  const roofM = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: new THREE.Color('#3a2408'), emissiveIntensity: 0.4 }), []);
  return (
    <group>
      <mesh geometry={timber} material={m} castShadow receiveShadow userData={{ cameraBlocker: true }} />
      <mesh geometry={thatch} material={roofM} castShadow receiveShadow userData={{ cameraBlocker: true }} />
      <mesh geometry={deck} material={m} castShadow receiveShadow />
      <mesh geometry={soft} material={m} castShadow receiveShadow />
      <mesh position={[12, 3.7, -45.5]}><icosahedronGeometry args={[0.17, 1]} /><meshBasicMaterial color={col('#ffc874')} fog={false} /></mesh>
      <pointLight position={[12, 3.5, -45.2]} color="#ffb060" intensity={6} distance={9} decay={2} />
    </group>
  );
}
