import { CliffGardens } from "./tonsai/CliffGardens";
import { CoastalSky } from "./tonsai/CoastalSky";
import { CoastalDetails } from "./tonsai/CoastalDetails";
import { TonsaiKarsts } from "./tonsai/Karsts";
import { TropicalForest } from "./tonsai/TropicalForest";
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { Player, type ExplorationWorld } from "../Player";
import { dbg } from "../state";
import { validateSpawn } from "../locations/spawn";
import { walkable } from "./terrain";
import type { Pose } from "../locations/registry";
import { TrailMarker } from "../locations/TrailMarker";
import { ZONES, zoneAt } from "./geography";
import {
  heightAt,
  moveOnTerrain,
  prepareTerrain,
  releaseTerrain,
} from "./terrain";
import { RailayTerrain, MainlandContext } from "./Terrain";
import { Vegetation } from "./Vegetation";
import { Ocean } from "./Ocean";
import { Geology } from "./Geology";
export const WORLD: ExplorationWorld = {
  locationId: "railay_trails",
  spawn: ZONES[1].spawn,
  yaw: -1.35,
  height: heightAt,
  move: moveOnTerrain,
  location: zoneAt,
};
export function IslandScene({
  low,
  arrival,
  overview,
  controlsLocked,
  onReady,
}: {
  low: boolean;
  arrival?: Pose;
  overview: boolean;
  controlsLocked: boolean;
  onReady: () => void;
}) {
  const spawn = useMemo(() => arrival && validateSpawn(arrival, {height:heightAt,walkable}), [arrival]);
  const { gl, scene, camera, invalidate } = useThree();
  useEffect(() => {
    if (!overview) return;
    const id = setInterval(invalidate, 120);
    return () => clearInterval(id);
  }, [overview, invalidate]);
  useMemo(prepareTerrain, []);
  useEffect(() => {
    onReady();
  }, []);
  useEffect(() => {
    const old = gl.getPixelRatio();
    gl.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio, 1.5));
    return () => gl.setPixelRatio(old);
  }, [gl, low]);
  useEffect(() => {
    camera.far = 6500;
    camera.updateProjectionMatrix();
    return () => {
      releaseTerrain();
    };
  }, [camera]);
  useEffect(() => {
    const w = window as unknown as { __RAILAY__: unknown };
    w.__RAILAY__ = {
      scene,
      camera,
      gl,
      teleport: (id: string) => {
        const z = ZONES.find((z) => z.id === id);
        if (z) dbg.teleportRequested = { ...z.spawn };
      },
      stats: () => ({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length,
        quality: low ? "low" : "high",
      }),
    };
    return () => {
      delete (w as any).__RAILAY__;
    };
  }, [scene, camera, gl, low]);
  useFrame(() => {
    if (overview) {
      camera.position.set(-1300, 1800, 1950);
      camera.lookAt(-50, 20, -110);
    }
    dbg.calls = gl.info.render.calls;
    dbg.triangles = gl.info.render.triangles;
  }, 1);
  // Priority 1 above owns camera in overview; still render through the same WebGL renderer.
  useFrame(({ gl, scene, camera }) => gl.render(scene, camera), 2);
  const environment = useMemo(
    () => ({ ...WORLD, controlsLocked: () => overview || controlsLocked }),
    [overview, controlsLocked],
  );
  return (
    <>
      <color attach="background" args={["#8fc3d7"]} />
      <CoastalSky />
      <fog attach="fog" args={["#accbd2", 1050, 4800]} />
      <hemisphereLight args={["#c7e3ed", "#696b45", 1.4]} />
      <directionalLight
        position={[-1100, 1200, -700]}
        intensity={3.2}
        color="#fff1d8"
      />
      <group name="railay-world">
        <RailayTerrain low={low} tonsaiReady />
        <TonsaiKarsts low={low} />
        <TropicalForest low={low} />
        <CliffGardens low={low} />
        <CoastalDetails low={low} />
        <MainlandContext />
        <Ocean />
        <Vegetation low={low} />
        <Geology />
        <TrailMarker connectionId="trail_to_camp" height={heightAt} />
        <Player environment={environment} arrival={spawn} />
      </group>
    </>
  );
}
