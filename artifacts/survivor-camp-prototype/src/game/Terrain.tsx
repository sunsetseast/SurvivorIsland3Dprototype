import { recordStage } from "./environment/profile";
import { useEffect, useMemo } from "react";
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

export { CoastalWater as Ocean } from "./environment/CoastalWater";

export { TropicalSky as Sky } from "./environment/TropicalSky";
