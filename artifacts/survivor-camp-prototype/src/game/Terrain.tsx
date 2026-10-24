import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { baseHeight, shorelineX } from './world';
import { bakeGround } from './groundTexture';

const X0 = -92, X1 = 60, Z0 = -86, Z1 = 60;

export function Terrain() {
  const { geo, tex } = useMemo(() => {
    const step = 1.25, nx = Math.round((X1 - X0) / step), nz = Math.round((Z1 - Z0) / step);
    const g = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, nx, nz);
    g.rotateX(-Math.PI / 2);
    g.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    const p = g.attributes.position!, uv = g.attributes.uv!;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, baseHeight(x, z));
      uv.setXY(i, (x - X0) / (X1 - X0), 1 - (z - Z0) / (Z1 - Z0));
    }
    g.computeVertexNormals();
    return { geo: g, tex: bakeGround(X0, X1, Z0, Z1, 896, 896) };
  }, []);
  return <mesh geometry={geo} receiveShadow><meshLambertMaterial map={tex} /></mesh>;
}

function rippleTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#9fb8bd'; g.fillRect(0, 0, 256, 256);
  let s = 3;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 220; i++) {
    const x = r() * 256, y = r() * 256, w = 8 + r() * 26;
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      g.strokeStyle = `rgba(255,255,255,${0.07 + r() * 0.16})`; g.lineWidth = 1 + r() * 1.6;
      g.beginPath(); g.ellipse(x + ox, y + oy, w, w * 0.22, 0, 0, Math.PI * 2); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(70, 70); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function foamTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 64);
  g.globalCompositeOperation = 'destination-out';
  let s = 9;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 260; i++) {
    const y = 10 + r() * 54;
    g.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`;
    g.beginPath(); g.arc(r() * 256, y, 1 + r() * 4 * (y / 64), 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const BANDS = [{ off: -0.1, w: 1.5, ph: 0 }, { off: -2.6, w: 2.4, ph: 2.1 }, { off: -5.8, w: 3.2, ph: 4.2 }];
function foamGeo(off: number, w: number, ph: number) {
  const zs: number[] = [];
  for (let z = -52; z <= 54; z += 1.5) zs.push(z);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  zs.forEach((z, i) => {
    const wob = Math.sin(z * 0.37 + ph) * 0.6 + Math.sin(z * 0.9 + ph * 2) * 0.25;
    const xin = shorelineX(z) + off + wob;
    pos.push(xin, 0, z, xin - w, 0, z); uv.push(i * 0.35, 1, i * 0.35, 0);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function Ocean() {
  const water = useRef<THREE.Mesh>(null);
  const foam = useRef<THREE.Group>(null);
  const rip = useMemo(rippleTexture, []);
  const ft = useMemo(foamTexture, []);
  const geos = useMemo(() => BANDS.map(b => foamGeo(b.off, b.w, b.ph)), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    rip.offset.set(t * 0.0016, t * 0.0009);
    if (water.current) water.current.position.y = Math.sin(t * 0.7) * 0.025;
    foam.current?.children.forEach((m, i) => {
      const b = BANDS[i]!, s = Math.sin(t * 0.55 + b.ph);
      m.position.x = s * 0.9 + 0.4;
      m.position.y = 0.045;
      ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.55 + b.ph + 1.3));
    });
  });
  return (
    <>
      <mesh ref={water} rotation-x={-Math.PI / 2} position={[-220, 0, -10]} renderOrder={1}>
        <planeGeometry args={[360, 520]} />
        <meshPhongMaterial map={rip} color="#34b9bd" emissive="#0b4a58" specular="#ffe9bd" shininess={70} transparent opacity={0.74} depthWrite={false} />
      </mesh>
      <group ref={foam}>
        {geos.map((g, i) => (
          <mesh key={i} geometry={g} renderOrder={2}>
            <meshBasicMaterial map={ft} color="#fffdf2" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
        ))}
      </group>
    </>
  );
}

export const SUN_DIR = new THREE.Vector3(-0.8, 0.42, -0.3).normalize();

export function Sky() {
  const dome = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(120, 24, 14);
    const p = g.attributes.position!, c = new Float32Array(p.count * 3);
    const hor = new THREE.Color('#f3d4a0'), mid = new THREE.Color('#a8d8d4'), top = new THREE.Color('#4b9bc6'), t = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const k = Math.max(0, p.getY(i) / 120);
      t.copy(hor).lerp(mid, Math.min(1, k * 3.2)).lerp(top, Math.max(0, (k - 0.25) * 1.5));
      c.set([t.r, t.g, t.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  const glow = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,250,225,1)'); gr.addColorStop(0.08, 'rgba(255,240,190,0.95)'); gr.addColorStop(0.25, 'rgba(255,205,130,0.35)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  useFrame(({ camera }) => { dome.current?.position.copy(camera.position); });
  return (
    <group ref={dome}>
      <mesh geometry={geo} renderOrder={-10}><meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      <mesh position={SUN_DIR.clone().multiplyScalar(110)} renderOrder={-9} onUpdate={m => m.lookAt(0, 0, 0)}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial map={glow} transparent fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
