import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { baseHeight } from "../world";
import { NATURAL_LANDMARKS, SPRING } from "./geography";
const meshPart = (g: T.Group | undefined, n: string) =>
  g?.getObjectByName(n) as T.Mesh | undefined;
export { southernCliffGeometry } from "./limestone";
/** Offline authored meshes share the existing scanned materials. LOD switches do
 * not set React state, regenerate geometry or add independent texture copies. */
export function NaturalLandmarks({
  low,
  landmarks,
  rockMaterial,
  barkMaterial,
}: {
  low: boolean;
  landmarks?: T.Group;
  rockMaterial?: T.Material | T.Material[];
  barkMaterial?: T.Material | T.Material[];
}) {
  const ref = useRef<T.Group>(null),
    tick = useRef(1);
  const materials = useMemo(() => {
    const rock = ((Array.isArray(rockMaterial)
      ? rockMaterial[0]
      : rockMaterial
    )?.clone() ??
      new T.MeshStandardMaterial({ roughness: 1 })) as T.MeshStandardMaterial;
    const source = Array.isArray(rockMaterial) ? rockMaterial[0] : rockMaterial;
    if (source) {
      rock.onBeforeCompile = source.onBeforeCompile;
      rock.customProgramCacheKey = source.customProgramCacheKey;
    }
    rock.vertexColors = true;
    rock.side = T.DoubleSide;
    rock.color.setRGB(1.35, 1.33, 1.25);
    const wood = ((Array.isArray(barkMaterial)
      ? barkMaterial[0]
      : barkMaterial
    )?.clone() ??
      new T.MeshStandardMaterial({ roughness: 1 })) as T.MeshStandardMaterial;
    wood.vertexColors = true;
    wood.side = T.DoubleSide;
    wood.color.setRGB(1.6, 1.5, 1.35);
    wood.roughness = 1;
    wood.emissive.set("#8c7663");
    wood.emissiveMap = wood.map;
    wood.emissiveIntensity = 0.15;
    return { rock, wood };
  }, [rockMaterial, barkMaterial]);
  useEffect(
    () => () => {
      materials.rock.dispose();
      materials.wood.dispose();
    },
    [materials],
  );
  useFrame(({ camera }, dt) => {
    tick.current += dt;
    if (tick.current < 0.25) return;
    tick.current = 0;
    ref.current?.children.forEach((site) => {
      const cliff = site.name === "landmark-southern-cliff",
        d = cliff
          ? Math.hypot(
              Math.max(-40 - camera.position.x, 0, camera.position.x - 42),
              camera.position.z - 100,
            )
          : Math.hypot(
              site.position.x - camera.position.x,
              site.position.z - camera.position.z,
            ),
        near = !low && d < (cliff ? 85 : 42);
      site.visible = cliff || d < 145;
      site.children.forEach((m) => {
        m.visible = m.userData.lod === (near ? "near" : "far");
        m.userData.cameraBlocker = m.visible && site.visible;
      });
    });
  });
  const sites = [
    ...NATURAL_LANDMARKS,
    { id: "spring-seep", ...SPRING },
    { id: "southern-cliff", x: 0, z: 0 },
  ];
  return (
    <group ref={ref} name="tonsai-authored-landmarks">
      {sites.map((l) => (
        <group
          key={l.id}
          name={"landmark-" + l.id}
          position={[
            l.x,
            l.id === "southern-cliff" ? 0 : baseHeight(l.x, l.z),
            l.z,
          ]}
        >
          {(["near", "far"] as const).flatMap((lod) =>
            (["wood", "rock"] as const).map((kind) => {
              const m = meshPart(landmarks, `${l.id}-${kind}-${lod}`);
              return m ? (
                <mesh
                  key={kind + lod}
                  name={m.name}
                  geometry={m.geometry}
                  material={materials[kind]}
                  visible={lod === "far"}
                  castShadow={!low}
                  receiveShadow
                  dispose={null}
                  userData={{ cameraBlocker: true, lod, site: l.id }}
                />
              ) : null;
            }),
          )}
        </group>
      ))}
    </group>
  );
}
