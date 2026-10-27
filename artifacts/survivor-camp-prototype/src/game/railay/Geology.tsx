import { useEffect, useState, useMemo } from "react";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import url from "../../assets/railay/geology.glb?url";
import { CAVE, COAST, edgeDistance, project } from "./geography";
import { heightAt } from "./terrain";
import { random } from "./vegetation";
export function disposeGeology(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();
  root.traverse((o) => {
    const m = o as T.Mesh;
    if (!m.isMesh) return;
    geometries.add(m.geometry);
    for (const a of [m.material].flat()) {
      materials.add(a);
      for (const value of Object.values(a))
        if (value instanceof T.Texture) textures.add(value);
    }
  });
  geometries.forEach((x) => x.dispose());
  materials.forEach((x) => x.dispose());
  textures.forEach((x) => x.dispose());
}
export function Geology() {
  const [kit, setKit] = useState<T.Group | null>(null);
  useEffect(() => {
    let active = true,
      loaded: T.Group | undefined;
    new GLTFLoader().load(
      url,
      (g) => {
        loaded = g.scene;
        if (active) setKit(g.scene);
        else disposeGeology(g.scene);
      },
      undefined,
      () => {
        /* Mesh fallback remains on asset/network failure. */
      },
    );
    return () => {
      active = false;
      if (loaded) disposeGeology(loaded);
    };
  }, []);
  const talus = useMemo(() => {
    const r = random(94),
      a = [];
    for (let i = 0; i < 1500; i++) {
      const x = -1200 + r() * 2200,
        z = -1300 + r() * 2400,
        h = heightAt(x, z);
      if (h < 0.2 || h > 7 || edgeDistance(x, z, COAST) > 35) continue;
      a.push({ x, z, y: h, scale: 0.7 + r() * 2, turn: r() * 6.28 });
    }
    return a;
  }, []);
  const boulder = kit?.getObjectByName("talus-0") as T.Mesh | undefined;
  const cave = kit?.getObjectByName("karst-shelter") as T.Mesh | undefined,
    stal = kit?.getObjectByName("stalactite-cluster") as T.Mesh | undefined;
  const batched = useMemo(() => {
    if (!boulder) return null;
    const m = new T.InstancedMesh(
        boulder.geometry,
        boulder.material,
        talus.length,
      ),
      o = new T.Object3D();
    talus.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z);
      o.rotation.y = p.turn;
      o.scale.set(p.scale, p.scale * 0.8, p.scale);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.computeBoundingSphere();
    return m;
  }, [boulder, talus]);
  useEffect(
    () => () => {
      batched?.dispose();
    },
    [batched],
  );
  return (
    <group name={kit ? "railay-geology-ready" : "railay-geology-fallback"}>
      {batched && <primitive object={batched} />}
      <group
        position={[CAVE.x, 1, CAVE.z]}
        rotation={[0, Math.PI / 2, 0]}
        userData={{ cameraBlocker: true }}
      >
        {cave ? (
          <mesh
            geometry={cave.geometry}
            material={cave.material}
            userData={{ cameraBlocker: true }}
          />
        ) : (
          <group>
            {[0, 4, 8, 12].map((z) => (
              <mesh
                key={z}
                position={[0, 1, z]}
                userData={{ cameraBlocker: true }}
              >
                <torusGeometry args={[10, 2.4, 8, 28, Math.PI]} />
                <meshStandardMaterial color="#a69a80" roughness={1} />
              </mesh>
            ))}
          </group>
        )}
        {stal && (
          <mesh
            position={[0, 10, 4]}
            geometry={stal.geometry}
            material={stal.material}
          />
        )}
      </group>
    </group>
  );
}
