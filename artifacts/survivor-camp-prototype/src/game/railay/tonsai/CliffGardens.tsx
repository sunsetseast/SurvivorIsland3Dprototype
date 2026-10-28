import { useEffect, useMemo } from "react";
import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import anchors from "../../../assets/tonsai/hero-anchors.json";
/** Every root/vine begins on a sampled upward-facing shelf of the actual sculpt.
 * Upper canopy is instanced by TropicalForest. No floating random wall plants. */
export function CliffGardens({ low }: { low: boolean }) {
  const kit = useMemo(() => {
    const roots: T.BufferGeometry[] = [],
      leaves: T.BufferGeometry[] = [],
      soil: T.BufferGeometry[] = [];
    anchors.forEach((a, i) => {
      if (i >= 250 || i % (low ? 8 : 4) !== 0) return;
      const p = new T.Vector3(a.x, a.y, a.z),
        n = new T.Vector3(...a.normal).normalize();
      const disc = new T.CircleGeometry(1.4 * a.scale, 7);
      disc.applyQuaternion(
        new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), n),
      );
      disc.translate(...p.clone().addScaledVector(n, 0.12).toArray());
      soil.push(disc);
      for (let vine = 0; vine < 2; vine++) {
        const points = Array.from({ length: 8 }, (_, j) =>
          p
            .clone()
            .add(
              new T.Vector3(
                Math.sin(j * 0.7 + i) * 0.22 + vine * 0.3,
                -j * (0.6 + a.scale),
                Math.cos(j * 0.6 + i) * 0.2,
              ),
            )
            .addScaledVector(n, 0.12 + j * 0.055),
        );
        roots.push(
          new T.TubeGeometry(
            new T.CatmullRomCurve3(points),
            10,
            0.035,
            4,
            false,
          ),
        );
        points.slice(1).forEach((q, j) => {
          const g = new T.PlaneGeometry(0.21, 0.36);
          g.rotateY(i + j);
          g.rotateZ(j % 2 ? 0.55 : -0.55);
          g.translate(...q.toArray());
          leaves.push(g);
        });
      }
    });
    const merge = (ps: T.BufferGeometry[]) => {
      const g = mergeGeometries(ps, false)!;
      ps.forEach((p) => p.dispose());
      return g;
    };
    return { roots: merge(roots), leaves: merge(leaves), soil: merge(soil) };
  }, [low]);
  const mats = useMemo(
    () => ({
      wood: new T.MeshStandardMaterial({ color: "#665036", roughness: 1 }),
      leaf: new T.MeshStandardMaterial({
        color: "#557c2a",
        roughness: 0.95,
        side: T.DoubleSide,
      }),
      soil: new T.MeshStandardMaterial({
        color: "#46452a",
        roughness: 1,
        side: T.DoubleSide,
      }),
    }),
    [],
  );
  useEffect(() => () => Object.values(kit).forEach((g) => g.dispose()), [kit]);
  useEffect(
    () => () => Object.values(mats).forEach((m) => m.dispose()),
    [mats],
  );
  return (
    <group name="tonsai-anchored-cliff-gardens">
      <mesh geometry={kit.roots} material={mats.wood} />
      <mesh geometry={kit.leaves} material={mats.leaf} />
      <mesh geometry={kit.soil} material={mats.soil} />
    </group>
  );
}
