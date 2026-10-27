import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { plantsInChunk, plantGeometry, type Plant } from "./vegetation";
import broadleafUrl from "../../assets/railay/broadleaf.png?url";
import fernUrl from "../../assets/railay/fern.png?url";
const kinds: Plant["kind"][] = ["tree", "palm", "mangrove", "fern", "pandanus"];
type Kit = ReturnType<typeof plantGeometry>;
function Batch({
  plants,
  g,
  mat,
  leaves = false,
}: {
  plants: Plant[];
  g: T.BufferGeometry;
  mat: T.Material;
  leaves?: boolean;
}) {
  const mesh = useRef<T.InstancedMesh>(null);
  useEffect(() => {
    if (!mesh.current) return;
    const o = new T.Object3D(),
      c = new T.Color();
    plants.forEach((p, i) => {
      o.position.set(p.x, p.y - 0.08, p.z);
      o.rotation.y = p.rotation;
      o.scale.setScalar(p.scale);
      o.updateMatrix();
      mesh.current!.setMatrixAt(i, o.matrix);
      c.set(leaves ? "#acc297" : "#66503b");
      if (leaves)
        c.offsetHSL(
          (p.tint - 0.5) * 0.035,
          (p.tint - 0.5) * 0.1,
          (p.tint - 0.5) * 0.055,
        );
      mesh.current!.setColorAt(i, c);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [plants, leaves]);
  return (
    <instancedMesh ref={mesh} args={[g, mat, plants.length]} frustumCulled />
  );
}
function Patch({
  x,
  z,
  low,
  kits,
  wood,
  leaf,
  broad,
  fern,
}: {
  x: number;
  z: number;
  low: boolean;
  kits: Record<string, Kit>;
  wood: T.Material;
  leaf: T.Material;
  broad: T.Material;
  fern: T.Material;
}) {
  const plants = useMemo(() => plantsInChunk(x, z, low), [x, z, low]);
  const [level, setLevel] = useState(3),
    timer = useRef(0);
  useFrame(({ camera }, dt) => {
    timer.current += dt;
    if (timer.current < 0.7) return;
    timer.current = 0;
    const d = Math.hypot(
      camera.position.x - x - 150,
      camera.position.z - z - 150,
    );
    const next =
      camera.position.y > 400
        ? 3
        : d < (low ? 180 : 280)
          ? 2
          : d < 850
            ? 1
            : d < (low ? 1300 : 2300)
              ? 3
              : 0;
    if (next !== level) setLevel(next);
  });
  if (!level) return null;
  return (
    <group name={`flora-${x}-${z}-lod${level}`}>
      {kinds.map((kind) => {
        if (kind === "fern" && level !== 2) return null;
        const ps = plants.filter((p) => p.kind === kind),
          kit = kits[`${kind}-${level === 2}`]!;
        if (!ps.length) return null;
        return (
          <group key={kind}>
            {kit.wood && level !== 3 && (
              <Batch plants={ps} g={kit.wood} mat={wood} />
            )}
            <Batch
              plants={ps}
              g={kit.leaves}
              mat={
                kind === "fern"
                  ? fern
                  : kind === "tree" || kind === "mangrove"
                    ? broad
                    : leaf
              }
              leaves
            />
          </group>
        );
      })}
    </group>
  );
}
function useFoliageTextures() {
  const fallback = useMemo(
    () =>
      [0, 1].map(() => {
        const bytes = new Uint8Array(32 * 32 * 4);
        for (let y = 0; y < 32; y++)
          for (let x = 0; x < 32; x++) {
            const n = (y * 32 + x) * 4;
            bytes[n] = 60;
            bytes[n + 1] = 112;
            bytes[n + 2] = 38;
            bytes[n + 3] =
              (x - 16) ** 2 / 200 + (y - 16) ** 2 / 230 < 1 ? 255 : 0;
          }
        const t = new T.DataTexture(bytes, 32, 32);
        t.needsUpdate = true;
        t.colorSpace = T.SRGBColorSpace;
        return t;
      }),
    [],
  );
  const [textures, setTextures] = useState<T.Texture[]>(fallback);
  useEffect(() => {
    let active = true;
    const loaded: T.Texture[] = [];
    [broadleafUrl, fernUrl].forEach((url, index) => {
      new T.TextureLoader().load(
        url,
        (t) => {
          loaded.push(t);
          if (!active) {
            t.dispose();
            return;
          }
          t.colorSpace = T.SRGBColorSpace;
          t.anisotropy = 2;
          setTextures((old) => old.map((a, i) => (i === index ? t : a)));
        },
        undefined,
        () => {
          /* Keep the generated leaf mask on failed image requests. */
        },
      );
    });
    return () => {
      active = false;
      loaded.forEach((t) => t.dispose());
      fallback.forEach((t) => t.dispose());
    };
  }, [fallback]);
  return textures;
}
export function Vegetation({ low }: { low: boolean }) {
  const textures = useFoliageTextures();
  const time = useMemo(() => ({ value: 0 }), []);
  const kits = useMemo(
    () =>
      Object.fromEntries(
        kinds.flatMap((k) =>
          [false, true].map((d) => [`${k}-${d}`, plantGeometry(k, d)]),
        ),
      ),
    [],
  );
  const wood = useMemo(() => new T.MeshStandardMaterial({ roughness: 1 }), []);
  const leaf = useMemo(() => {
    const m = new T.MeshStandardMaterial({
      roughness: 0.94,
      side: T.DoubleSide,
    });
    m.onBeforeCompile = (s) => {
      s.uniforms.windTime = time;
      s.vertexShader = s.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float windTime;",
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
 transformed.x += sin(windTime*.8+position.y*.6+instanceMatrix[3].x*.1)*.06*max(0.,position.y-2.);
 `,
        );
    };
    return m;
  }, [time]);
  const [broad, fern] = useMemo(
    () =>
      textures.map((t) => {
        t.colorSpace = T.SRGBColorSpace;
        t.anisotropy = 2;
        const m = leaf.clone();
        m.map = t;
        m.alphaTest = 0.45;
        m.onBeforeCompile = leaf.onBeforeCompile;
        return m;
      }),
    [textures, leaf],
  );
  useFrame((_, dt) => {
    time.value += Math.min(dt, 0.05);
  });
  useEffect(
    () => () => {
      Object.values(kits).forEach((k) => {
        k.wood?.dispose();
        k.leaves.dispose();
      });
      wood.dispose();
      leaf.dispose();
    },
    [kits, wood, leaf],
  );
  useEffect(
    () => () => {
      broad!.dispose();
      fern!.dispose();
    },
    [broad, fern],
  );
  const cells = useMemo(() => {
    const a = [];
    for (let z = -2100; z < 1500; z += 300)
      for (let x = -2100; x < 1500; x += 300) a.push({ x, z });
    return a;
  }, []);
  return (
    <group name="railay-vegetation">
      {cells.map((c) => (
        <Patch
          key={`${c.x}-${c.z}`}
          {...c}
          low={low}
          kits={kits}
          wood={wood}
          leaf={leaf}
          broad={broad!}
          fern={fern!}
        />
      ))}
    </group>
  );
}
