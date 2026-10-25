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
import { input } from "../state";
import {
  CAST,
  CAST_SEATS,
  INTRO_DURATION,
  INTRO_SHOTS,
  stageAt,
  tribalIntro,
} from "./intro";
import { tribalHeight } from "./layout";

const time = () => tribalIntro.time;
function ArrivalActor({ index, visible }: { index: number; visible: boolean }) {
  const root = useRef<T.Group>(null);
  const npc = useMemo<StagedPerson>(
    () => ({
      id: CAST[index]!,
      x: 0,
      y: 0,
      z: 0,
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
  });
  useFrame(() => {
    const pose = stageAt(tribalIntro.time, index);
    Object.assign(npc, pose, {
      animation: pose.seated ? "sit" : pose.speed ? "walk" : "idle",
    });
    Object.assign(motion.current, {
      speed: pose.speed,
      distance: pose.distance,
      seated: pose.seated,
    });
    if (index === 4 && root.current) {
      root.current.position.set(pose.x, pose.y, pose.z);
      root.current.rotation.y = pose.facing;
    }
  }, -1);
  return (
    <group visible={visible}>
      {index === 4 ? (
        <group ref={root}>
          <Survivor motion={motion} />
        </group>
      ) : (
        <Contestant npc={npc} terrain={tribalHeight} time={time} />
      )}
    </group>
  );
}
export function TribalIntro({
  mode,
}: {
  mode: ReturnType<typeof tribalIntro.getSnapshot>;
}) {
  const jeff = useMemo<StagedPerson>(
    () => ({
      id: -1,
      x: 12.5,
      y: 0.5,
      z: 6.3,
      facing: -2.25,
      animation: "idle",
      distance: 0,
      speed: 0,
    }),
    [],
  );
  const target = useMemo(() => new T.Vector3(), []);
  useEffect(() => {
    tribalIntro.reset();
    return () => {
      input.joyX = input.joyY = 0;
      input.run = false;
    };
  }, []);
  useFrame(({ camera }, dt) => {
    tribalIntro.step(dt);
    if (mode === "explore") return;
    input.joyX = input.joyY = 0;
    input.run = false;
    if (mode === "intro") {
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
    } else {
      const [x, , z] = CAST_SEATS[4]!.position;
      camera.position.set(x + 1.4, 2.1, z - 3.5);
      target.set(8, 1.8, 3);
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
      {CAST.map((id, i) => (
        <ArrivalActor
          key={id}
          index={i}
          visible={i !== 4 || mode !== "explore"}
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
  if (mode === "explore") return <Hud tribal onMenu={onMenu} />;
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
        {mode === "intro" && (
          <button
            className="btn"
            data-testid="skip-tribal-intro"
            onClick={tribalIntro.skip}
          >
            SKIP INTRO
          </button>
        )}
      </div>
      <div className="tribal-intro-caption">
        <span>TRIBAL COUNCIL</span>
        <p>
          {mode === "intro" ? caption : "The torches are lit. Take it all in."}
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
