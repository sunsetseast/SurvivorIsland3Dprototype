import * as T from "three";
import sandUrl from "../../assets/camp/sand_02-diff.jpg?url";
import litterUrl from "../../assets/camp/brown_mud_leaves_01-diff.jpg?url";
/** Reuse shipped terrain microdetail at world scale; no new texture assets or ground decal layers. */
export function challengeGroundMaterial() {
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
  const resources=new Set<T.Texture>();
  const pixel=()=>{const t=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);t.needsUpdate=true;resources.add(t);return {value:t as T.Texture};};
  const sand=pixel(),litter=pixel();let active=true;
  material.userData.textureResources=resources;
  for(const [url,uniform] of [[sandUrl,sand],[litterUrl,litter]] as const)new T.TextureLoader().load(url,t=>{
    if(!active){t.dispose();return;}t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=2;resources.add(t);uniform.value=t;
  },undefined,()=>{});
  material.onBeforeCompile=shader=>{
    shader.uniforms.challengeSand=sand;shader.uniforms.challengeLitter=litter;
    shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 challengeGround;").replace("#include <begin_vertex>","#include <begin_vertex>\nchallengeGround=(modelMatrix*vec4(position,1.)).xyz;");
    shader.fragmentShader=shader.fragmentShader.replace("#include <common>","#include <common>\nvarying vec3 challengeGround;uniform sampler2D challengeSand;uniform sampler2D challengeLitter;")
      .replace("#include <color_fragment>",`#include <color_fragment>
        float coast=-61.+.0013*challengeGround.z*challengeGround.z+2.5*sin(challengeGround.z*.045);
        float inland=smoothstep(48.,85.,challengeGround.x-coast);
        vec3 grain=mix(texture2D(challengeSand,challengeGround.xz*.18).rgb,texture2D(challengeLitter,challengeGround.xz*.12).rgb,inland);
        diffuseColor.rgb*=.78+.6*dot(grain,vec3(.3,.55,.15));`);
  };
  material.customProgramCacheKey=()=>"challenge-continuous-ground-v1";
  material.addEventListener("dispose",()=>{active=false;resources.forEach(t=>t.dispose());});
  return material;
}
