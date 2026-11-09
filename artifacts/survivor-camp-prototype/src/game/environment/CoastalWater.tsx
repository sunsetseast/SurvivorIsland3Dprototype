import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { skyUniforms, SKY_GRADIENT_GLSL, type Atmosphere } from "./atmosphere";
import { shorelineX } from "../world";
/** Single continuous surface. Bathymetric colour, moving normals, Fresnel sky,
 * broken crest foam and a feathered swash share the real shoreline field.
 * No offscreen passes, coplanar foam ribbons or mandatory float textures. */
export function CoastalWater({
  atmosphere,
  low = false,
}: {
  atmosphere: Atmosphere;
  low?: boolean;
}) {
  const resources = useMemo(() => {
    const size = 512,
      bytes = new Uint8Array(size * 4);
    for (let i = 0; i < size; i++) {
      const x = shorelineX(-150 + ((i + 0.5) / size) * 400),
        v = Math.round(T.MathUtils.clamp((x + 128) / 256, 0, 1) * 65535);
      bytes[i * 4] = v >> 8;
      bytes[i * 4 + 1] = v & 255;
      bytes[i * 4 + 3] = 255;
    }
    const shore = new T.DataTexture(bytes, size, 1);
    shore.minFilter = shore.magFilter = T.LinearFilter;
    shore.needsUpdate = true;
    const uniforms = {
      ...skyUniforms(atmosphere),
      uShallow: { value: new T.Color(atmosphere.waterShallow) },
      uDeep: { value: new T.Color(atmosphere.waterDeep) },
      uShore: { value: shore },
    };
    const material = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      uniforms,
      vertexShader: `varying vec3 vCoast; uniform float uTime; uniform sampler2D uShore;
    float shoreline(float z){vec2 s=texture2D(uShore,vec2(clamp((z+150.)/400.,.001,.999),.5)).rg;return (s.r*65280.+s.g*255.)/65535.*256.-128.;}
    void main(){vec3 p=position;float d=shoreline(p.z)-p.x;float fade=smoothstep(0.,12.,d);p.y=.025+fade*(sin(p.x*.18+p.z*.09+uTime*.75)*.07+sin(p.z*.31-p.x*.08-uTime*.6)*.045);vCoast=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vCoast,1.);}`,
      fragmentShader: `varying vec3 vCoast;uniform float uTime;uniform sampler2D uShore;uniform vec3 uSun,uZenith,uHorizon,uShallow,uDeep;
    ${SKY_GRADIENT_GLSL}
    float shoreline(float z){vec2 s=texture2D(uShore,vec2(clamp((z+150.)/400.,.001,.999),.5)).rg;return (s.r*65280.+s.g*255.)/65535.*256.-128.;}
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
    // Quintic value noise with its analytical slope: smooth across cell boundaries.
    vec3 waveField(vec2 p){
     vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.),du=30.*f*f*(f-1.)*(f-1.);
     float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1));
     return vec3(mix(mix(a,b,u.x),mix(c,d,u.x),u.y),mix(b-a,d-c,u.y)*du.x,mix(c-a,d-b,u.x)*du.y);
    }
    void main(){float d=shoreline(vCoast.z)-vCoast.x;float motion=sin(uTime*.72+vCoast.z*.13)*.28;float water=smoothstep(-.25,.85,d+motion);if(water<.004)discard;
     vec2 q=vCoast.xz;
     float medium=noise(q*.075+vec2(uTime*.012,-uTime*.008));
     float small=noise(q*.34+vec2(-uTime*.032,uTime*.021));
     // Rotated, advected slope fields break both square grids and regular bands.
     vec3 waves=waveField(q*.47+vec2(uTime*.045,-uTime*.031)+medium*.8);
     vec2 rotated=vec2(q.x*.8-q.y*.6,q.x*.6+q.y*.8);
     vec3 capillary=waveField(rotated*.91+vec2(-uTime*.053,uTime*.029));
     vec2 fine=vec2(capillary.y*.8+capillary.z*.6,-capillary.y*.6+capillary.z*.8);
     float calm=mix(.55,1.,smoothstep(0.,18.,d));
     vec2 slope=(waves.yz*.045+fine*.018)*calm;
     vec3 N=normalize(vec3(slope.x,1.,slope.y));
     vec3 V=normalize(cameraPosition-vCoast);float fresnel=.025+.52*pow(1.-max(0.,dot(V,N)),4.);
     vec3 shallow=uShallow,deep=uDeep,sky=tropicalSky(reflect(-V,N));
     // The sand shelf stays warm and visible through the first few metres;
     // the shallows shift to turquoise before the deeper Andaman blue.
     float depth=max(0.,d);
     float absorption=1.-exp(-depth*.046);
     vec3 color=mix(shallow,deep,absorption);
     float sandShelf=exp(-depth*.17);
     color=mix(color,shallow*.78+vec3(.095,.078,.035),sandShelf*.48);
     color*=.89+.20*medium;
     float lightNet=pow(1.-abs(waves.x-capillary.x),12.);
     color+=vec3(.13,.24,.17)*lightNet*sandShelf*.28;
     color=mix(color,sky,fresnel*(1.-sandShelf*.25));
     float glint=pow(max(0.,dot(normalize(V+uSun),N)),96.);color+=vec3(1.,.90,.68)*glint*.34;
     float crest=sin(d*.78+uTime*.78+medium*2.1);
     float broken=smoothstep(.44,.76,small*.65+medium*.35);
     float foam=smoothstep(.86,1.,crest)*broken*(1.-smoothstep(1.3,5.5,d))*.36;
     float edge=(1.-smoothstep(.04,.48,abs(d+motion-.25)))*(.12+.88*broken)*.42;
     color=mix(color,vec3(.77,.83,.76),clamp(foam+edge,0.,.65));
     gl_FragColor=vec4(color,water*clamp(mix(.34,.96,smoothstep(0.,9.,d))+foam*.3+edge*.4,0.,1.));
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`,
    });
    material.name = "continuous-coastal-water";
    const geometry = new T.PlaneGeometry(
      760,
      850,
      low ? 48 : 72,
      low ? 48 : 72,
    );
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(-300, 0, 0);
    return { shore, material, geometry };
  }, [atmosphere, low]);
  useFrame(({ clock }) => {
    resources.material.uniforms.uTime!.value = clock.elapsedTime;
  });
  useEffect(
    () => () => {
      resources.geometry.dispose();
      resources.material.dispose();
      resources.shore.dispose();
    },
    [resources],
  );
  return (
    <mesh
      name="continuous-tropical-ocean"
      geometry={resources.geometry}
      material={resources.material}
      renderOrder={1}
      frustumCulled={false}
    />
  );
}
