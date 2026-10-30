import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { shorelineX } from "../world";
/** Single continuous surface. Bathymetric colour, moving normals, Fresnel sky,
 * broken crest foam and a feathered swash share the real shoreline field.
 * No offscreen passes, coplanar foam ribbons or mandatory float textures. */
export function CoastalWater() {
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
      uTime: { value: 0 },
      uShore: { value: shore },
      uSun: { value: new T.Vector3(-0.65, 0.76, -0.4).normalize() },
    };
    const material = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      uniforms,
      vertexShader: `varying vec3 vCoast; uniform float uTime; uniform sampler2D uShore;
    float shoreline(float z){vec2 s=texture2D(uShore,vec2(clamp((z+150.)/400.,.001,.999),.5)).rg;return (s.r*65280.+s.g*255.)/65535.*256.-128.;}
    void main(){vec3 p=position;float d=shoreline(p.z)-p.x;float fade=smoothstep(0.,12.,d);p.y=.025+fade*(sin(p.x*.18+p.z*.09+uTime*.75)*.07+sin(p.z*.31-p.x*.08-uTime*.6)*.045);vCoast=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vCoast,1.);}`,
      fragmentShader: `varying vec3 vCoast;uniform float uTime;uniform sampler2D uShore;uniform vec3 uSun;
    float shoreline(float z){vec2 s=texture2D(uShore,vec2(clamp((z+150.)/400.,.001,.999),.5)).rg;return (s.r*65280.+s.g*255.)/65535.*256.-128.;}
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
    void main(){float d=shoreline(vCoast.z)-vCoast.x;float motion=sin(uTime*.72+vCoast.z*.13)*.28;float water=smoothstep(-.25,.85,d+motion);if(water<.004)discard;
     vec2 q=vCoast.xz;float small=noise(q*1.4+vec2(uTime*.11,-uTime*.08));float medium=noise(q*.42+uTime*.025);
     vec3 N=normalize(vec3((noise(q*1.65+vec2(uTime*.10,0.))-noise(q*1.65+vec2(uTime*.10+.17,0.)))*.55+sin(q.x*.4-q.y*.55-uTime*.6+medium*2.)*.035,1.,(noise(q*.93+vec2(0.,-uTime*.085))-noise(q*.93+vec2(.11,-uTime*.085+.13)))*.65));
     vec3 V=normalize(cameraPosition-vCoast);float fresnel=.025+.52*pow(1.-max(0.,dot(V,N)),4.);
     vec3 shallow=vec3(.014,.22,.17),deep=vec3(.005,.07,.10),sky=vec3(.35,.55,.58);
     float depth=1.-exp(-max(0.,d)*.043);vec3 color=mix(shallow,deep,depth);color*=.93+.13*medium; color=mix(color,sky,fresnel);
     float glint=pow(max(0.,dot(normalize(V+uSun),N)),160.);color+=vec3(1.,.90,.68)*glint*.8;
     float crest=sin(d*1.85-uTime*1.12+noise(vec2(q.y*.12,0.))*1.4);float broken=smoothstep(.38,.73,small*.65+medium*.35);
     float foam=smoothstep(.88,1.,crest)*broken*(1.-smoothstep(1.1,7.,d))*.36;
     float edge=(1.-smoothstep(.06,.5,abs(d+motion-.25)))*(.25+.75*small)*.40;
     color=mix(color,vec3(.78,.86,.77),clamp(foam+edge,0.,.65));
     gl_FragColor=vec4(color,water*mix(.40,.96,smoothstep(0.,10.,d)));
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`,
    });
    material.name = "continuous-coastal-water";
    const geometry = new T.PlaneGeometry(760, 850, 100, 100);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(-300, 0, 0);
    return { shore, material, geometry };
  }, []);
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
