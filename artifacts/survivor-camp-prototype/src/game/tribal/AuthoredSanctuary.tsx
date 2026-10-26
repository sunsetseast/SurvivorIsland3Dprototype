import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as T from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import fullUrl from "../../assets/sanctuary/sanctuary-kit.glb?url";
import lowUrl from "../../assets/sanctuary/sanctuary-kit-low.glb?url";
import { sanctuaryPlacements } from "./assetPlacements";

export function useSanctuaryKit() {
  const [kit, setKit] = useState<GLTF | null>(null);
  const [failed, setFailed] = useState(false);
  const { gl, setDpr } = useThree();
  const low = useMemo(
    () =>
      new URLSearchParams(location.search).get("quality") === "low" ||
      (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4),
    [],
  );
  useEffect(() => {
    let cancelled = false;
    const previousShadows = gl.shadowMap.enabled;
    if (low) {
      setDpr(1);
      gl.shadowMap.enabled = false;
    }
    const dispose = (scene: T.Object3D) => {
      const materials = new Set<T.Material>(),
        textures = new Set<T.Texture>();
      scene.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      materials.forEach((m) => {
        Object.values(m).forEach((v) => {
          if (v instanceof T.Texture) textures.add(v);
        });
        m.dispose();
      });
      textures.forEach((t) => {
        const image = t.source.data as { close?: () => void } | undefined;
        t.dispose();
        image?.close?.();
      });
    };
    let loaded: GLTF | undefined;
    new GLTFLoader().load(
      low ? lowUrl : fullUrl,
      (g) => {
        loaded = g;
        if (cancelled) {
          dispose(g.scene);
          return;
        }
        g.scene.traverse((o) => {
          if (o instanceof T.Mesh) {
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material])
              for (const value of Object.values(m))
                if (value instanceof T.Texture)
                  value.anisotropy = Math.min(
                    4,
                    gl.capabilities.getMaxAnisotropy(),
                  );
          }
        });
        setKit(g);
      },
      undefined,
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
      gl.shadowMap.enabled = previousShadows;
      if (loaded) dispose(loaded.scene);
    };
  }, [low, gl, setDpr]);
  return { kit, low, failed };
}

/** Spatial instancing: identical fern/ruin meshes share geometry/materials and cull by cell. */
export function AuthoredSanctuary({ kit, low }: { kit: GLTF; low: boolean }) {
  const group = useMemo(() => {
    const root = new T.Group();
    root.name = "blender-sanctuary-kit";
    root.userData.quality = low ? "low" : "full";
    const placements = sanctuaryPlacements(low),
      matrix = new T.Matrix4(),
      rotation = new T.Quaternion();
    const cells = new Map<string, typeof placements>();
    for (const p of placements) {
      const key = `${p.asset}:${Math.floor(p.x / 18)},${Math.floor(p.z / 18)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key)!.push(p);
    }
    kit.scene.updateMatrixWorld(true);
    for (const [key, items] of cells) {
      const asset = kit.scene.getObjectByName(items[0]!.asset);
      if (!asset) throw new Error(`Missing sanctuary asset ${items[0]!.asset}`);
      asset.traverse((o) => {
        if (!(o instanceof T.Mesh)) return;
        const inst = new T.InstancedMesh(o.geometry, o.material, items.length);
        inst.name = `blender-${key}:${o.name}`;
        inst.castShadow = ![
          "fern_cluster",
          "hanging_vine",
          "fallen_relief",
        ].includes(items[0]!.asset);
        inst.receiveShadow = true;
        inst.userData.cameraBlocker = false;
        items.forEach((p, i) => {
          rotation.setFromAxisAngle(new T.Vector3(0, 1, 0), p.yaw);
          matrix.compose(
            new T.Vector3(p.x, p.y, p.z),
            rotation,
            new T.Vector3(p.scale, p.scale, p.scale),
          );
          matrix.multiply(o.matrixWorld);
          inst.setMatrixAt(i, matrix);
        });
        inst.computeBoundingSphere();
        root.add(inst);
      });
    }
    return root;
  }, [kit, low]);
  useEffect(
    () => () => {
      group.traverse((o) => {
        if (o instanceof T.InstancedMesh) o.dispose();
      });
    },
    [group],
  );
  return <primitive object={group} dispose={null} />;
}
