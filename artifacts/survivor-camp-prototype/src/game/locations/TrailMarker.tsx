import { useEffect, useMemo } from "react";
import * as T from "three";
import { CONNECTIONS } from "./registry";
/** Small wooden waymarker beside the existing path. No portal or new terrain. */
export function TrailMarker({
  connectionId,
  height,
}: {
  connectionId: string;
  height: (x: number, z: number) => number;
}) {
  const c = CONNECTIONS[connectionId]!,
    p = c.exit;
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#665039";
    g.fillRect(0, 0, 256, 96);
    g.fillStyle = "#eee0b7";
    g.font = "600 28px serif";
    g.textAlign = "center";
    g.fillText(
      c.source === "camp_tribe_a" ? "JUNGLE TRAIL →" : "← TRIBE CAMP",
      128,
      57,
    );
    const t = new T.CanvasTexture(canvas);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }, [c]);
  useEffect(() => () => texture.dispose(), [texture]);
  const x = p.x + 1.6,
    z = p.z,
    y = height(x, z);
  return (
    <group name={`connection-${connectionId}`} position={[x, y, z]}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.065, 0.09, 1.6, 7]} />
        <meshLambertMaterial color="#594432" />
      </mesh>
      <mesh
        position={[0, 1.5, 0]}
        rotation-y={c.source === "camp_tribe_a" ? Math.PI : 0}
      >
        <boxGeometry args={[1.5, 0.55, 0.08]} />
        <meshLambertMaterial map={texture} />
      </mesh>
    </group>
  );
}
