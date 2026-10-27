import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import canopyUrl from "../../../assets/tonsai/canopy.png?url";
import { useFoliageTextures } from "../Vegetation";
import {
  tonsaiPlants,
  tropicalGeometry,
  SPECIES,
  type Specimen,
  type Botanical,
} from "./tropical";

function Instances({
  plants,
  geometry,
  material,
  leaf = false,
}: {
  plants: Specimen[];
  geometry: T.BufferGeometry;
  material: T.Material;
  leaf?: boolean;
}) {
  const ref = useRef<T.InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const o = new T.Object3D(),
      c = new T.Color();
    plants.forEach((p, i) => {
      o.position.set(p.x, p.y - 0.12, p.z);
      o.rotation.set(0, p.turn, 0);
      o.scale.setScalar(p.scale);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
      c.set(
        leaf
          ? p.kind === "litter"
            ? "#80603b"
            : p.kind === "canopy" || p.kind === "ficus"
              ? "#d5e3b9"
              : "#4e792c"
          : "#68584a",
      );
      c.offsetHSL((p.tint - 0.5) * 0.055, 0, (p.tint - 0.5) * 0.09);
      ref.current!.setColorAt(i, c);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
    const instance = ref.current;
    return () => instance.dispose();
  }, [plants, leaf]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, plants.length]}
      frustumCulled
      dispose={null}
    />
  );
}
function Stand({
  kind,
  variant,
  plants,
  kits,
  wood,
  leaf,
  broad,
  low,
}: {
  kind: Botanical;
  variant: number;
  plants: Specimen[];
  kits: Record<string, ReturnType<typeof tropicalGeometry>>;
  wood: T.Material;
  leaf: T.Material;
  broad: T.Material;
  low: boolean;
}) {
  const [selection, setSelection] = useState({
      near: [] as Specimen[],
      far: plants,
    }),
    last = useRef(new T.Vector3(1e6, 1e6, 1e6)),
    time = useRef(1);
  useFrame(({ camera }, dt) => {
    time.current += dt;
    if (time.current < 0.7 || camera.position.distanceTo(last.current) < 15)
      return;
    time.current = 0;
    last.current.copy(camera.position);
    const near: Specimen[] = [],
      far: Specimen[] = [];
    for (const p of plants) {
      const d = Math.hypot(
        camera.position.x - p.x,
        camera.position.y - p.y,
        camera.position.z - p.z,
      );
      if (["fern", "aroid", "litter"].includes(kind)) {
        if (d < (low ? 65 : 115)) near.push(p);
      } else if (d < (low ? 180 : 270)) near.push(p);
      else if (d < (low ? 1500 : 2800)) far.push(p);
    }
    setSelection({ near, far });
  });
  const cutout = kind === "canopy" || kind === "ficus",
    mat = cutout ? broad : leaf;
  return (
    <group name={`tonsai-${kind}-${variant}`}>
      {[true, false].map((detail) => {
        const ps = detail ? selection.near : selection.far;
        if (!ps.length) return null;
        const kit = kits[`${kind}-${variant}-${detail}`]!;
        return (
          <group key={String(detail)}>
            {detail && kit.wood && (
              <Instances plants={ps} geometry={kit.wood} material={wood} />
            )}
            <Instances plants={ps} geometry={kit.leaves} material={mat} leaf />
          </group>
        );
      })}
    </group>
  );
}
export function TropicalForest({ low }: { low: boolean }) {
  const plants = useMemo(() => tonsaiPlants(low), [low]);
  const fallback = useFoliageTextures();
  const [canopy, setCanopy] = useState<T.Texture | null>(null);
  useEffect(() => {
    let active = true,
      loaded: T.Texture | undefined;
    new T.TextureLoader().load(
      canopyUrl,
      (t) => {
        loaded = t;
        t.colorSpace = T.SRGBColorSpace;
        if (active) setCanopy(t);
        else t.dispose();
      },
      undefined,
      () => {},
    );
    return () => {
      active = false;
      loaded?.dispose();
    };
  }, []);
  const textures = [canopy || fallback[0]];
  const defs = useMemo(
    () =>
      SPECIES.flatMap((kind) =>
        Array.from(
          { length: kind === "canopy" ? 4 : kind === "palm" ? 3 : 2 },
          (_, variant) => ({ kind, variant }),
        ),
      ),
    [],
  );
  const kits = useMemo(
    () =>
      Object.fromEntries(
        defs.flatMap(({ kind, variant }) =>
          [true, false].map((d) => [
            `${kind}-${variant}-${d}`,
            tropicalGeometry(kind, variant, d),
          ]),
        ),
      ),
    [defs],
  );
  const wood = useMemo(() => {
    const m = new T.MeshStandardMaterial({ roughness: 1 });
    m.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 barkP;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nbarkP=position;",
        );
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 barkP;")
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
      float grain=sin(barkP.x*43.+sin(barkP.y*1.8)*.5)*sin(barkP.z*39.+barkP.y*.8);
      float barkVariation=sin(barkP.y*2.4+barkP.x*3.)*sin(barkP.z*6.);
      diffuseColor.rgb*=.69+.18*grain+.1*barkVariation;`,
        );
    };
    return m;
  }, []);
  const leaf = useMemo(
    () => new T.MeshStandardMaterial({ roughness: 0.87, side: T.DoubleSide }),
    [],
  );
  const broad = useMemo(
    () =>
      new T.MeshStandardMaterial({
        roughness: 0.92,
        side: T.DoubleSide,
        map: textures[0],
        alphaTest: 0.4,
        emissive: "#33451b",
        emissiveIntensity: 0.18,
      }),
    [canopy, fallback],
  );
  useEffect(
    () => () => {
      broad.dispose();
    },
    [broad],
  );
  useEffect(
    () => () => {
      wood.dispose();
      leaf.dispose();
      Object.values(kits).forEach((k) => {
        k.wood?.dispose();
        k.leaves.dispose();
      });
    },
    [wood, leaf, kits],
  );
  const groups = useMemo(
    () =>
      defs.map((d) => ({
        ...d,
        plants: plants.filter(
          (p) => p.kind === d.kind && p.variant === d.variant,
        ),
      })),
    [defs, plants],
  );
  return (
    <group name="tonsai-tropical-forest">
      {groups.map((d) => (
        <Stand
          key={`${d.kind}-${d.variant}-${low}`}
          {...d}
          low={low}
          kits={kits}
          wood={wood}
          leaf={leaf}
          broad={broad}
        />
      ))}
    </group>
  );
}
