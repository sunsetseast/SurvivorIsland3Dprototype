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
        const jungle = smoothstep(11, 25, d + (n - 0.5) * 12),
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
   vec3 campSurfaceNormal(){
     vec2 uv=vCampGround.xz*.31; vec4 w=campWeights();
     float forest=w.r*(1.-w.g*.55);
     vec3 a=mix(texture2D(campNormal,uv).xyz,texture2D(campForestNormal,uv*.74).xyz,forest)*2.-1.;
     vec3 b=texture2D(campNormal,vec2(-uv.y,uv.x)*.37+vec2(11.31,7.73)).xyz*2.-1.;
     b.xy=vec2(b.y,-b.x);
     return normalize(mix(a,b,.22*(1.-forest*.65)))*.5+.5;
   }
  `,
      )
      .replace(
        "#include <map_fragment>",
        `
   vec4 cw=campWeights();vec2 groundUV=vCampGround.xz*.31;
   vec2 macroUV=vec2(-groundUV.y,groundUV.x)*.37+vec2(11.31,7.73);
   vec3 sandFine=texture2D(campSand,groundUV).rgb;
   vec3 sandBroad=texture2D(campSand,macroUV).rgb;
   vec3 beach=mix(sandFine,sandBroad,.28)*2.35+vec3(.12,.098,.068);
   float patches=sin(vCampGround.x*.047+sin(vCampGround.z*.063)*1.7)*sin(vCampGround.z*.038-vCampGround.x*.021);
   beach*=.96+.055*patches;
   vec3 forest=mix(texture2D(campLitter,groundUV*.74).rgb,texture2D(campLitter,macroUV*.81+3.1).rgb,.32);
   float grain=dot(forest,vec3(.25,.6,.15));
   float habitat=clamp(cw.r+(grain-.18)*.38*cw.r*(1.-cw.r)*4.,0.,1.);
   vec3 soil=mix(forest*1.07,mix(forest*.9,beach,.24),smoothstep(.15,.9,cw.g));
   vec3 albedo=mix(beach,soil,habitat);
   albedo*=mix(vec3(.65,.70,.66),vec3(1.06,1.025,.94),cw.a)*mix(.82,1.,cw.b);
   float sedimentNoise=sin(vCampGround.x*3.17+sin(vCampGround.z*2.3))*sin(vCampGround.z*2.1)*.14;
   float caveFloor=smoothstep(96.,100.,vCampGround.z)*(1.-smoothstep(110.5,112.,vCampGround.z))*smoothstep(6.8,7.8,vCampGround.x+sedimentNoise)*(1.-smoothstep(14.2,15.2,vCampGround.x+sedimentNoise));
   vec3 caveSediment=mix(vec3(.15,.128,.10),beach*.38,.50)*(1.+sedimentNoise*.75);
   albedo=mix(albedo,caveSediment,caveFloor*.88);
   diffuseColor.rgb*=albedo;
  `,
      )
      .replaceAll(
        "texture2D( normalMap, vNormalMapUv ).xyz",
        "campSurfaceNormal()",
      );
  };
  const compile = mat.onBeforeCompile;
  mat.onBeforeCompile = (s, r) => {
    compile.call(mat, s, r);
    s.fragmentShader = s.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\nroughnessFactor*=mix(.56,1.,cw.a);",
    );
  };
  mat.customProgramCacheKey = () => "camp-ground-v4-macro-grain-wetness";
  mat.addEventListener("dispose", () => {
    active = false;
    resources.forEach((t) => t.dispose());
  });
  return mat;
}
