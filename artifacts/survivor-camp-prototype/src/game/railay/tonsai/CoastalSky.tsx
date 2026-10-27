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
        fragmentShader: `varying vec3 skyDir;void main(){vec3 d=normalize(skyDir);float h=pow(max(0.,d.y),.5);vec3 c=mix(vec3(.58,.75,.79),vec3(.075,.32,.53),h);float sun=max(0.,dot(d,normalize(vec3(-900.,1500.,650.))));c+=vec3(.25,.20,.12)*pow(sun,28.);gl_FragColor=vec4(c,1.);
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
