import { useEffect, useMemo, useState } from "react";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import url from "../../../assets/tonsai/karsts.glb?url";
import { limestoneMaterial } from "./rockMaterial";
import { disposeGeology } from "../Geology";
import { TONSAI_KARSTS } from "./domain";
import fallbackData from "../../../assets/tonsai/fallback.json";
/** Both main formations are Blender-optimized volumetric solids. The coarse
 * embedded silhouette stays available while downloads load or fail. */
export function TonsaiKarsts({ low }: { low: boolean }) {
  const [kit, setKit] = useState<T.Group | null>(null);
  const rock = useMemo(limestoneMaterial, []);
  const fallback = useMemo(
    () =>
      TONSAI_KARSTS.map((k) => {
        const data = fallbackData.find((d) => d.id === k.id)!;
        const g = new T.BufferGeometry();
        g.setAttribute(
          "position",
          new T.Float32BufferAttribute(data.position, 3),
        );
        g.setIndex(data.index);
        g.setAttribute(
          "color",
          new T.Float32BufferAttribute(
            new Float32Array(data.position.length).fill(0.82),
            3,
          ),
        );
        g.computeVertexNormals();
        return g;
      }),
    [],
  );
  useEffect(() => {
    let active = true,
      loaded: T.Group | undefined;
    new GLTFLoader().load(
      url,
      (g) => {
        loaded = g.scene;
        if (active) {
          setKit(g.scene);
        } else disposeGeology(g.scene);
      },
      undefined,
      () => {},
    );
    return () => {
      active = false;
      if (loaded) disposeGeology(loaded);
    };
  }, []);
  useEffect(
    () => () => {
      rock.dispose();
      fallback.forEach((g) => g.dispose());
    },
    [rock, fallback],
  );
  return (
    <group name={kit ? "tonsai-karsts-ready" : "tonsai-karsts-fallback"}>
      {TONSAI_KARSTS.map((k, i) => {
        const mesh = kit?.getObjectByName(`${k.id}-${low ? "low" : "high"}`) as
          T.Mesh | undefined;
        return (
          <mesh
            key={k.id}
            name={`tonsai-${k.id}`}
            geometry={mesh?.geometry || fallback[i]}
            material={rock}
            userData={{ cameraBlocker: true }}
          />
        );
      })}
    </group>
  );
}
