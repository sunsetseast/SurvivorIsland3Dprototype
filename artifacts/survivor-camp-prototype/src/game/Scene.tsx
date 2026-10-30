import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Environment } from "./environment/Environment";
import { BeachProps, CampProps, Fire, Logs, Signs, Well } from "./Camp";
import { Ocean, Sky, Terrain } from "./Terrain";
import { Player } from "./Player";
import { Contestants } from "./Contestants";
import { validateSpawn } from "./locations/spawn";
import { groundHeight, isWalkable } from "./world";
import type { Pose } from "./locations/registry";
import { TrailMarker } from "./locations/TrailMarker";

import { useThree } from "@react-three/fiber";
import {
  ATMOSPHERES,
  atmosphereName,
  sunDirection,
} from "./environment/atmosphere";

const TARGET: [number, number, number] = [-6, 0, -30];

export function Scene({
  arrival,
  low = false,
}: {
  arrival?: Pose;
  low?: boolean;
}) {
  const spawn = useMemo(
    () =>
      arrival &&
      validateSpawn(arrival, { height: groundHeight, walkable: isWalkable }),
    [arrival],
  );
  const atmosphere = useMemo(
    () => ATMOSPHERES[atmosphereName(location.search)],
    [],
  );
  const SUN_DIR = sunDirection(atmosphere);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const previous = {
      toneMapping: gl.toneMapping,
      exposure: gl.toneMappingExposure,
    };
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = atmosphere.exposure;
    return () => {
      gl.toneMapping = previous.toneMapping;
      gl.toneMappingExposure = previous.exposure;
    };
  }, [gl, atmosphere]);
  const pos = [
    TARGET[0] + SUN_DIR.x * 70,
    SUN_DIR.y * 70,
    TARGET[2] + SUN_DIR.z * 70,
  ] as [number, number, number];
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...TARGET);
    return o;
  }, []);
  return (
    <>
      <primitive object={target} />
      <color attach="background" args={[atmosphere.horizon]} />
      <fog attach="fog" args={[atmosphere.haze, 105, 290]} />
      <hemisphereLight
        args={[
          atmosphere.ambient,
          atmosphere.bounce,
          atmosphere.ambientIntensity,
        ]}
      />
      <directionalLight
        position={pos}
        target={target}
        intensity={atmosphere.sunIntensity}
        color={atmosphere.sunlight}
        castShadow
        shadow-mapSize={low ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        shadow-camera-near={1}
        shadow-camera-far={170}
        shadow-bias={-0.00025}
        shadow-normalBias={0.12}
      />
      <Sky atmosphere={atmosphere} />
      <Terrain low={low} />
      <Ocean atmosphere={atmosphere} low={low} />
      <Environment low={low} />
      <Fire />
      <Logs />
      <CampProps />
      <BeachProps />
      <Well />
      <Signs />
      <TrailMarker connectionId="camp_to_trail" height={groundHeight} />
      <Player arrival={spawn} />
      <Contestants />
    </>
  );
}
