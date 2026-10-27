import * as T from "three";
/** Original procedural world-space detail: stable across terrain chunk and LOD boundaries. */
export function groundMaterial() {
  const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vGround;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvGround=position;",
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
 varying vec3 vGround;
 float hashG(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 `,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
 float grain=hashG(floor(vGround.xz*18.));
 float broad=sin(vGround.x*.19+sin(vGround.z*.14))*sin(vGround.z*.23);
 float detailFade=1.-smoothstep(70.,250.,distance(cameraPosition,vGround));
 diffuseColor.rgb*=.94+grain*.08*detailFade+broad*.045;
 `,
      );
  };
  return m;
}
export function cliffMaterial() {
  const m = new T.MeshStandardMaterial({
    color: "#c4bfaa",
    roughness: 0.98,
    vertexColors: true,
  });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRock;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvRock=position;",
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
 varying vec3 vRock;
 float hashR(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 `,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
 float streak=sin(vRock.x*1.8+vRock.z*1.25+sin(vRock.y*.08)*.5);
 float mineral=sin(vRock.y*.33+sin(vRock.x*.14)*3.+sin(vRock.z*.2));
 float fine=hashR(floor(vRock*7.));
 float fissure=pow(max(0.,sin(vRock.x*.83+vRock.z*1.16+sin(vRock.y*.065))),18.);
 float vein=sin(vRock.x*.16+vRock.z*.23+sin(vRock.y*.037)*1.1);
 diffuseColor.rgb*=.88+.08*streak+.08*mineral+.14*fine-.33*fissure;
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.20,.17,.12),.35*smoothstep(.65,1.,vein));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.31,.23,.15),.12*max(0.,mineral));
 `,
      );
  };
  return m;
}
export function biomeColor(
  x: number,
  z: number,
  h: number,
  slope: number,
  mud: boolean,
  shore: number,
) {
  const n = Math.sin(x * 0.17 + z * 0.21) * 0.025;
  const c = new T.Color();
  if (h < -0.3) c.set(mud ? "#747354" : "#a5b397");
  else if (h < 1.1) c.set(mud ? "#77744c" : "#b7af82");
  else if (shore < 34 && h < 6) c.set(mud ? "#71734a" : "#ead5a0");
  else if (slope > 1.1) c.set("#a29372");
  else c.set("#535637");
  c.offsetHSL(n * 0.15, n, 0.02 + n);
  return c;
}
