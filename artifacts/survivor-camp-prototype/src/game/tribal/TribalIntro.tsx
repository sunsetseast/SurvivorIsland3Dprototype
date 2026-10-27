import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { Contestant, type StagedPerson } from "../Contestants";
import { Survivor } from "../Survivor";
import { Hud } from "../Hud";
import { TribalInteractions } from "./TribalInteractions";
import { tribalInteractions } from "./interactions";
import { input } from "../state";
import {
  CAST,
  CAST_SEATS,
  PLAYER_INDEX,
  playerSeat,
  INTRO_DURATION,
  INTRO_SHOTS,
  stageAt,
  tribalIntro,
} from "./intro";
import { eliminationAt } from "./elimination";
import { TRIBAL, COUNCIL, tribalHeight } from "./layout";
import { councilAttendance } from "./attendance";

const time = () => tribalIntro.ceremonyTime;
function ArrivalActor({ index, visible }: { index: number; visible: boolean }) {
  const root = useRef<T.Group>(null);
  const npc = useMemo<StagedPerson>(
    () => ({
      id: CAST[index]!,
      ...stageAt(tribalIntro.time, index),
      facing: 0,
      animation: "walk",
      distance: 0,
      speed: 0,
    }),
    [index],
  );
  const motion = useRef({
    speed: 0,
    distance: 0,
    running: false,
    seated: false,
    seatHeight: 0.535,
  });
  useFrame(() => {
    const leaving =
      tribalIntro.getSnapshot() === "elimination" &&
      index === tribalIntro.eliminatedIndex;
    const pose = leaving
      ? { ...eliminationAt(tribalIntro.eliminationTime, index), seated: false }
      : stageAt(tribalIntro.time, index);
    Object.assign(npc, pose, {
      animation: pose.seated ? "sit" : pose.speed ? "walk" : "idle",
    });
    Object.assign(motion.current, {
      speed: pose.speed,
      distance: pose.distance,
      seated: pose.seated,
      seatHeight: CAST_SEATS[index]!.position[1],
    });
    if (index === PLAYER_INDEX && root.current) {
      root.current.position.set(pose.x, pose.y, pose.z);
      root.current.rotation.y = pose.facing;
    }
  }, -1);
  return (
    <group
      visible={visible}
      name={`council-attendee-${CAST[index]}`}
      userData={{ attendee: CAST[index] }}
    >
      {index === PLAYER_INDEX ? (
        <group ref={root}>
          <Survivor motion={motion} />
        </group>
      ) : (
        <Contestant npc={npc} terrain={tribalHeight} time={time} />
      )}
    </group>
  );
}
function CeremonyTorch() {
  const root = useRef<T.Group>(null),
    flame = useRef<T.Mesh>(null),
    snuffer = useRef<T.Group>(null);
  useFrame(() => {
    const active = tribalIntro.getSnapshot() === "elimination";
    if (root.current) root.current.visible = active;
    if (snuffer.current) snuffer.current.visible = active;
    if (!active || !root.current) return;
    const p = eliminationAt(
      tribalIntro.eliminationTime,
      tribalIntro.eliminatedIndex,
    );
    root.current.position.set(
      p.x + Math.cos(p.facing) * 0.34,
      p.y,
      p.z - Math.sin(p.facing) * 0.34,
    );
    if (flame.current) flame.current.visible = p.lit;
    if (snuffer.current) {
      const k =
        p.phase === "snuff"
          ? Math.sin((Math.max(0, Math.min(1, p.holdTime - 0.7)) * Math.PI) / 2)
          : 0;
      snuffer.current.position.set(
        root.current.position.x,
        p.y + 2.75 - k * 0.5,
        root.current.position.z,
      );
      snuffer.current.visible = p.phase === "snuff";
    }
  });
  return (
    <>
      <group ref={root} visible={false} name="ceremony-carried-torch">
        <mesh position={[0, 1.06, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 1.65, 8]} />
          <meshStandardMaterial color="#65432d" roughness={1} />
        </mesh>
        <mesh position={[0, 1.94, 0]}>
          <cylinderGeometry args={[0.14, 0.06, 0.23, 8]} />
          <meshStandardMaterial color="#302c28" roughness={0.9} />
        </mesh>
        <mesh ref={flame} position={[0, 2.18, 0]} scale={[0.1, 0.3, 0.1]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#ffac40" toneMapped={false} />
        </mesh>
      </group>
      <group ref={snuffer} visible={false} name="ceremony-snuffer">
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.22, 0.28, 12]} />
          <meshStandardMaterial color="#4a443b" roughness={0.7} />
        </mesh>
        <mesh position={[-0.4, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.85, 8]} />
          <meshStandardMaterial color="#806b48" />
        </mesh>
      </group>
    </>
  );
}
export function TribalIntro({
  mode,
}: {
  mode: ReturnType<typeof tribalIntro.getSnapshot>;
}) {
  const participants = useSyncExternalStore(
    councilAttendance.subscribe,
    councilAttendance.getSnapshot,
  );
  const jeff = useMemo<StagedPerson>(
    () => ({
      id: -1,
      // Keep the actor tied to the ceremony anchor rather than a second
      // unrelated hard-coded position. Stand behind the tabletop with body clearance.
      x: TRIBAL.host.position[0],
      y: TRIBAL.host.position[1],
      z: TRIBAL.host.position[2],
      facing: TRIBAL.host.facing,
      animation: "idle",
      distance: 0,
      speed: 0,
    }),
    [],
  );
  const target = useMemo(() => new T.Vector3(), []);
  useEffect(() => {
    tribalIntro.reset();
    tribalInteractions.reset();
    return () => {
      input.joyX = input.joyY = 0;
      input.run = false;
    };
  }, [participants]);
  useFrame(({ camera }, dt) => {
    tribalIntro.step(dt);
    jeff.animation =
      mode === "elimination" &&
      eliminationAt(tribalIntro.eliminationTime, tribalIntro.eliminatedIndex)
        .phase === "snuff"
        ? "work"
        : "idle";
    if (mode === "explore") return;
    input.joyX = input.joyY = 0;
    input.run = false;
    if (mode === "elimination") {
      const p = eliminationAt(
        tribalIntro.eliminationTime,
        tribalIntro.eliminatedIndex,
      );
      const shot =
        p.phase === "exit" ? TRIBAL.cameras.lastWalk : TRIBAL.cameras.host;
      if (p.phase === "exit") {
        // Follow from the open side of the route, never return behind the podium.
        camera.position.set(p.x - 4, p.y + 3.1, p.z - 5);
        target.set(p.x, p.y + 1.1, p.z);
      } else {
        camera.position.set(...(shot.position as [number, number, number]));
        target.set(...(shot.target as [number, number, number]));
      }
    } else if (mode === "intro") {
      const shot =
        INTRO_SHOTS.find((s) => tribalIntro.time < s.end) ||
        INTRO_SHOTS.at(-1)!;
      const k = Math.max(
          0,
          Math.min(
            1,
            (tribalIntro.time - shot.start) / (shot.end - shot.start),
          ),
        ),
        t = k * k * (3 - 2 * k);
      camera.position.set(
        shot.from[0]! + (shot.to[0]! - shot.from[0]!) * t,
        shot.from[1]! + (shot.to[1]! - shot.from[1]!) * t,
        shot.from[2]! + (shot.to[2]! - shot.from[2]!) * t,
      );
      target.set(shot.target[0]!, shot.target[1]!, shot.target[2]!);
      if (shot.label === "Bring in the survivors" && CAST.length) {
        // Fit the actual procession, including the trailing player, at every aspect ratio.
        const poses = CAST.map((_, i) => stageAt(tribalIntro.time, i));
        const centre = poses
          .reduce(
            (p, a) => p.add(new T.Vector3(a.x, a.y + 0.95, a.z)),
            new T.Vector3(),
          )
          .multiplyScalar(1 / poses.length);
        const radius =
          Math.max(
            2.3,
            ...poses.map((p) => Math.hypot(p.x - centre.x, p.z - centre.z)),
          ) + 0.8;
        const perspective = camera as T.PerspectiveCamera;
        const v = T.MathUtils.degToRad(perspective.fov) * 0.5 * 0.72;
        const half = Math.min(v, Math.atan(Math.tan(v) * perspective.aspect));
        const distance = radius / Math.sin(half);
        camera.position
          .copy(centre)
          .add(
            new T.Vector3(0.15, 0.3, 1).normalize().multiplyScalar(distance),
          );
        target.copy(centre);
      }
      if (shot.label === "Take a seat" && CAST_SEATS.length) {
        const perspective = camera as T.PerspectiveCamera;
        const halfY = T.MathUtils.degToRad(perspective.fov) * 0.5 * 0.86;
        const halfX = Math.atan(Math.tan(halfY) * perspective.aspect);
        const halfWidth =
          (CAST_SEATS.at(-1)!.position[0] - CAST_SEATS[0]!.position[0]) / 2 +
          0.9;
        // Fit the wide formation as a rectangle, with floor/fire clearance.
        const distance = Math.max(
          7.6,
          halfWidth / Math.tan(halfX) + 1.3,
          1.4 / Math.tan(halfY),
        );
        target.set(0, 1.05, -6.5);
        camera.position
          .copy(target)
          .add(
            new T.Vector3(0.24, 0.24, 1).normalize().multiplyScalar(distance),
          );
      }
    } else {
      const [x, , z] = (playerSeat() ?? CAST_SEATS[0] ?? TRIBAL.arrival)
        .position;
      camera.position.set(x - 0.6, 2.1, z - 0.95);
      target.set(COUNCIL.host.x, 1.65, COUNCIL.host.z);
    }
    camera.lookAt(target);
  }, -2);
  return (
    <>
      <group
        name="jeff-probst"
        userData={{ role: "host", characterName: "Jeff Probst" }}
      >
        <Contestant npc={jeff} terrain={tribalHeight} time={time} />
      </group>
      <CeremonyTorch />
      {CAST.map((id, i) => (
        <ArrivalActor
          key={id}
          index={i}
          visible={i !== PLAYER_INDEX || mode !== "explore"}
        />
      ))}
    </>
  );
}

export function TribalOverlay({ onMenu }: { onMenu: () => void }) {
  const mode = useSyncExternalStore(
    tribalIntro.subscribe,
    tribalIntro.getSnapshot,
  );
  const [caption, setCaption] = useState("The forgotten sanctuary");
  useEffect(() => {
    const timer = setInterval(
      () =>
        setCaption(
          (
            INTRO_SHOTS.find((s) => tribalIntro.time < s.end) ||
            INTRO_SHOTS.at(-1)!
          ).label,
        ),
      200,
    );
    return () => clearInterval(timer);
  }, []);
  if (mode === "explore")
    return (
      <>
        <Hud tribal onMenu={onMenu} />
        <TribalInteractions />
      </>
    );
  return (
    <div
      className="tribal-intro-overlay"
      data-testid="tribal-intro"
      data-phase={mode}
    >
      <div className="tribal-letterbox top" />
      <div className="tribal-letterbox bottom" />
      <div className="tribal-intro-actions">
        <button className="btn" data-testid="button-menu" onClick={onMenu}>
          MENU
        </button>
        {(mode === "intro" || mode === "elimination") && (
          <button
            className="btn"
            data-testid="skip-tribal-intro"
            onClick={tribalIntro.skip}
          >
            {mode === "elimination" ? "END REHEARSAL" : "SKIP INTRO"}
          </button>
        )}
      </div>
      <div className="tribal-intro-caption">
        <span>TRIBAL COUNCIL</span>
        <p>
          {mode === "elimination"
            ? "The tribe has spoken · Ceremony rehearsal"
            : mode === "intro"
              ? caption
              : "The torches are lit. Take it all in."}
        </p>
        {mode === "seated" && (
          <button
            className="sanctuary-primary"
            data-testid="stand-and-explore"
            onClick={tribalIntro.stand}
          >
            Stand up and explore →
          </button>
        )}
      </div>
    </div>
  );
}
