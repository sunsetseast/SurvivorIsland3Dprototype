import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Player } from "../Player";
import { rng } from "../world";
import { dbg } from "../state";
import { buildSanctuary, type FlameSource } from "./architecture";
import { COUNCIL, tribalWorld } from "./layout";
import { TribalIntro } from "./TribalIntro";
import { CAST, CAST_SEATS, tribalIntro } from "./intro";
import { tribalInteractions } from "./interactions";
import { AuthoredSanctuary, useSanctuaryKit } from "./AuthoredSanctuary";
import { tribalAudio } from "./audio";

function NightSky() {
  const assets = useMemo(() => {
    const random = rng(9431),
      position: number[] = [],
      colors: number[] = [],
      sizes: number[] = [];
    for (let i = 0; i < 470; i++) {
      const a = random() * Math.PI * 2,
        elevation = Math.asin(0.08 + random() * 0.9),
        r = 145;
      position.push(
        Math.cos(a) * Math.cos(elevation) * r,
        Math.sin(elevation) * r,
        Math.sin(a) * Math.cos(elevation) * r,
      );
      const brightness = 0.3 + random() ** 3 * 0.7;
      colors.push(brightness * 0.82, brightness * 0.9, brightness);
      sizes.push(i % 23 === 0 ? 2.5 : 1.1 + random() * 1.3);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(position, 3),
    );
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("size", new T.Float32BufferAttribute(sizes, 1));
    const material = new T.ShaderMaterial({
      vertexColors: true,
      depthWrite: false,
      transparent: true,
      fog: false,
      vertexShader:
        "attribute float size; varying vec3 tint; void main(){ tint=color; vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=size; }",
      fragmentShader:
        "varying vec3 tint; void main(){ float d=length(gl_PointCoord-.5)*2.; if(d>1.) discard; gl_FragColor=vec4(tint,(1.-smoothstep(.1,1.,d))*.85); }",
    });
    return { geometry, material };
  }, []);
  useEffect(
    () => () => {
      assets.geometry.dispose();
      assets.material.dispose();
    },
    [assets],
  );
  return (
    <>
      <mesh>
        <sphereGeometry args={[155, 32, 16]} />
        <shaderMaterial
          side={T.BackSide}
          depthWrite={false}
          vertexShader={
            "varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}"
          }
          fragmentShader={
            "varying vec3 p; void main(){float h=clamp(normalize(p).y,0.,1.); vec3 c=mix(vec3(.035,.063,.082),vec3(.003,.008,.023),pow(h,.6)); gl_FragColor=vec4(c,1.);}"
          }
        />
      </mesh>
      <points
        geometry={assets.geometry}
        material={assets.material}
        renderOrder={1}
        frustumCulled={false}
      />
      <mesh position={[48, 83, -100]}>
        <sphereGeometry args={[1.45, 20, 16]} />
        <meshBasicMaterial color="#bdd7e4" toneMapped={false} />
      </mesh>
    </>
  );
}

function LivingFire({ sources }: { sources: FlameSource[] }) {
  const light = useRef<T.PointLight>(null);
  const assets = useMemo(() => {
    const pieces: T.BufferGeometry[] = [],
      random = rng(491);
    for (const source of sources)
      for (let i = 0; i < (source.size > 1 ? 9 : 3); i++) {
        const size = source.size * (0.55 + random() * 0.65),
          a = i * 2.399;
        const root = new T.Vector3(
          source.x + Math.cos(a) * source.size * 0.35,
          source.y,
          source.z + Math.sin(a) * source.size * 0.35,
        );
        const phase = random() * 7;
        const g = new T.SphereGeometry(1, 7, 6),
          p = g.getAttribute("position"),
          origins: number[] = [],
          heights: number[] = [],
          phases: number[] = [];
        for (let j = 0; j < p.count; j++) {
          const h = (p.getY(j) + 1) * 0.5,
            taper = 1 - h * 0.75;
          p.setXYZ(
            j,
            root.x + p.getX(j) * size * 0.32 * taper,
            root.y + h * size * 1.8,
            root.z + p.getZ(j) * size * 0.32 * taper,
          );
          origins.push(root.x, root.y, root.z);
          heights.push(h);
          phases.push(phase);
        }
        g.setAttribute("origin", new T.Float32BufferAttribute(origins, 3));
        g.setAttribute("height", new T.Float32BufferAttribute(heights, 1));
        g.setAttribute("phase", new T.Float32BufferAttribute(phases, 1));
        pieces.push(g);
      }
    const geometry = mergeGeometries(pieces)!;
    pieces.forEach((g) => g.dispose());
    const material = new T.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
      vertexShader: `uniform float time; attribute vec3 origin; attribute float height; attribute float phase; varying float h; varying float flicker;
        void main(){h=height; vec3 p=position; float seed=origin.x*.71+origin.z*.43+phase; float s=sin(time*5.+seed); p.x+=sin(time*4.3+h*7.+seed)*h*h*.24; p.z+=cos(time*3.7+h*6.+seed)*h*h*.2; p.y=origin.y+(p.y-origin.y)*(1.+s*.17); flicker=.88+s*.12; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `varying float h; varying float flicker; void main(){vec3 c=mix(vec3(1.,.72,.22),vec3(.9,.12,.008),smoothstep(.15,1.,h)); float a=(1.-smoothstep(.68,1.,h))*.5*flicker; gl_FragColor=vec4(c,a);}`,
    });
    const count = 105,
      points = new T.BufferGeometry(),
      p: number[] = [],
      seed: number[] = [];
    for (let i = 0; i < count; i++) {
      p.push((random() - 0.5) * 2, random() * 7, (random() - 0.5) * 2);
      seed.push(random() * 10);
    }
    points.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    points.setAttribute("seed", new T.Float32BufferAttribute(seed, 1));
    const sparks = new T.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      vertexShader: `uniform float time; attribute float seed; varying float a; void main(){vec3 p=position; p.y=mod(p.y+time*(.6+seed*.05),7.); p.x+=sin(time+seed+p.y)*p.y*.09; p.z+=cos(time*.8+seed)*p.y*.07; a=1.-p.y/7.; vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=min(5.,32./-mv.z);}`,
      fragmentShader:
        "varying float a; void main(){float d=length(gl_PointCoord-.5); if(d>.5)discard; gl_FragColor=vec4(1.,.34,.045,a*(1.-d*2.));}",
    });
    const smoke = new T.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      transparent: true,
      depthWrite: false,
      vertexShader: `uniform float time; attribute float seed; varying float a; void main(){vec3 p=position; p.y=mod(p.y+time*.3,8.); p.x=sin(seed+time*.2)*(.3+p.y*.16)+p.y*.15; p.z=cos(seed+time*.15)*(.3+p.y*.16); a=sin(p.y/8.*3.14159)*.045; vec4 mv=modelViewMatrix*vec4(p+vec3(0.,1.5,0.),1.); gl_Position=projectionMatrix*mv; gl_PointSize=min(90.,(25.+p.y*12.)/max(1.,-mv.z)*14.);}`,
      fragmentShader:
        "varying float a; void main(){float d=length(gl_PointCoord-.5)*2.; gl_FragColor=vec4(.23,.25,.27,(1.-smoothstep(0.,1.,d))*a);}",
    });
    return { geometry, material, points, sparks, smoke };
  }, [sources]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    assets.material.uniforms.time!.value = t;
    assets.sparks.uniforms.time!.value = t;
    assets.smoke.uniforms.time!.value = t;
    if (light.current)
      light.current.intensity =
        58 + Math.sin(t * 7.3) * 3 + Math.sin(t * 11.1) * 2;
  });
  useEffect(
    () => () => {
      assets.geometry.dispose();
      assets.material.dispose();
      assets.points.dispose();
      assets.sparks.dispose();
      assets.smoke.dispose();
    },
    [assets],
  );
  return (
    <>
      <mesh
        geometry={assets.geometry}
        material={assets.material}
        frustumCulled={false}
      />
      <points
        geometry={assets.points}
        material={assets.sparks}
        frustumCulled={false}
      />
      <points
        geometry={assets.points}
        material={assets.smoke}
        frustumCulled={false}
      />
      <pointLight
        ref={light}
        position={[0, 2, 0]}
        color="#ff8d3c"
        intensity={58}
        distance={34}
        decay={1.45}
      />
    </>
  );
}

function PracticeBallot() {
  const ballot = useSyncExternalStore(
    tribalInteractions.subscribe,
    tribalInteractions.getSnapshot,
  );
  return ballot.folded ? (
    <group
      name="folded-practice-ballot"
      position={[-34.1, 1.52, 16.15]}
      rotation={[0, 0.1, 0]}
    >
      <mesh>
        <boxGeometry args={[0.37, 0.025, 0.5]} />
        <meshStandardMaterial color="#ddc79b" roughness={1} />
      </mesh>
      <mesh position={[0.175, 0.015, 0]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.025, 0.03, 0.5]} />
        <meshStandardMaterial color="#b49a70" roughness={1} />
      </mesh>
    </group>
  ) : null;
}
export function TribalScene() {
  const mode = useSyncExternalStore(
    tribalIntro.subscribe,
    tribalIntro.getSnapshot,
  );
  const exploration = useMemo(
    () => ({
      ...tribalWorld,
      resetSpawn: tribalWorld.spawn,
      controlsLocked: () => !!tribalInteractions.getSnapshot().open,
      standFrom: {
        x: CAST_SEATS[4]!.position[0] + Math.sin(CAST_SEATS[4]!.facing) * 0.37,
        z: CAST_SEATS[4]!.position[2] + Math.cos(CAST_SEATS[4]!.facing) * 0.37,
        facing: CAST_SEATS[4]!.facing,
      },
      spawn: {
        x: CAST_SEATS[4]!.position[0],
        z: CAST_SEATS[4]!.position[2] + 1.05,
      },
      yaw: -2.3,
    }),
    [],
  );
  const shadowTime = useRef(1);
  const {kit,low,failed} = useSanctuaryKit();
  const sanctuary = useMemo(() => buildSanctuary(CAST.length, !!kit), [kit]);
  useEffect(
    () => () => {
      sanctuary.dispose();
    },
    [sanctuary],
  );
  useEffect(() => () => tribalAudio.stop(), []);
  useFrame(({ gl }, dt) => {
    dbg.tribalFrames++;
    gl.shadowMap.autoUpdate = false;
    shadowTime.current += Math.min(dt, 0.05);
    if (shadowTime.current > 0.16) {
      gl.shadowMap.needsUpdate = true;
      shadowTime.current = 0;
    }
    dbg.calls = gl.info.render.calls;
    dbg.triangles = gl.info.render.triangles;
    tribalAudio.update(dbg.x, dbg.z, dt);
  });
  return (
    <>
      <color attach="background" args={["#060e1e"]} />
      <fog attach="fog" args={["#08151a", 34, 100]} />
      <NightSky />
      <hemisphereLight args={["#a2b9cb", "#514431", 1.05]} />
      <directionalLight
        position={[18, 35, -25]}
        color="#9ebcda"
        intensity={2.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-45}
        shadow-camera-right={35}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={100}
        shadow-bias={-0.0005}
        shadow-normalBias={0.08}
      />
      <pointLight
        position={[-2, 3.5, -8.5]}
        color="#ffb365"
        intensity={26}
        distance={25}
        decay={1.3}
      />
      <pointLight
        position={[-19, 4, -3]}
        color="#ffc077"
        intensity={24}
        distance={18}
        decay={1.5}
      />
      <pointLight
        position={[-34, 3, 17]}
        color="#ffb36b"
        intensity={19}
        distance={13}
        decay={1.3}
      />
      <pointLight
        position={[COUNCIL.host.x, 3.5, COUNCIL.host.z]}
        color="#ffa761"
        intensity={20}
        distance={17}
        decay={1.4}
      />
      <pointLight
        position={[-1, 3.4, -17.1]}
        color="#e99c50"
        intensity={62}
        distance={29}
        decay={1.5}
      />
      <group name={failed ? "sanctuary-asset-fallback" : kit ? "sanctuary-assets-ready" : "sanctuary-assets-loading"}>
        <primitive object={sanctuary.group} />
        {kit && <AuthoredSanctuary kit={kit} low={low}/>}
      </group>
      <LivingFire sources={sanctuary.flames} />
      <TribalIntro mode={mode} />
      <PracticeBallot />
      {mode === "explore" && <Player environment={exploration} />}
    </>
  );
}
