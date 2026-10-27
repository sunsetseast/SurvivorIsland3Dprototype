import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { inside, LAGOON } from "./geography";
import { SIZE, prepareTerrain, isMud, GRID } from "./terrain";
export function Ocean() {
  const texture = useMemo(() => {
    const { heights } = prepareTerrain(),
      bytes = new Uint8Array(SIZE * SIZE * 4);
    for (let j = 0; j < SIZE; j++)
      for (let i = 0; i < SIZE; i++) {
        const n = j * SIZE + i,
          h = heights[n]!;
        bytes[n * 4] = Math.round(
          Math.max(0, Math.min(1, (h + 40) / 280)) * 255,
        );
        bytes[n * 4 + 1] = isMud(GRID.min + i * 6, GRID.min + j * 6) ? 255 : 0;
        bytes[n * 4 + 2] = inside(GRID.min + i * 6, GRID.min + j * 6, LAGOON)
          ? 255
          : 0;
        bytes[n * 4 + 3] = 255;
      }
    const t = new T.DataTexture(bytes, SIZE, SIZE, T.RGBAFormat);
    t.minFilter = t.magFilter = T.LinearFilter;
    t.needsUpdate = true;
    t.flipY = false;
    return t;
  }, []);
  const mat = useMemo(
    () =>
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { time: { value: 0 }, depthMap: { value: texture } },
        vertexShader: `
 varying vec3 world;uniform float time;
 void main(){vec3 p=position;p.z+=sin(p.x*.022+time*.6)*.055+sin(p.y*.036-time*.8)*.025;vec4 w=modelMatrix*vec4(p,1.);world=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}
 `,
        fragmentShader: `
 varying vec3 world;uniform float time;uniform sampler2D depthMap;
 void main(){vec2 uv=(world.xz+2100.)/3600.;vec4 data=texture2D(depthMap,uv);float h=data.r*280.-40.;
 if(all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.)))&&h>.65)discard;
 float inBounds=step(0.,uv.x)*step(0.,uv.y)*step(uv.x,1.)*step(uv.y,1.);float depth=mix(35.,max(.0,-h),inBounds),mud=data.g*inBounds;
 vec3 shallow=mix(vec3(.08,.66,.61),vec3(.23,.38,.28),mud*.8),deep=vec3(.018,.16,.27);
 shallow=mix(shallow,vec3(.10,.28,.17),data.b);
 vec3 color=mix(shallow,deep,smoothstep(1.,27.,depth));
 float w=(sin(world.x*.08+time*.85+sin(world.z*.014))+sin(world.z*.09-time*.4))*.5;
 float caustic=pow(max(0.,sin(world.x*.46+sin(world.z*.38)+time*.5)),12.);
 color+=vec3(.04,.10,.085)*caustic*(1.-smoothstep(1.,8.,depth));
 color+=w*.006;float wave=sin(world.x*.11+world.z*.16+time*1.2)*.4+.6;
 float foam=(1.-data.b)*(1.-smoothstep(.0,.6,abs(h+wave*.2)))*(.35+.2*sin(world.x*.8+world.z*.5+time));
 color=mix(color,vec3(.78,.88,.78),foam*.7*inBounds);
 vec3 view=normalize(cameraPosition-world);float fresnel=pow(1.-max(0.,view.y),4.);color=mix(color,vec3(.47,.70,.77),fresnel*.4);
 color=mix(color,vec3(.4,.68,.75),smoothstep(2300.,6200.,distance(cameraPosition,world)));
 gl_FragColor=vec4(color,mix(.52,1.,smoothstep(0.,8.,depth)));#include <tonemapping_fragment>
 #include <colorspace_fragment>
 }
 `,
      }),
    [texture],
  );
  // GLSL directives require their own line.
  mat.fragmentShader = mat.fragmentShader.replace(";#include", ";\n#include");
  useFrame((_, dt) => {
    mat.uniforms.time!.value += Math.min(dt, 0.05);
  });
  useEffect(
    () => () => {
      texture.dispose();
      mat.dispose();
    },
    [texture, mat],
  );
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, 0]}
      material={mat}
      name="andaman-water"
    >
      <planeGeometry args={[14000, 14000, 120, 120]} />
    </mesh>
  );
}
