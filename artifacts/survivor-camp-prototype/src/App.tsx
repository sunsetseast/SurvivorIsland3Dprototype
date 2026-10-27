import { lazy, Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { Scene } from "@/game/Scene";
import { Hud } from "@/game/Hud";
import { dbg, input, clearInput as releaseInput } from "@/game/state";
import { TribalOverlay } from "@/game/tribal/TribalIntro";
import { camp } from "@/game/CampRuntime";

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
  const [mode, setMode] = useState<"menu" | "camp" | "tribal" | "railay">(
    "menu",
  );
  const [low, setLow] = useState(
    () =>
      new URLSearchParams(location.search).get("quality") === "low" ||
      navigator.hardwareConcurrency <= 4,
  );
  const [overview, setOverview] = useState(false);
  const [islandReady, setIslandReady] = useState(false);
  const enter = (next: "menu" | "camp" | "tribal" | "railay") => {
    setOverview(false);
    setIslandReady(false);
    releaseInput();
    input.pitch = 0.34;
    dbg.resetRequested = false;
    dbg.teleportRequested = null;
    setMode(next);
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
            key={`canvas-${mode}`}
            frameloop={mode === "railay" && overview ? "demand" : "always"}
            shadows={mode !== "railay"}
            dpr={mode === "railay" && low ? 1 : [1, 1.5]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            camera={{
              fov: 55,
              near: 0.2,
              far: mode === "railay" ? 6500 : 200,
              position: mode === "tribal" ? [0, 38, 9] : [0, 6, 0],
            }}
            style={{ pointerEvents: "none" }}
          >
            <Suspense fallback={null}>
              {mode === "railay" ? (
                <IslandScene
                  low={low}
                  overview={overview}
                  onReady={() => setIslandReady(true)}
                />
              ) : mode === "tribal" ? (
                <TribalScene />
              ) : (
                <Scene />
              )}
            </Suspense>
          </Canvas>
        )}
        {mode === "railay" && !islandReady && (
          <div className="island-loading" role="status">
            Preparing the Railay peninsula…
          </div>
        )}
        {mode !== "menu" &&
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
              />
            </Suspense>
          ) : mode === "tribal" ? (
            <TribalOverlay onMenu={() => enter("menu")} />
          ) : (
            <Hud onMenu={() => enter("menu")} />
          ))}
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
                Beyond the jungle, the torches are burning.
                <br />
                Explore the forgotten island sanctuary.
              </p>
              <button
                data-testid="explore-railay"
                className="sanctuary-primary"
                onClick={() => enter("railay")}
              >
                Explore Island <span>→</span>
              </button>
              <button
                data-testid="explore-tribal"
                className="sanctuary-primary"
                onClick={() => enter("tribal")}
              >
                Explore Tribal Council <span>→</span>
              </button>
              <button
                data-testid="explore-island"
                className="sanctuary-secondary"
                onClick={() => enter("camp")}
              >
                Return to the Island Camp
              </button>
              <p className="sanctuary-footnote">
                Walk freely · Drag to look · Landscape recommended
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
