import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import cloudsUrl from "../../assets/camp/tropical-clouds.png?url";
import { SKY_GRADIENT_GLSL, skyUniforms, type Atmosphere } from "./atmosphere";

/** One opaque sky pass. Original offline-lit cloud volumes are stored in a
 * compact atlas. The sphere's axes ARE world directions. Project with camera
 * rotation only: sky distance is infinite, regardless of camera update order.
 * Runtime uses one filtered lookup: no volumetric raymarch. */
export function TropicalSky({ atmosphere }: { atmosphere: Atmosphere }) {
  const resources = useMemo(() => {
    const fallback = new T.DataTexture(
      new Uint8Array([255, 255, 255, 0]),
      1,
      1,
    );
    fallback.needsUpdate = true;
    const textures = new Set<T.Texture>([fallback]);
    const material = new T.ShaderMaterial({
      name: "tropical-sky-clouds",
      side: T.BackSide,
      depthWrite: false,
      uniforms: {
        ...skyUniforms(atmosphere),
        uCloudAtlas: { value: fallback as T.Texture },
      },
      vertexShader: `varying vec3 vSkyDirection; varying vec2 vCloudUv;
        void main(){vSkyDirection=position;
          vCloudUv=vec2(uv.x+.25,uv.y*2.-1.);
          // Drop translation rather than following last frame's camera position.
          // Do not apply modelMatrix or the camera quaternion to the sky pattern.
          vec3 viewDirection=mat3(viewMatrix)*position;
          vec4 clip=projectionMatrix*vec4(viewDirection,1.);
          gl_Position=clip.xyww;
        }`,
      fragmentShader: `
        #include <common>
        #include <dithering_pars_fragment>
        varying vec3 vSkyDirection; varying vec2 vCloudUv;
        uniform sampler2D uCloudAtlas;
        uniform vec3 uSun,uZenith,uHorizon,uCloudLight,uCloudShade;
        uniform float uTime,uCoverage;
        ${SKY_GRADIENT_GLSL}
        void main(){
          vec3 d=normalize(vSkyDirection),c=tropicalSky(d);
          if(d.y>0.){
            // Sphere UVs are duplicated at the seam and interpolate locally.
            // Avoid per-pixel atan/asin and their discontinuous mip derivatives.
            vec2 uv=vCloudUv+vec2(uTime*.00018,0.);
            vec4 cloud=texture2D(uCloudAtlas,uv);
            float lighting=smoothstep(.36,.96,cloud.r);
            vec3 cloudColor=mix(uCloudShade*.72,uCloudLight,lighting);
            c=mix(c,cloudColor,cloud.a*uCoverage*smoothstep(.008,.045,d.y));
          }
          float solar=dot(d,uSun);
          float disc=smoothstep(.99991,.99998,solar);
          c+=vec3(1.,.88,.64)*disc*2.0;
          gl_FragColor=vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <dithering_fragment>
        }`,
      dithering: true,
    });
    const geometry = new T.SphereGeometry(1, 32, 20);
    material.userData.cloudReady = false;
    material.userData.textureResources = textures;
    return { textures, material, geometry };
  }, [atmosphere]);
  useFrame(({ clock }) => {
    resources.material.uniforms.uTime!.value = clock.elapsedTime;
  });
  useEffect(() => {
    let active = true;
    new T.TextureLoader().load(
      cloudsUrl,
      (texture) => {
        if (!active) {
          texture.dispose();
          return;
        }
        texture.wrapS = T.RepeatWrapping;
        texture.colorSpace = T.NoColorSpace;
        texture.anisotropy = 2;
        resources.textures.add(texture);
        resources.material.uniforms.uCloudAtlas!.value = texture;
        resources.material.userData.cloudReady = true;
      },
      undefined,
      () => {
        resources.material.userData.cloudReady = "fallback";
      },
    );
    return () => {
      active = false;
      resources.geometry.dispose();
      resources.material.dispose();
      resources.textures.forEach((t) => t.dispose());
    };
  }, [resources]);
  return (
    <mesh
      name="andaman-tropical-sky"
      geometry={resources.geometry}
      material={resources.material}
      renderOrder={-1000}
      frustumCulled={false}
    />
  );
}
