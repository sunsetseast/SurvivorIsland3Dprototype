import { recordStage } from "./profile";
import { TERRAIN_EXTENT } from "./geography";
import * as T from "three";
import {
  trailWear,
  shorelineX,
  smoothstep,
  noise2,
  LANDMARKS,
  SHADE,
} from "../world";
import sandUrl from "../../assets/camp/sand_02-diff.jpg?url";
import sandNormalUrl from "../../assets/camp/sand_02-normal.jpg?url";
import litterUrl from "../../assets/camp/brown_mud_leaves_01-diff.jpg?url";
import litterNormalUrl from "../../assets/camp/brown_mud_leaves_01-normal.jpg?url";

let cachedMask: Uint8Array | undefined;

/** One continuous terrain skin. World coordinates, continuous zone weights,
 * scanned microdetail. No coplanar ground decals or intersecting zone planes. */
export function campGroundMaterial() {
  const stageStart = performance.now();
  const shadeGrid = new Map<string, typeof SHADE>();
  for (const s of SHADE)
    for (
      let x = Math.floor((s.x - s.r) / 12);
      x <= Math.floor((s.x + s.r) / 12);
      x++
    )
      for (
        let z = Math.floor((s.z - s.r) / 12);
        z <= Math.floor((s.z + s.r) / 12);
        z++
      ) {
        const k = x + "," + z,
          a = shadeGrid.get(k) ?? [];
        a.push(s);
        shadeGrid.set(k, a);
      }
  const size = 512,
    bytes = cachedMask ?? new Uint8Array(size * size * 4);
  if (!cachedMask)
    for (let j = 0; j < size; j++)
      for (let i = 0; i < size; i++) {
        const x =
            TERRAIN_EXTENT.minX +
            ((i + 0.5) / size) * (TERRAIN_EXTENT.maxX - TERRAIN_EXTENT.minX),
          z =
            TERRAIN_EXTENT.minZ +
            ((j + 0.5) / size) * (TERRAIN_EXTENT.maxZ - TERRAIN_EXTENT.minZ),
          d = x - shorelineX(z),
          n = noise2(x * 0.11, z * 0.11);
        const jungle = smoothstep(14, 31, d + (n - 0.5) * 8),
          path = trailWear(x, z);
        const clearing =
          1 -
          smoothstep(
            6,
            13,
            Math.hypot(x - LANDMARKS.campfire.x, z - LANDMARKS.campfire.z),
          );
        const shelter =
          1 -
          smoothstep(
            0,
            4,
            Math.hypot(
              Math.max(5 - x, 0, x - 19),
              Math.max(-50 - z, 0, z + 31),
            ),
          );
        let shade = 1 - smoothstep(28, 70, d) * 0.12;
        for (const s of shadeGrid.get(
          Math.floor(x / 12) + "," + Math.floor(z / 12),
        ) ?? []) {
          const t = Math.max(0, 1 - Math.hypot(x - s.x, z - s.z) / s.r);
          shade -= s.s * t * t * 0.24;
        }
        const a = (j * size + i) * 4;
        bytes[a] = jungle * 255;
        bytes[a + 1] = Math.max(path, clearing, shelter) * 255;
        bytes[a + 2] = Math.max(0.62, shade) * 255;
        bytes[a + 3] = smoothstep(0.2, 4.4, d) * 255;
      }
  cachedMask = bytes;
  recordStage("terrain-mask", stageStart);
  const mask = new T.DataTexture(bytes, size, size);
  mask.needsUpdate = true;
  mask.magFilter = mask.minFilter = T.LinearFilter;
  const pixel = (c: number[]): T.Texture => {
    const t = new T.DataTexture(new Uint8Array(c), 1, 1);
    t.needsUpdate = true;
    return t;
  };
  const sand = { value: pixel([206, 188, 151, 255]) },
    litter = { value: pixel([99, 86, 58, 255]) },
    normal = { value: pixel([128, 128, 255, 255]) },
    forestNormal = { value: pixel([128, 128, 255, 255]) };
  sand.value.colorSpace = litter.value.colorSpace = T.SRGBColorSpace;
  const resources = new Set<T.Texture>([
    mask,
    sand.value,
    litter.value,
    normal.value,
    forestNormal.value,
  ]);
  let active = true;
  const mat = new T.MeshStandardMaterial({
    map: sand.value,
    normalMap: normal.value,
    roughness: 1,
    normalScale: new T.Vector2(0.45, 0.45),
  });
  mat.name = "tonsai-continuous-scanned-ground";
  mat.userData.textureResources = resources;
  for (const [url, u, srgb] of [
    [sandUrl, sand, true],
    [litterUrl, litter, true],
    [sandNormalUrl, normal, false],
    [litterNormalUrl, forestNormal, false],
  ] as const)
    new T.TextureLoader().load(
      url,
      (t) => {
        if (!active) {
          t.dispose();
          return;
        }
        resources.add(t);
        t.wrapS = t.wrapT = T.RepeatWrapping;
        t.anisotropy = 4;
        if (srgb) t.colorSpace = T.SRGBColorSpace;
        u.value = t;
      },
      undefined,
      () => {},
    );
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, {
      campSand: sand,
      campLitter: litter,
      campNormal: normal,
      campForestNormal: forestNormal,
      campMask: { value: mask },
    });
    s.vertexShader = s.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vCampGround;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvCampGround=(modelMatrix*vec4(position,1.)).xyz;",
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
   varying vec3 vCampGround;uniform sampler2D campSand,campLitter,campNormal,campForestNormal,campMask;
   vec4 campWeights(){return texture2D(campMask,(vCampGround.xz+vec2(94.,88.))/vec2(259.,236.));}
  `,
      )
      .replace(
        "#include <map_fragment>",
        `
   vec4 cw=campWeights();vec2 groundUV=vCampGround.xz*.31;
   vec3 beach=texture2D(campSand,groundUV).rgb*2.7+vec3(.15,.125,.087);
   vec3 forest=texture2D(campLitter,groundUV*.74).rgb;
   vec3 earth=mix(forest*.83,mix(forest,beach,.52),cw.g);
   vec3 albedo=mix(beach,earth,cw.r);
   albedo*=mix(vec3(.58,.65,.62),vec3(1.08,1.025,.91),cw.a)*cw.b;
   float sedimentNoise=sin(vCampGround.x*3.17+sin(vCampGround.z*2.3))*sin(vCampGround.z*2.1)*.14;
   float caveFloor=smoothstep(96.,100.,vCampGround.z)*(1.-smoothstep(110.5,112.,vCampGround.z))*smoothstep(6.8,7.8,vCampGround.x+sedimentNoise)*(1.-smoothstep(14.2,15.2,vCampGround.x+sedimentNoise));
   vec3 caveSediment=mix(vec3(.15,.128,.10),beach*.38,.50)*(1.+sedimentNoise*.75);
   albedo=mix(albedo,caveSediment,caveFloor*.88);
   diffuseColor.rgb*=albedo;
  `,
      )
      .replaceAll(
        "texture2D( normalMap, vNormalMapUv ).xyz",
        "mix(texture2D(campNormal,vCampGround.xz*.31).xyz,texture2D(campForestNormal,vCampGround.xz*.2294).xyz,campWeights().r*(1.-campWeights().g*.55))",
      );
  };
  mat.customProgramCacheKey = () => "camp-ground-v2-cave-sediment";
  mat.addEventListener("dispose", () => {
    active = false;
    resources.forEach((t) => t.dispose());
  });
  return mat;
}
