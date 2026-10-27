import { TONSAI_KARSTS, rockInterior } from "./tonsai/domain";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import {
  GRID,
  SIZE,
  prepareTerrain,
  gridHeight,
  heightAt,
  slopeAt,
  isMud,
  chunkLod,
} from "./terrain";
import {
  KARSTS,
  CAVE,
  LAGOON,
  inside,
  edgeDistance,
  noise,
  type P,
} from "./geography";
import { groundMaterial, cliffMaterial, biomeColor } from "./materials";
export function makeChunk(
  x: number,
  z: number,
  stride: number,
  tonsaiReady = false,
) {
  const n = GRID.chunk / (GRID.step * stride),
    ps: number[] = [],
    cs: number[] = [],
    ix: number[] = [];
  const { shores } = prepareTerrain();
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const wx = x + i * GRID.step * stride,
        wz = z + j * GRID.step * stride,
        gi = Math.round((wx - GRID.min) / GRID.step),
        gj = Math.round((wz - GRID.min) / GRID.step),
        rawHeight = gridHeight(gi, gj),
        h =
          tonsaiReady &&
          TONSAI_KARSTS.some((k) => edgeDistance(wx, wz, k.outline) < 9)
            ? Math.min(
                rawHeight,
                0.04 +
                  Math.min(5.8, Math.max(0, shores[gj * SIZE + gi]!) * 0.065),
              )
            : rawHeight;
      ps.push(wx, h, wz);
      const c = biomeColor(
        wx,
        wz,
        h,
        slopeAt(wx, wz),
        isMud(wx, wz),
        shores[gj * SIZE + gi]!,
      );
      cs.push(c.r, c.g, c.b);
    }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      if (
        tonsaiReady &&
        rockInterior(
          x + (i + 0.5) * GRID.step * stride,
          z + (j + 0.5) * GRID.step * stride,
        )
      )
        continue;
      ix.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2);
    }
  // Matching outer edge vertices plus down skirts prevent mixed-LOD cracks.
  const border: number[] = [];
  for (let i = 0; i <= n; i++) border.push(i);
  for (let j = 1; j <= n; j++) border.push(j * (n + 1) + n);
  for (let i = n - 1; i >= 0; i--) border.push(n * (n + 1) + i);
  for (let j = n - 1; j > 0; j--) border.push(j * (n + 1));
  const start = ps.length / 3;
  for (const a of border) {
    ps.push(ps[a * 3]!, ps[a * 3 + 1]! - 12, ps[a * 3 + 2]!);
    cs.push(cs[a * 3]!, cs[a * 3 + 1]!, cs[a * 3 + 2]!);
  }
  for (let i = 0; i < border.length; i++) {
    const j = (i + 1) % border.length;
    ix.push(
      border[i]!,
      start + i,
      border[j]!,
      border[j]!,
      start + i,
      start + j,
    );
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(ps, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(cs, 3));
  g.setIndex(ix);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
function Chunk({
  x,
  z,
  material,
  low,
  tonsaiReady,
}: {
  x: number;
  z: number;
  material: T.Material;
  low: boolean;
  tonsaiReady: boolean;
}) {
  const [lod, setLod] = useState(2),
    time = useRef(0);
  const g = useMemo(
    () => makeChunk(x, z, lod, tonsaiReady),
    [x, z, lod, tonsaiReady],
  );
  useEffect(() => () => g.dispose(), [g]);
  useFrame(({ camera }, dt) => {
    time.current += dt;
    if (time.current < 0.5) return;
    time.current = 0;
    const next = chunkLod(
      Math.hypot(camera.position.x - x - 150, camera.position.z - z - 150),
      low,
    );
    if (next !== lod) setLod(next);
  });
  return (
    <mesh
      name={`terrain-${x}-${z}-lod${lod}`}
      geometry={g}
      material={material}
      receiveShadow
      userData={{ terrain: true }}
    />
  );
}
function contour(p: P[], spacing = 7) {
  const out: P[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!,
      b = p[(i + 1) % p.length]!,
      n = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / spacing));
    for (let j = 0; j < n; j++)
      out.push({
        x: a.x + ((b.x - a.x) * j) / n,
        z: a.z + ((b.z - a.z) * j) / n,
      });
  }
  return out;
}
export function makeCliff(k: (typeof KARSTS)[number], proxy = false) {
  const p = contour(k.outline, proxy ? 24 : 7),
    c = { x: 0, z: 0 };
  // Use polygon average, independent of vertex density.
  c.x = p.reduce((s, a) => s + a.x, 0) / p.length;
  c.z = p.reduce((s, a) => s + a.z, 0) / p.length;
  const ps: number[] = [],
    cs: number[] = [],
    ix: number[] = [],
    rings = proxy ? 5 : 20;
  for (let j = 0; j <= rings; j++)
    for (let i = 0; i < p.length; i++) {
      const a = p[i]!,
        t = j / rings,
        prev = p[(i + p.length - 1) % p.length]!,
        next = p[(i + 1) % p.length]!;
      const tx = next.x - prev.x,
        tz = next.z - prev.z,
        len = Math.hypot(tx, tz) || 1;
      let dx = -tz,
        dz = tx;
      if (!inside(a.x + dx / len, a.z + dz / len, k.outline)) {
        dx = -dx;
        dz = -dz;
      }
      if (k.id === "lagoon-rim") {
        dx = -dx;
        dz = -dz;
      }
      const inset =
        t * 18 -
        Math.sin(t * Math.PI) * 15 +
        Math.sin(i * 0.83 + k.seed) * 1.3 * Math.sin(t * Math.PI);
      const x = a.x + (dx / len) * inset,
        z = a.z + (dz / len) * inset;
      const top = heightAt(a.x + (dx / len) * 22, a.z + (dz / len) * 22);
      const y =
        2 +
        t * Math.max(8, top - 2) +
        Math.sin(i * 0.69 + j * 0.5) * 0.6 * Math.sin(t * Math.PI);
      ps.push(x, y, z);
      const col = new T.Color().setHSL(
        0.105 + noise(x, z) * 0.012,
        0.13,
        0.49 + noise(x * 0.3, z * 0.3) * 0.065,
      );
      cs.push(col.r, col.g, col.b);
    }
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < p.length; i++) {
      const a = j * p.length + i,
        b = j * p.length + ((i + 1) % p.length);
      const cx = (ps[a * 3]! + ps[b * 3]!) / 2,
        cz = (ps[a * 3 + 2]! + ps[b * 3 + 2]!) / 2;
      if (Math.hypot(cx - CAVE.x, cz - CAVE.z) < 21 && ps[a * 3 + 1]! < 16)
        continue;
      ix.push(a, b, a + p.length, b, b + p.length, a + p.length);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(ps, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(cs, 3));
  g.setIndex(ix);
  g.computeVertexNormals();
  return g;
}
export function RailayTerrain({
  low,
  tonsaiReady = false,
}: {
  low: boolean;
  tonsaiReady?: boolean;
}) {
  const mat = useMemo(groundMaterial, []),
    rock = useMemo(() => {
      const m = cliffMaterial();
      m.side = T.DoubleSide;
      return m;
    }, []);
  const cliffDefs = [
    ...KARSTS.filter((k) => !TONSAI_KARSTS.includes(k)),
    { id: "lagoon-rim", outline: LAGOON, height: 95, seed: 91 },
  ];
  const cliffs = useMemo(() => cliffDefs.map((k) => makeCliff(k)), []);
  const cameraCliffs = useMemo(
    () => cliffDefs.map((k) => makeCliff(k, true)),
    [],
  );
  const chunks = useMemo(() => {
    const out = [];
    for (let z = GRID.min; z < GRID.max; z += GRID.chunk)
      for (let x = GRID.min; x < GRID.max; x += GRID.chunk) {
        let land = false;
        for (let j = 0; j <= 4; j++)
          for (let i = 0; i <= 4; i++)
            if (heightAt(x + i * 75, z + j * 75) > -12) land = true;
        if (land) out.push({ x, z });
      }
    return out;
  }, []);
  useEffect(
    () => () => {
      mat.dispose();
      rock.dispose();
      cliffs.forEach((g) => g.dispose());
      cameraCliffs.forEach((g) => g.dispose());
    },
    [mat, rock, cliffs, cameraCliffs],
  );
  return (
    <group name="railay-terrain">
      <group>
        {chunks.map((c) => (
          <Chunk
            key={`${c.x},${c.z}`}
            {...c}
            material={mat}
            low={low}
            tonsaiReady={tonsaiReady}
          />
        ))}
      </group>
      {cameraCliffs.map((g, i) => (
        <mesh
          key={`camera-${i}`}
          name={`camera-envelope-${i}`}
          visible={false}
          geometry={g}
          material={rock}
          userData={{ cameraBlocker: true }}
        />
      ))}
      {cliffs.map((g, i) => (
        <mesh key={i} name={cliffDefs[i]!.id} geometry={g} material={rock} />
      ))}
    </group>
  );
}

/** Distant mainland context continues beyond the playable extraction. Never an offshore island cap. */
export function MainlandContext() {
  const mat = useMemo(groundMaterial, []);
  const g = useMemo(() => {
    const ps: number[] = [],
      cs: number[] = [],
      ix: number[] = [],
      n = 70,
      step = 90;
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++) {
        const x = -2100 + i * step,
          z = -7500 + j * step;
        const west = -1240 + Math.sin(z * 0.001) * 120;
        const rise = Math.max(0, Math.min(1, (-z - 2100) / 800));
        const h =
          x < west
            ? -35
            : 6 +
              rise *
                (90 +
                  55 * Math.sin(x * 0.005 + z * 0.003) +
                  35 * Math.sin(z * 0.007));
        ps.push(x, h, z);
        const c = new T.Color(h < 0 ? "#58736a" : "#315b36");
        c.multiplyScalar(0.9 + noise(x * 0.2, z * 0.2) * 0.1);
        cs.push(c.r, c.g, c.b);
      }
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i;
        const x = -2100 + i * step,
          z = -7500 + j * step;
        if (z > -2100 && x < 1500) continue;
        ix.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2);
      }
    const b = new T.BufferGeometry();
    b.setAttribute("position", new T.Float32BufferAttribute(ps, 3));
    b.setAttribute("color", new T.Float32BufferAttribute(cs, 3));
    b.setIndex(ix);
    b.computeVertexNormals();
    return b;
  }, []);
  useEffect(
    () => () => {
      g.dispose();
      mat.dispose();
    },
    [g, mat],
  );
  return <mesh name="distant-mainland-context" geometry={g} material={mat} />;
}
