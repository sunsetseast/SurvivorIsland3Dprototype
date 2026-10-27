import { useMemo, useEffect, useRef } from "react";
import * as T from "three";
import { coastalDebris } from "./coastal";
import { limestoneMaterial } from "./rockMaterial";
export function CoastalDetails({ low }: { low: boolean }) {
  const mesh = useRef<T.InstancedMesh>(null),
    woodMesh = useRef<T.InstancedMesh>(null);
  const rocks = useMemo(() => {
    const g = new T.IcosahedronGeometry(1, 2),
      p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const q =
        0.86 + 0.15 * Math.sin(x * 8 + y * 6) + 0.09 * Math.sin(z * 11 - x * 4);
      p.setXYZ(i, x * q, y * q * 0.7, z * q);
    }
    g.setAttribute(
      "color",
      new T.Float32BufferAttribute(new Float32Array(p.count * 3).fill(0.86), 3),
    );
    g.computeVertexNormals();
    return g;
  }, []);
  const branch = useMemo(() => {
    const g = new T.CylinderGeometry(0.16, 0.23, 5, 7, 4);
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);
  const stone = useMemo(limestoneMaterial, []),
    wood = useMemo(
      () => new T.MeshStandardMaterial({ color: "#776b53", roughness: 1 }),
      [],
    );
  const ps = useMemo(
    () =>
      coastalDebris().filter(
        (p, i) => !low || (p.radius > 0.75 && !p.wood) || i % 2 === 0,
      ),
    [low],
  );
  useEffect(() => {
    const o = new T.Object3D();
    for (const [m, wood] of [
      [mesh.current, false],
      [woodMesh.current, true],
    ] as const) {
      if (!m) continue;
      ps.filter((p) => p.wood === wood).forEach((p, i) => {
        o.position.set(p.x, p.y + p.radius * 0.24, p.z);
        o.rotation.set(wood ? 0.12 : 0, p.turn, wood ? 0.03 : p.variant * 0.21);
        o.scale.setScalar(wood ? 1 : p.radius);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
    const instances = [mesh.current, woodMesh.current];
    return () => instances.forEach((m) => m?.dispose());
  }, [ps]);
  useEffect(
    () => () => {
      rocks.dispose();
      branch.dispose();
      stone.dispose();
      wood.dispose();
    },
    [rocks, branch, stone, wood],
  );
  // Region-wide single batches are frustum-culled; no thousands of object nodes.
  return (
    <group name="tonsai-talus-driftwood">
      <instancedMesh
        ref={mesh}
        args={[rocks, stone, ps.filter((p) => !p.wood).length]}
        dispose={null}
      />
      <instancedMesh
        ref={woodMesh}
        args={[branch, wood, ps.filter((p) => p.wood).length]}
        dispose={null}
      />
    </group>
  );
}
