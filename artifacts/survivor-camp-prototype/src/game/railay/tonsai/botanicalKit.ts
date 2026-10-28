import { useEffect, useState } from "react";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import url from "../../../assets/tonsai/botanical.glb?url";
import fernUrl from "../../../assets/tonsai/fern_02.glb?url";
import { disposeGeology } from "../Geology";
/** Asset ownership stays with this hook; instanced consumers use dispose=null. */
export function useBotanicalKit() {
  const [kit, setKit] = useState<T.Group | null>(null);
  const [ferns, setFerns] = useState<T.Group | null>(null);
  useEffect(() => {
    let active = true;
    const owned: T.Group[] = [];
    for (const [source, accept] of [
      [url, setKit],
      [fernUrl, setFerns],
    ] as const)
      new GLTFLoader().load(
        source,
        ({ scene }) => {
          if (!active) {
            disposeGeology(scene);
            return;
          }
          owned.push(scene);
          if (source === fernUrl)
            scene.traverse((o) => {
              const m = o as T.Mesh;
              for (const mat of [m.material].flat().filter(Boolean)) {
                const p = mat as T.MeshStandardMaterial;
                p.side = T.DoubleSide;
                p.alphaTest = 0.42;
                p.transparent = false;
                p.roughness = 0.92;
              }
            });
          accept(scene);
        },
        undefined,
        () => {},
      );
    return () => {
      active = false;
      owned.forEach(disposeGeology);
    };
  }, []);
  return { kit, ferns };
}
