import diffuseUrl from "../../../assets/tonsai/rock_06_diff_1k.jpg?url";
import normalUrl from "../../../assets/tonsai/rock_06_nor_gl_1k.jpg?url";
import * as T from "three";
/** World-space, seam-free limestone. Original 3D mineral fields and derivative
 * micro relief; no photograph or proprietary scan, no screen-space passes. */
export function limestoneMaterial() {
  const m = new T.MeshStandardMaterial({
    color: "#b8b9ac",
    roughness: 0.91,
    vertexColors: true,
    side: T.DoubleSide,
  });
  m.name = "tonsai-mineral-limestone";
  const pixel = (bytes: number[]) => {
    const t = new T.DataTexture(new Uint8Array(bytes), 1, 1);
    t.needsUpdate = true;
    return t;
  };
  const textures = new Set<T.Texture>();
  const albedo: { value: T.Texture } = { value: pixel([185, 185, 177, 255]) },
    normals: { value: T.Texture } = { value: pixel([128, 128, 255, 255]) };
  m.userData.textureResources = textures;
  textures.add(albedo.value);
  textures.add(normals.value);
  let active = true;
  if (typeof document !== "undefined")
    for (const [url, uniform, srgb] of [
      [diffuseUrl, albedo, true],
      [normalUrl, normals, false],
    ] as const) {
      new T.TextureLoader().load(
        url,
        (t) => {
          if (!active) {
            t.dispose();
            return;
          }
          textures.add(t);
          t.wrapS = t.wrapT = T.RepeatWrapping;
          t.anisotropy = 2;
          if (srgb) t.colorSpace = T.SRGBColorSpace;
          uniform.value = t;
        },
        undefined,
        () => {},
      );
    }
  m.addEventListener("dispose", () => {
    active = false;
    textures.forEach((t) => t.dispose());
  });
  m.onBeforeCompile = (s) => {
    s.uniforms.rockAlbedo = albedo;
    s.uniforms.rockNormals = normals;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLime;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvec4 limeP=vec4(position,1.);\n#ifdef USE_INSTANCING\nlimeP=instanceMatrix*limeP;\n#endif\nvLime=(modelMatrix*limeP).xyz;",
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vLime;
      uniform sampler2D rockAlbedo;uniform sampler2D rockNormals;
      float lh(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float ln(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(lh(i),lh(i+vec3(1,0,0)),f.x),mix(lh(i+vec3(0,1,0)),lh(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(lh(i+vec3(0,0,1)),lh(i+vec3(1,0,1)),f.x),mix(lh(i+vec3(0,1,1)),lh(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float lf(vec3 p){return ln(p)*.57+ln(p*2.07+8.3)*.28+ln(p*4.19+21.1)*.15;}
    `,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      float broad=lf(vLime*.038);
      float stain=lf(vLime*vec3(.078,.011,.078)+vec3(0,lf(vLime*.025)*2.,0));
      float grain=lf(vLime*.82);
      float bed=lf(vec3(vLime.x*.07,vLime.y*.17+vLime.x*.025,vLime.z*.07));
      vec3 stone=mix(vec3(.36,.37,.34),vec3(.64,.65,.59),smoothstep(.22,.78,broad));
      stone=mix(stone,vec3(.30,.21,.12),smoothstep(.59,.79,stain)*.72);
      stone=mix(stone,vec3(.15,.205,.115),smoothstep(.64,.84,lf(vLime*.055+40.))*.35);
      stone*=.90+.12*grain+.06*bed;
      vec3 weights=pow(abs(normalize(cross(dFdx(vLime),dFdy(vLime)))),vec3(4.));weights/=max(.001,dot(weights,vec3(1.)));
      vec3 scan=texture2D(rockAlbedo,vLime.zy*.075).rgb*weights.x+texture2D(rockAlbedo,vLime.xz*.075).rgb*weights.y+texture2D(rockAlbedo,vLime.xy*.075).rgb*weights.z;
      float grey=dot(scan,vec3(.3,.55,.15));
      diffuseColor.rgb*=stone*mix(vec3(grey),scan,.2)*3.2;
    `,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
      vec3 rockNW=normalize(cross(dFdx(vLime),dFdy(vLime)));
      vec3 blendW=pow(abs(rockNW),vec3(4.));blendW/=max(.001,dot(blendW,vec3(1.)));
      vec3 nx=texture2D(rockNormals,vLime.zy*.075).xyz*2.-1.;
      vec3 ny=texture2D(rockNormals,vLime.xz*.075).xyz*2.-1.;
      vec3 nz=texture2D(rockNormals,vLime.xy*.075).xyz*2.-1.;
      vec3 mapped=normalize(vec3(nx.z*sign(rockNW.x),nx.y,nx.x)*blendW.x+vec3(ny.x,ny.z*sign(rockNW.y),ny.y)*blendW.y+vec3(nz.x,nz.y,nz.z*sign(rockNW.z))*blendW.z);
      vec3 targetN=normalize(mat3(viewMatrix)*mapped);
      normal=normalize(mix(normal,targetN,.4));
      float relief=lf(vLime*1.8)*.022+lf(vLime*.29)*.14;
      vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
      vec3 r1=cross(q1,normal),r2=cross(normal,q0);
      float det=dot(q0,r1);
      normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*r1+dFdy(relief)*r2));
    `,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
      roughnessFactor=clamp(.78+lf(vLime*.2)*.2,.78,1.);
    `,
      );
  };
  m.customProgramCacheKey = () => "tonsai-limestone-v1";
  return m;
}
