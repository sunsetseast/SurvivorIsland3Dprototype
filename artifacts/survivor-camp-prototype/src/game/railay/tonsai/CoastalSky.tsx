import { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
/** Cheap sky gradient / hazy solar glow. No HDR cube, post-processing or dynamic
 * atmospheric scattering passes. Follows the viewer without terrain parallax. */
export function CoastalSky() {
  const ref = useRef<T.Mesh>(null);
  const mat = useMemo(
    () =>
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        vertexShader: `varying vec3 skyDir;void main(){skyDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 skyDir;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
void main(){vec3 d=normalize(skyDir);float height=pow(max(0.,d.y),.5);
vec3 c=mix(vec3(.58,.75,.79),vec3(.06,.29,.55),height);
float sun=max(0.,dot(d,normalize(vec3(-1100.,1200.,-700.))));
c+=vec3(.25,.20,.12)*pow(sun,28.);
vec2 uv=d.xz/(max(.12,d.y)+.2)*3.2;
float cloud=n(uv)*.58+n(uv*2.07+17.)*.28+n(uv*4.11)*.14;
float veil=smoothstep(.56,.79,cloud)*smoothstep(.06,.3,d.y)*.66;
c=mix(c,vec3(.88,.91,.89),veil);
gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
      }),
    [],
  );
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh
      ref={ref}
      material={mat}
      renderOrder={-1000}
      frustumCulled={false}
      name="andaman-sky"
    >
      <sphereGeometry args={[6200, 16, 12]} />
    </mesh>
  );
}
