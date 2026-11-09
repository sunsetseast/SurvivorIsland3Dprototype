import { Group, Mesh, SkinnedMesh, Texture } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { disposeAsset } from "../environment/assets";

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
type Asset = { users: number; loaded?: GLTF; pending: Promise<GLTF> };
const assets = new Map<string, Asset>();
const idleLimit = 5;

export function disposeSkeletons(root: Group) {
  const skeletons = new Set<SkinnedMesh["skeleton"]>();
  root.traverse((object) => {
    if (object instanceof SkinnedMesh) skeletons.add(object.skeleton);
  });
  skeletons.forEach((skeleton) => skeleton.dispose());
}

function trimIdle() {
  const idle = [...assets].filter(([, entry]) => entry.users === 0 && entry.loaded);
  for (const [url, entry] of idle.slice(0, Math.max(0, idle.length - idleLimit))) {
    assets.delete(url);
    disposeSkeletons(entry.loaded!.scene);
    disposeAsset(entry.loaded!.scene);
  }
}

/** Each actor owns its pose and GPU bone buffer. The cached source owns meshes and clip data. */
export function acquireSurvivorAsset(url: string) {
  let entry = assets.get(url);
  if (!entry) {
    const next: Asset = {
      users: 0,
      pending: loader.loadAsync(url).then((gltf) => {
        // SceneLifecycle sweeps scene-owned resources on navigation. The cache owns these.
        gltf.scene.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          object.geometry.userData.shared = true;
          for (const material of [object.material].flat()) {
            material.userData.shared = true;
            for (const value of Object.values(material)) {
              if (value instanceof Texture) value.userData.shared = true;
            }
          }
        });
        next.loaded = gltf;
        trimIdle();
        return gltf;
      }).catch((error) => {
        assets.delete(url);
        throw error;
      }),
    };
    entry = next;
  }
  assets.delete(url);
  assets.set(url, entry);
  entry.users++;
  let released = false;
  const owned = entry;
  return {
    async instantiate() {
      const { scene, animations } = await owned.pending;
      return released ? undefined : { scene: clone(scene) as Group, animations };
    },
    release() {
      if (released) return;
      released = true;
      owned.users--;
      trimIdle();
    },
  };
}
