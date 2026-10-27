import * as T from "three";
import { tonsaiPlants } from "./tropical";
/** A 512² R8 static canopy occlusion field. No peninsula shadow map, depth pass,
 * or runtime light simulation. Placed from the actual tree crown positions. */
export function canopyShade() {
  const size = 512,
    bytes = new Uint8Array(size * size).fill(255);
  for (const p of tonsaiPlants(false)) {
    if (!["canopy", "ficus", "palm", "pandanus"].includes(p.kind)) continue;
    const cx = ((p.x + 1320 + 4) / 1400) * size,
      cy = ((p.z + 1600 + 3) / 1300) * size;
    const rad =
      (((p.kind === "ficus" ? 12 : p.kind === "canopy" ? 9 : 4) * p.scale) /
        1400) *
      size;
    for (
      let y = Math.max(0, Math.floor(cy - rad * 1.6));
      y < Math.min(size, cy + rad * 1.6);
      y++
    )
      for (
        let x = Math.max(0, Math.floor(cx - rad * 1.6));
        x < Math.min(size, cx + rad * 1.6);
        x++
      ) {
        const d = Math.hypot((x - cx) / rad, (y - cy) / rad),
          shade = 1 - 0.47 * Math.exp(-d * d * 1.8);
        bytes[y * size + x] = Math.max(65, bytes[y * size + x]! * shade);
      }
  }
  const t = new T.DataTexture(bytes, size, size, T.RedFormat);
  t.minFilter = t.magFilter = T.LinearFilter;
  t.needsUpdate = true;
  t.name = "tonsai-static-canopy-occlusion";
  return t;
}
