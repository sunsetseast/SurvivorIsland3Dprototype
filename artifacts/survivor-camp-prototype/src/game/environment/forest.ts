/** Ecological placement for soft, traversable understory. No changes to collision
 * or trail topology; stable seed and clear approach pockets at all hiding sites. */
import {
  baseHeight,
  isWalkable,
  noise2,
  pathDistance,
  rng,
  shorelineX,
  LANDMARKS,
} from "../world";
import {
  NATURAL_LANDMARKS,
  SPRING,
  territoryContains,
  cliffSolid,
} from "./geography";
import { HIDING_CANDIDATES } from "./hidingSpots";
export type ForestPlant = {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotation: number;
  variant: number;
  zone: string;
};
export function plantable(x: number, z: number) {
  if (
    !territoryContains(x, z) ||
    cliffSolid(x, z) ||
    x - shorelineX(z) < 14 ||
    !isWalkable(x, z)
  )
    return false;
  if (pathDistance(x, z) < 2.15) return false;
  if (x > 3 && x < 22 && z > -53 && z < -23) return false;
  if (Math.hypot(x - LANDMARKS.campfire.x, z - LANDMARKS.campfire.z) < 7.5)
    return false;
  if (Math.hypot(x + 6, z + 24) < 5.0) return false;
  if (Math.hypot(x - SPRING.x, z - SPRING.z) < 3.4) return false;
  if (NATURAL_LANDMARKS.some((l) => Math.hypot(x - l.x, z - l.z) < 4.1))
    return false;
  if (
    HIDING_CANDIDATES.some(
      (c) =>
        Math.hypot(x - c.interactionPosition.x, z - c.interactionPosition.z) <
        1.6,
    )
  )
    return false;
  return true;
}
export function createForest() {
  const R = rng(18026),
    plants: ForestPlant[] = [];
  // Jittered habitat cells, clustered by moisture and canopy. No orderly rows or
  // tree-sized colliders for compressible foliage. Retain the same density on low.
  for (let z = -61; z < 116; z += 2.6)
    for (let x = -42; x < 134; x += 2.6) {
      const xx = x + (R() - 0.5) * 2.15,
        zz = z + (R() - 0.5) * 2.15;
      if (!plantable(xx, zz)) continue;
      const coast = xx - shorelineX(zz),
        wet = Math.exp(-((xx - SPRING.x) ** 2 + (zz - SPRING.z) ** 2) / 450),
        patch = noise2(xx * 0.073 + 2, zz * 0.067 + 7);
      if (R() > 0.7 + wet * 0.26 + patch * 0.15) continue;
      const interior = coast > 31,
        zone =
          wet > 0.24
            ? "freshwater"
            : zz > 80
              ? "limestone"
              : coast < 24
                ? "coastal"
                : zz < -20
                  ? "camp-edge"
                  : "interior";
      let v = wet > 0.24 ? (R()<.45?1:0) : interior && R() < 0.52 ? 1 : R() < 0.2 ? 2 : 0;
      // Keep the tall sapling's crown outside the active trail envelope and
      // leave a low-planted diagonal sightline between the fire and shelter.
      const cx = 21, cz = -13,
        ct = Math.max(0, Math.min(1, ((xx + 9)*cx + (zz + 31)*cz)/(cx*cx+cz*cz))),
        communalSightline = Math.hypot(xx + 9 - ct*cx, zz + 31 - ct*cz);
      if (v === 1 && (pathDistance(xx,zz) < 3.4 || communalSightline < 4)) v = 0;
      plants.push({
        x: xx,
        z: zz,
        y: baseHeight(xx, zz) - 0.055,
        scale: (v === 1 ? 1.1 : 1.0) + R() * 0.38,
        rotation: R() * Math.PI * 2,
        variant: v,
        zone,
      });
    }
  return plants;
}
export const FOREST_UNDERSTORY = createForest();

/** Continuation planting on existing non-playable terrain closes exposed border
 * slopes. It changes scenery only; territory/collision/navigation remain fixed. */
export const FOREST_BACKDROP:ForestPlant[] = (()=>{
 const R=rng(18027),out:ForestPlant[]=[];
 for(let z=-78;z<140;z+=3.0)for(let x=-43;x<160;x+=3.0){
  const xx=x+(R()-.5)*2.2,zz=z+(R()-.5)*2.2;
  if(territoryContains(xx,zz)||xx-shorelineX(zz)<17||cliffSolid(xx,zz))continue;
  out.push({x:xx,z:zz,y:baseHeight(xx,zz)-.06,scale:1.1+R()*.45,rotation:R()*Math.PI*2,variant:Math.floor(R()*3),zone:'backdrop'});
 }
 return out;
})();
export const FOREST_PLANTS=[...FOREST_UNDERSTORY,...FOREST_BACKDROP];
