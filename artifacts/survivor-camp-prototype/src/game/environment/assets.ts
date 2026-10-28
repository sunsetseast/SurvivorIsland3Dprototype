import { useEffect, useState } from "react";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import rock from "../../assets/camp/limestone.glb?url";
import tree from "../../assets/camp/coastal-tree.glb?url";
import botanical from "../../assets/camp/palms.glb?url";
import fern from "../../assets/tonsai/fern_02.glb?url";

export type EnvironmentKit = {
  rock?: T.Group;
  tree?: T.Group;
  botanical?: T.Group;
  fern?: T.Group;
  settled: boolean;
  failures: string[];
};
/** HTTP caching reuses bytes; parsed meshes/maps have one location owner.
 * Late callbacks after unmount/timeout are disposed, never attached to a new scene. */
export function disposeAsset(root: T.Object3D) {
  const resources = new Set<T.BufferGeometry | T.Material | T.Texture>();
  root.traverse((o) => {
    const m = o as T.Mesh;
    if (!m.isMesh) return;
    resources.add(m.geometry);
    for (const mat of [m.material].flat()) {
      resources.add(mat);
      for (const t of Object.values(mat))
        if (t instanceof T.Texture) resources.add(t);
    }
  });
  resources.forEach((r) => r.dispose());
}
export function useEnvironmentKit() {
  const [kit, setKit] = useState<EnvironmentKit>({
    settled: false,
    failures: [],
  });
  useEffect(() => {
    let active = true,
      pending = 4;
    const owned: T.Group[] = [],
      timers: ReturnType<typeof setTimeout>[] = [];
    for (const [id, url] of Object.entries({ rock, tree, botanical, fern })) {
      let complete = false;
      const finish = (scene?: T.Group) => {
        if (complete || !active) {
          if (scene) disposeAsset(scene);
          return;
        }
        complete = true;
        pending--;
        if (scene) {
          owned.push(scene);
          scene.updateMatrixWorld(true);
          scene.traverse((o) => {
            const m = o as T.Mesh;
            if (!m.isMesh) return;
            // Bake glTF node transforms once for instanced consumers.
            m.geometry.applyMatrix4(m.matrixWorld);
            m.matrix.identity();
            m.position.set(0, 0, 0);
            m.rotation.set(0, 0, 0);
            m.scale.setScalar(1);
            if (id === "fern") {
              m.geometry.computeBoundingBox();
              const b = m.geometry.boundingBox!;
              m.geometry.translate(
                -(b.min.x + b.max.x) * 0.5,
                -b.min.y,
                -(b.min.z + b.max.z) * 0.5,
              );
            }
            for (const mat of [m.material].flat()) {
              const p = mat as T.MeshStandardMaterial;
              p.roughness = 0.93;
              p.metalness = 0;
              if (id === "rock") {
                p.color.setRGB(1.3, 1.32, 1.25);
                p.normalScale.set(0.7, 0.7);
                // Bleached coastal mineral palette, retaining the photographed
                // fracture variation and a restrained warm oxide contribution.
                p.onBeforeCompile = (shader) => {
                  shader.fragmentShader = shader.fragmentShader.replace(
                    "#include <map_fragment>",
                    `#include <map_fragment>
                float mineralLuma=dot(diffuseColor.rgb,vec3(.25,.6,.15));
                vec3 paleMineral=vec3(mineralLuma*1.15+.075)*vec3(1.04,1.02,.98);
                diffuseColor.rgb=mix(diffuseColor.rgb,paleMineral,.72);
              `,
                  );
                };
                p.customProgramCacheKey = () => "camp-limestone-pbr-grade-v1";
              }
              if (id === "fern" || /leaves/.test(m.name)) {
                p.side = T.DoubleSide;
                p.alphaTest = 0.45;
                p.transparent = false;
                p.depthWrite = true;
              }
              if (id === "tree" && /leaves/.test(m.name)) {
                p.color.setRGB(1.15, 1.4, 1.05);
                p.emissive.set("#708d42");
                p.emissiveIntensity = 0.32;
                p.emissiveMap = p.map;
              }
              if (p.map) p.map.anisotropy = 4;
            }
          });
        }
        setKit((prev) => ({
          ...prev,
          ...(scene ? { [id]: scene } : {}),
          settled: pending === 0,
          failures: scene ? prev.failures : [...prev.failures, id],
        }));
      };
      const timer = setTimeout(() => finish(), 12000);
      timers.push(timer);
      new GLTFLoader().load(
        url,
        ({ scene }) => {
          clearTimeout(timer);
          finish(scene);
        },
        undefined,
        () => {
          clearTimeout(timer);
          finish();
        },
      );
    }
    return () => {
      active = false;
      timers.forEach(clearTimeout);
      owned.forEach(disposeAsset);
    };
  }, []);
  return kit;
}
export function meshPart(group: T.Group | undefined, name: string) {
  return group?.getObjectByName(name) as T.Mesh | undefined;
}
