import { recordStage } from "./environment/profile";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TERRAIN_EXTENT } from "./environment/geography";
import { baseHeight, shorelineX } from "./world";
import { campGroundMaterial } from "./environment/ground";

const { minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 } = TERRAIN_EXTENT;
export function Terrain({ low = false }: { low?: boolean }) {
  const mat = useMemo(campGroundMaterial, []);
  const chunks = useMemo(() => {
    const stageStart = performance.now();
    const out: THREE.BufferGeometry[] = [];
    for (let x = X0; x < X1; x += 48)
      for (let z = Z0; z < Z1; z += 48) {
        const w = Math.min(48, X1 - x),
          d = Math.min(48, Z1 - z),
          step = low ? 2.5 : 1.5;
        const g = new THREE.PlaneGeometry(
          w,
          d,
          Math.ceil(w / step),
          Math.ceil(d / step),
        );
        g.rotateX(-Math.PI / 2);
        g.translate(x + w / 2, 0, z + d / 2);
        const p = g.attributes.position!,
          uv = g.attributes.uv!;
        for (let i = 0; i < p.count; i++) {
          const xx = p.getX(i),
            zz = p.getZ(i);
          p.setY(i, baseHeight(xx, zz));
          uv.setXY(i, (xx - X0) / (X1 - X0), 1 - (zz - Z0) / (Z1 - Z0));
        }
        g.computeVertexNormals();
        g.computeBoundingSphere();
        out.push(g);
      }
    recordStage("terrain-meshes", stageStart);
    return out;
  }, [low]);
  useEffect(() => () => chunks.forEach((g) => g.dispose()), [chunks]);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <group name="tonsai-continuous-ground">
      {chunks.map((g, i) => (
        <mesh
          key={i}
          name={"terrain-chunk-" + i}
          geometry={g}
          material={mat}
          receiveShadow
        />
      ))}
    </group>
  );
}

export {CoastalWater as Ocean} from "./environment/CoastalWater";

export const SUN_DIR = new THREE.Vector3(-0.65, 0.76, -0.4).normalize();

export function Sky() {
  const dome = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(120, 24, 14);
    const p = g.attributes.position!,
      c = new Float32Array(p.count * 3);
    const hor = new THREE.Color("#d6e2db"),
      mid = new THREE.Color("#aad2db"),
      top = new THREE.Color("#4d9dbd"),
      t = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const k = Math.max(0, p.getY(i) / 120);
      t.copy(hor)
        .lerp(mid, Math.min(1, k * 3.2))
        .lerp(top, Math.max(0, (k - 0.25) * 1.5));
      c.set([t.r, t.g, t.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  const glow = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!,
      gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,250,225,1)");
    gr.addColorStop(0.08, "rgba(255,240,190,0.95)");
    gr.addColorStop(0.25, "rgba(255,205,130,0.35)");
    gr.addColorStop(1, "rgba(255,190,120,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => glow.dispose(), [glow]);
  useFrame(({ camera }) => {
    dome.current?.position.copy(camera.position);
  });
  return (
    <group ref={dome}>
      <mesh geometry={geo} renderOrder={-10}>
        <meshBasicMaterial
          vertexColors
          side={THREE.BackSide}
          fog={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={SUN_DIR.clone().multiplyScalar(110)}
        renderOrder={-9}
        onUpdate={(m) => m.lookAt(0, 0, 0)}
      >
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial
          map={glow}
          transparent
          fog={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
