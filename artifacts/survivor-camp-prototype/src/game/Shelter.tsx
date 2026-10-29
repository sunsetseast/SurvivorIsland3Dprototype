import type * as T from "three";
import { meshPart } from "./environment/assets";
/** Original handmade communal bamboo lean-to. Physical deck and entry remain
 * the existing world.ts surface; all social/sleep/task anchors stay compatible. */
export function Shelter({ asset }: { asset: T.Group }) {
  return (
    <group name="handmade-survivor-shelter">
      {[
        "shelter-timber",
        "shelter-thatch",
        "shelter-deck",
        "shelter-lashings",
        "shelter-supplies",
      ].map((name) => {
        const m = meshPart(asset, name);
        return (
          m && (
            <mesh
              key={name}
              name={name}
              geometry={m.geometry}
              material={m.material}
              castShadow
              receiveShadow
              dispose={null}
              userData={{ cameraBlocker: name !== "shelter-deck" }}
            />
          )
        );
      })}
    </group>
  );
}
