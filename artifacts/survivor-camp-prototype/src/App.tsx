import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { Scene } from "@/game/Scene";
import { Hud, TouchButton } from "@/game/Hud";
import { dbg, input, clearInput as releaseInput } from "@/game/state";
import { TribalOverlay } from "@/game/tribal/TribalIntro";
import { camp } from "@/game/CampRuntime";
import { worldTravel } from "@/game/locations/travel";
import { LOCATIONS } from "@/game/locations/registry";
import { TravelHud, developerTravel } from "@/game/locations/TravelHud";
import {
  SceneLifecycle,
  LocationErrorBoundary,
  waitForSceneRelease,
} from "@/game/locations/SceneLifecycle";

const IslandScene = lazy(() =>
  import("@/game/railay/IslandScene").then((m) => ({ default: m.IslandScene })),
);
const IslandHud = lazy(() =>
  import("@/game/railay/IslandHud").then((m) => ({ default: m.IslandHud })),
);
const TribalScene = lazy(() =>
  import("@/game/tribal/TribalScene").then((m) => ({ default: m.TribalScene })),
);

const keyMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "back", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
];

function App() {
  const travel = useSyncExternalStore(
    worldTravel.subscribe,
    worldTravel.getSnapshot,
  );
  const mode =
    travel.phase === "menu"
      ? "menu"
      : travel.active
        ? LOCATIONS[travel.active].scene
        : null;
  useEffect(() => {
    if (travel.phase === "unloading")
      void waitForSceneRelease().then(() =>
        worldTravel.loadPending(travel.token),
      );
  }, [travel.phase, travel.token]);
  const sceneQuality =
    LOCATIONS[travel.active ?? travel.target ?? worldTravel.session.locationId]
      .quality;
  const [low, setLow] = useState(
    () =>
      new URLSearchParams(location.search).get("quality") === "low" ||
      navigator.hardwareConcurrency <= 4,
  );
  const [overview, setOverview] = useState(false);
  const [islandControlsLocked, setIslandControlsLocked] = useState(false);
  const [islandReady, setIslandReady] = useState(false);
  useEffect(() => {
    if (travel.phase === "fading") {
      setOverview(false);
      setIslandControlsLocked(false);
      setIslandReady(false);
    }
  }, [travel.phase, travel.token]);
  const enter = (next: "menu" | "camp" | "tribal" | "railay") => {
    setOverview(false);
    setIslandControlsLocked(false);
    setIslandReady(false);
    releaseInput();
    input.pitch = 0.34;
    dbg.resetRequested = false;
    dbg.teleportRequested = null;
    if (next === "menu") worldTravel.menu();
    else if (next === "camp")
      worldTravel.enter("camp_tribe_a", developerTravel);
    else if (next === "tribal") worldTravel.enter("tribal_council", true);
    else if (developerTravel) worldTravel.enter("railay_trails", true);
  };
  useEffect(() => {
    const clearInput = () => {
      releaseInput();
    };
    const releaseKeys = () => {
      // Browser tab switches can swallow keyup, leaving a development key held.
      for (const binding of keyMap)
        for (const code of binding.keys) {
          const key = code.startsWith("Key")
            ? code.slice(3).toLowerCase()
            : code.startsWith("Shift")
              ? "Shift"
              : code;
          window.dispatchEvent(
            new KeyboardEvent("keyup", { code, key, bubbles: true }),
          );
        }
    };
    window.addEventListener("survivor-input-clear", releaseKeys);
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", clearInput);
    const d = {
      get tribalFrames() {
        return dbg.tribalFrames;
      },
      get position() {
        return { x: dbg.x, y: dbg.y, z: dbg.z };
      },
      get camera() {
        return {
          owner: dbg.cameraOwner,
          blend: dbg.votingBlend,
          face: dbg.face,
          cpuMs: dbg.cameraCpuMs,
          x: dbg.cx,
          y: dbg.cy,
          z: dbg.cz,
          yaw: input.yaw,
          pitch: input.pitch,
        };
      },
      get location() {
        return dbg.location;
      },
      get moving() {
        return dbg.moving;
      },
      get running() {
        return dbg.running;
      },
      get speed() {
        return dbg.speed;
      },
      get cameraDistance() {
        return dbg.cameraDistance;
      },
      get cameraBlocked() {
        return dbg.cameraBlocked;
      },
      get camp() {
        return {
          now: camp.now,
          metrics: { ...camp.metrics },
          mode: camp.provider.mode,
          npcs: camp.npcs.map((n) => ({
            id: n.id,
            x: n.x,
            y: n.y,
            z: n.z,
            place: n.place,
            destination: n.destination && { ...n.destination },
            traveling: n.traveling,
            activity: n.activity,
            animation: n.animation,
            groupId: n.groupId,
            approach: n.approach,
          })),
          groups: camp.groups.map((g) => ({
            ...g,
            participantIds: [...g.participantIds],
          })),
        };
      },
      reset: () => {
        dbg.resetRequested = true;
      },
    };
    (window as unknown as { __CAMP_DEBUG__: unknown }).__CAMP_DEBUG__ =
      Object.freeze(d);
    return () => {
      window.removeEventListener("survivor-input-clear", releaseKeys);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", clearInput);
    };
  }, []);
  return (
    <KeyboardControls map={keyMap}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          height: "var(--game-height, 100%)",
        }}
      >
        {mode !== "menu" && (
          <Canvas
            frameloop={
              mode === "railay" && overview && travel.phase === "ready"
                ? "demand"
                : "always"
            }
            shadows={sceneQuality.shadows}
            dpr={low ? 1 : [1, sceneQuality.mobileDpr]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            camera={{
              fov: 55,
              near: 0.2,
              far: mode === "railay" ? 6500 : 200,
              position: mode === "tribal" ? [0, 38, 9] : [0, 6, 0],
            }}
            style={{ pointerEvents: "none" }}
          >
            {travel.active && (
              <LocationErrorBoundary
                key={
                  travel.phase === "fading" ? travel.token - 1 : travel.token
                }
                token={travel.token}
              >
                <SceneLifecycle id={travel.active} token={travel.token}>
                  <Suspense fallback={null}>
                    {mode === "railay" ? (
                      <IslandScene
                        arrival={travel.entry ?? undefined}
                        low={low}
                        overview={overview}
                        controlsLocked={
                          islandControlsLocked || worldTravel.blocked
                        }
                        onReady={() => setIslandReady(true)}
                      />
                    ) : mode === "tribal" ? (
                      <TribalScene />
                    ) : (
                      <Scene arrival={travel.entry ?? undefined} low={low} />
                    )}
                  </Suspense>
                </SceneLifecycle>
              </LocationErrorBoundary>
            )}
          </Canvas>
        )}
        {mode === "railay" && !islandReady && (
          <div className="island-loading" role="status">
            Preparing the Railay peninsula…
          </div>
        )}
        {travel.phase === "ready" &&
          (mode === "railay" ? (
            <Suspense
              fallback={
                <div className="island-loading">Preparing the peninsula…</div>
              }
            >
              <IslandHud
                onMenu={() => enter("menu")}
                low={low}
                setLow={setLow}
                overview={overview}
                setOverview={setOverview}
                onBlockedChange={setIslandControlsLocked}
              />
            </Suspense>
          ) : mode === "tribal" ? (
            <TribalOverlay onMenu={() => enter("menu")} />
          ) : (
            <Hud onMenu={() => enter("menu")} />
          ))}
        <TravelHud blocked={mode === "railay" && islandControlsLocked} />
        {mode === "menu" && (
          <main className="sanctuary-menu">
            <div className="sanctuary-menu-inner">
              <p className="sanctuary-eyebrow">
                SURVIVOR ISLAND · 3D PROTOTYPE
              </p>
              <h1>
                Fire. Stone.
                <br />
                <em>Survival.</em>
              </h1>
              <p className="sanctuary-intro">
                Camp life, strategy, and journeys beyond the palms.
                <br />
                Your tribe is waiting at camp.
              </p>
              <TouchButton
                data-testid="explore-island"
                className="sanctuary-primary"
                onActivate={() => enter("camp")}
              >
                Continue Survivor Session <span>→</span>
              </TouchButton>
              <TouchButton
                data-testid="explore-tribal"
                className="sanctuary-secondary"
                onActivate={() => enter("tribal")}
              >
                Rehearse Tribal Council
              </TouchButton>
              {developerTravel && (
                <TouchButton
                  data-testid="explore-railay"
                  className="sanctuary-secondary"
                  onActivate={() => enter("railay")}
                >
                  Development · Explore Island
                </TouchButton>
              )}
              <p className="sanctuary-footnote">
                Camp life · Authorized journeys · Landscape recommended
              </p>
            </div>
            <div className="sanctuary-menu-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </main>
        )}
      </div>
    </KeyboardControls>
  );
}

export default App;
