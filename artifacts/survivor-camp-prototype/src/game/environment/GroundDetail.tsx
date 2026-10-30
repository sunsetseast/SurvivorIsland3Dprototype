import { useEffect, useMemo } from "react";
import * as T from "three";
import { Builder, V, col, limb, merge, mk, M, frond, type Geo } from "../geo";
import {
  baseHeight,
  pathDistance,
  rng,
  shorelineX,
  LANDMARKS,
  BROADLEAF,
} from "../world";
import { FOREST_UNDERSTORY } from "./forest";
/** Terrain-following organic details partitioned into 24 m cells. Everything
 * stays ankle-low and soft; the established movement mesh is authoritative. */
export function GroundDetail() {
  const cells = useMemo(() => {
    const R = rng(1888),
      byCell = new Map<string, Geo[]>();
    const add = (x: number, z: number, g: Geo) => {
      const key = Math.floor(x / 24) + "," + Math.floor(z / 24);
      if (!byCell.has(key)) byCell.set(key, []);
      byCell.get(key)!.push(g);
    };
    for (const p of FOREST_UNDERSTORY) {
      const b = new Builder();
      for (let k = 0; k < 8; k++) {
        const x = p.x + (R() - 0.5) * 3,
          z = p.z + (R() - 0.5) * 3,
          a = R() * Math.PI * 2,
          L = 0.12 + R() * 0.21,
          w = L * 0.48,
          y = baseHeight(x, z) + 0.025;
        const P = V(x, y, z),
          D = V(Math.cos(a) * L, 0, Math.sin(a) * L),
          S = V(-Math.sin(a) * w, 0, Math.cos(a) * w),
          mid = P.clone().addScaledVector(D, 0.5),
          tip = P.clone().add(D),
          c = col(["#62543a", "#8d784f", "#726444", "#514b34"][k % 4]!);
        b.tri(P, mid.clone().add(S), mid.clone().add(V(0, 0.024, 0)), c);
        b.tri(P, mid.clone().add(V(0, 0.024, 0)), mid.clone().sub(S), c);
        b.tri(mid.clone().add(S), tip, mid.clone().add(V(0, 0.024, 0)), c);
        b.tri(mid.clone().add(V(0, 0.024, 0)), tip, mid.clone().sub(S), c);
      }
      add(p.x, p.z, b.build());
      if (R() < 0.16) {
        const x = p.x,
          z = p.z,
          y = baseHeight(x, z),
          a = R() * 6.28,
          L = 0.6 + R();
        add(
          x,
          z,
          limb(
            V(x, y + 0.045, z),
            V(
              x + Math.cos(a) * L,
              baseHeight(x + Math.cos(a) * L, z + Math.sin(a) * L) + 0.04,
              z + Math.sin(a) * L,
            ),
            0.045,
            0.014,
            "#6c624b",
          ),
        );
      }
    }
    for (let i = 0; i < BROADLEAF.length; i++) {
      const p = BROADLEAF[i]!;
      if (i % 5 || p.z < -20 || pathDistance(p.x, p.z) < 5) continue;
      const y = baseHeight(p.x, p.z),
        h = 9.5 * p.scale;
      const curve = new T.CatmullRomCurve3([
        V(p.x + 0.8, y + h, p.z + 0.4),
        V(p.x + 1.0, y + h * 0.74, p.z + 0.7),
        V(p.x + 0.35, y + h * 0.4, p.z + 0.5),
        V(p.x + 0.6, y + 1.6, p.z + 0.6),
      ]);
      add(
        p.x,
        p.z,
        mk(
          new T.TubeGeometry(curve, 14, 0.035, 5, false),
          null,
          "#526247",
          0.08,
        ),
      );
    }
    // A restrained work area beside the shelter: spare bamboo, split husks,
    // collected fuel and leftover fronds. Kept outside ramp, task and seating anchors.
    for (let i = 0; i < 9; i++) {
      const x = 18.8 + (i % 3) * 0.18,
        z = -44 + (i % 3) * 0.25,
        y = baseHeight(x, z) + 0.12 + Math.floor(i / 3) * 0.14;
      add(
        x,
        z,
        limb(
          V(x, y, z - 1.6),
          V(x + 0.1, y, z + 1.7 + (i % 2) * 0.15),
          0.065,
          0.055,
          "#a69460",
        ),
      );
    }
    for (let i = 0; i < 13; i++) {
      const x = -17 + (i % 5) * 0.3,
        z = -36 + Math.floor(i / 5) * 0.28,
        y = baseHeight(x, z) + 0.1 + Math.floor(i / 5) * 0.12;
      add(
        x,
        z,
        limb(
          V(x - 0.55, y, z - 0.15),
          V(x + 0.63, y + 0.035, z + 0.13),
          0.075,
          0.055,
          "#6a5941",
        ),
      );
    }
    for (let i = 0; i < 9; i++) {
      const x = -7 + (R() - 0.5) * 1.8,
        z = -38 + (R() - 0.5) * 1.2,
        y = baseHeight(x, z);
      const g = new T.SphereGeometry(
        0.18 + R() * 0.04,
        9,
        5,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.64,
      );
      g.rotateX(Math.PI * 0.9);
      add(
        x,
        z,
        mk(
          g,
          M(x, y + 0.13, z, 0.12, R() * 6.28, 0, 1, 0.68, 1),
          "#78583c",
          0.12,
        ),
      );
    }
    for (let i = 0; i < 3; i++) {
      const x = 20 + i * 0.65,
        z = -38.5 - i * 0.4,
        b = new Builder();
      frond(
        b,
        V(x, baseHeight(x, z) + 0.04, z),
        0.8 + i,
        0.07,
        1.8,
        0.15,
        col("#8e8155"),
        col("#a29265"),
        R,
        12,
        0.24,
        0.05,
      );
      add(x, z, b.build());
    }
    return [...byCell].map(([key, gs]) => {
      const g = merge(gs);
      g.computeBoundingSphere();
      return { key, g };
    });
  }, []);
  const mat = useMemo(
    () =>
      new T.MeshStandardMaterial({
        vertexColors: true,
        side: T.DoubleSide,
        roughness: 1,
      }),
    [],
  );
  useEffect(
    () => () => {
      cells.forEach((c) => c.g.dispose());
      mat.dispose();
    },
    [cells, mat],
  );
  return (
    <group name="terrain-following-organic-debris">
      {cells.map((c) => (
        <mesh
          key={c.key}
          name={"ground-detail-" + c.key}
          geometry={c.g}
          material={mat}
          receiveShadow
        />
      ))}
    </group>
  );
}
