import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { BOUNDS, LANDMARKS, PATH, baseHeight, shorelineX } from "./world";
import { dbg, input } from "./state";
import { camp } from "./CampRuntime";
import { tribalAudio } from "./tribal/audio";
import { tribalInteractions } from "./tribal/interactions";
import { ConversationHud } from "./ConversationHud";

const safe = (side: string) => `max(12px, env(safe-area-inset-${side}))`;
const JOY = 112,
  KNOB = 46;

function Joystick() {
  const id = useRef<number | null>(null);
  const [k, setK] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const clear = () => {
      id.current = null;
      setK({ x: 0, y: 0 });
    };
    window.addEventListener("survivor-input-clear", clear);
    return () => {
      window.removeEventListener("survivor-input-clear", clear);
      id.current = null;
      input.looking = false;
    };
  }, []);
  const upd = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2),
      dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - KNOB / 2 + 4,
      l = Math.hypot(dx, dy);
    if (l > max) {
      dx = (dx / l) * max;
      dy = (dy / l) * max;
    }
    setK({ x: dx, y: dy });
    input.joyX = dx / max;
    input.joyY = -dy / max;
  };
  const end = (e: React.PointerEvent) => {
    if (e.pointerId !== id.current) return;
    id.current = null;
    setK({ x: 0, y: 0 });
    input.joyX = 0;
    input.joyY = 0;
    input.run = false;
  };
  return (
    <div
      data-testid="joystick"
      className="joy-base absolute"
      style={{
        left: safe("left"),
        bottom: safe("bottom"),
        width: JOY,
        height: JOY,
        touchAction: "none",
        zIndex: 5,
      }}
      onPointerDown={(e) => {
        if (id.current !== null) return;
        id.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        upd(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerId === id.current) upd(e);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <div
        className="joy-knob absolute"
        style={{
          width: KNOB,
          height: KNOB,
          left: (JOY - KNOB) / 2 - 2,
          top: (JOY - KNOB) / 2 - 2,
          transform: `translate(${k.x}px,${k.y}px)`,
        }}
      />
    </div>
  );
}

function RunButton() {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 120);
    return () => clearInterval(id);
  }, []);
  return (
    <button
      data-testid="button-run"
      aria-pressed={input.run}
      aria-label="Toggle running"
      className={`btn absolute ${input.run ? "on" : ""}`}
      style={{
        right: safe("right"),
        bottom: safe("bottom"),
        width: 76,
        height: 76,
        zIndex: 5,
        fontSize: 13,
        touchAction: "none",
      }}
      onClick={() => {
        input.run = !input.run;
        tick((n) => n + 1);
      }}
      onPointerCancel={() => {
        input.run = false;
        tick((n) => n + 1);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {input.run ? "RUN ON" : "RUN"}
    </button>
  );
}

function OrbitZone({ allowLookUp = false }: { allowLookUp?: boolean }) {
  const id = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });
  const end = (e: React.PointerEvent) => {
    if (e.pointerId === id.current) {
      id.current = null;
      input.looking = false;
      input.lookGrace = 0.85;
    }
  };
  useEffect(() => {
    const clear = () => {
      id.current = null;
    };
    window.addEventListener("survivor-input-clear", clear);
    return () => window.removeEventListener("survivor-input-clear", clear);
  }, []);
  return (
    <div
      data-testid="orbit-zone"
      className="absolute"
      style={{
        right: 0,
        top: 0,
        bottom: 0,
        width: "62%",
        touchAction: "none",
        pointerEvents: "auto",
        zIndex: 1,
      }}
      onPointerDown={(e) => {
        if (id.current !== null) return;
        id.current = e.pointerId;
        input.looking = true;
        input.lookGrace = 0.85;
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== id.current) return;
        input.lookGrace = 0.85;
        input.yaw -= (e.clientX - last.current.x) * 0.007;
        input.pitch = Math.max(
          allowLookUp ? -0.25 : 0.12,
          Math.min(1.15, input.pitch + (e.clientY - last.current.y) * 0.005),
        );
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

const MW = 104,
  MH = 100;
function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const bg = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = MW;
    c.height = MH;
    const g = c.getContext("2d")!;
    const img = g.createImageData(MW, MH);
    for (let py = 0; py < MH; py++)
      for (let px = 0; px < MW; px++) {
        const x =
            BOUNDS.minX - 6 + (px / MW) * (BOUNDS.maxX - BOUNDS.minX + 12),
          z = BOUNDS.minZ + (py / MH) * (BOUNDS.maxZ - BOUNDS.minZ);
        const d = x - shorelineX(z),
          h = baseHeight(x, z);
        const col =
          h < 0
            ? h < -1.2
              ? [27, 100, 130]
              : [60, 170, 178]
            : d < 14
              ? [236, 208, 148]
              : h > 2.5
                ? [70, 100, 60]
                : [66, 130, 62];
        const o = (py * MW + px) * 4;
        img.data[o] = col[0]!;
        img.data[o + 1] = col[1]!;
        img.data[o + 2] = col[2]!;
        img.data[o + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    return c;
  }, []);
  useEffect(() => {
    const sx = (x: number) =>
      ((x - (BOUNDS.minX - 6)) / (BOUNDS.maxX - BOUNDS.minX + 12)) * MW;
    const sz = (z: number) =>
      ((z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ)) * MH;
    const draw = () => {
      const g = ref.current?.getContext("2d");
      if (!g) return;
      g.drawImage(bg, 0, 0);
      g.strokeStyle = "#c9a063";
      g.lineWidth = 2;
      g.beginPath();
      PATH.forEach((p, i) =>
        i ? g.lineTo(sx(p.x), sz(p.z)) : g.moveTo(sx(p.x), sz(p.z)),
      );
      g.stroke();
      const dot = (p: { x: number; z: number }, c: string, r = 3) => {
        g.fillStyle = c;
        g.beginPath();
        g.arc(sx(p.x), sz(p.z), r, 0, 7);
        g.fill();
      };
      dot(LANDMARKS.beach, "#fff", 2.5);
      dot(LANDMARKS.campfire, "#ff7a1c");
      dot(LANDMARKS.shelter, "#e8b84a", 4);
      dot(LANDMARKS.well, "#7fe0ff");
      const px = sx(dbg.x),
        pz = sz(dbg.z),
        vx = -Math.sin(input.yaw),
        vz = -Math.cos(input.yaw);
      g.fillStyle = "rgba(255,255,255,.28)";
      g.beginPath();
      g.moveTo(px, pz);
      g.arc(px, pz, 16, Math.atan2(vz, vx) - 0.5, Math.atan2(vz, vx) + 0.5);
      g.closePath();
      g.fill();
      g.fillStyle = "#e8512f";
      g.strokeStyle = "#fff";
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(px, pz, 3.5, 0, 7);
      g.fill();
      g.stroke();
    };
    draw();
    const t = setInterval(draw, 120);
    return () => clearInterval(t);
  }, [bg]);
  return (
    <canvas
      ref={ref}
      data-testid="minimap"
      width={MW}
      height={MH}
      className="chip"
      style={{ width: MW, height: MH, padding: 2 }}
    />
  );
}

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export function Hud({
  tribal = false,
  onMenu,
}: {
  tribal?: boolean;
  onMenu?: () => void;
}) {
  const [audio, setAudio] = useState(false);
  const inspection = useSyncExternalStore(
    tribalInteractions.subscribe,
    tribalInteractions.getSnapshot,
  );
  const blocked = tribal && !!inspection.open;
  const social = useSyncExternalStore(camp.subscribe, camp.getSnapshot);
  const [, tick] = useState(0);
  const [help, setHelp] = useState(false);
  const [dbgOpen, setDbgOpen] = useState(false);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);
  const bearing = ((((-input.yaw * 180) / Math.PI) % 360) + 360) % 360;
  return (
    <div className="hud absolute inset-0" style={{ pointerEvents: "none" }}>
      {!blocked && (tribal || !social.conversation) && (
        <OrbitZone allowLookUp={tribal} />
      )}
      <div
        className="absolute"
        style={{ left: safe("left"), top: safe("top"), zIndex: 4 }}
      >
        <div className="chip" style={{ padding: "4px 10px", lineHeight: 1.25 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ".12em",
              color: "#f6c35a",
            }}
          >
            SURVIVOR ISLAND
          </div>
          <div
            data-testid="text-location"
            style={{ fontSize: 13, fontWeight: 700 }}
          >
            {dbg.location}
          </div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>
            {DIRS[Math.round(bearing / 45) % 8]} {Math.round(bearing)}°
          </div>
          {dbgOpen && (
            <div
              data-testid="text-debug"
              style={{
                fontFamily: "var(--app-font-mono)",
                fontSize: 9.5,
                opacity: 0.85,
                marginTop: 2,
              }}
            >
              X {dbg.x.toFixed(1)} Y {dbg.y.toFixed(1)} Z {dbg.z.toFixed(1)} ·{" "}
              {dbg.fps} FPS
            </div>
          )}
        </div>
      </div>
      <div
        className="absolute flex flex-col items-end gap-1"
        style={{
          right: safe("right"),
          top: safe("top"),
          zIndex: 4,
          pointerEvents: "auto",
        }}
      >
        <div className="flex gap-1">
          {onMenu && (
            <button
              data-testid="button-menu"
              className="btn"
              style={{ padding: "3px 10px", fontSize: 11 }}
              onClick={onMenu}
            >
              MENU
            </button>
          )}
          {tribal && (
            <button
              data-testid="button-audio"
              className="btn"
              style={{ padding: "3px 9px", fontSize: 11 }}
              onClick={async () => {
                if (audio) {
                  tribalAudio.stop();
                  setAudio(false);
                } else setAudio(await tribalAudio.start());
              }}
            >
              SOUND {audio ? "ON" : "OFF"}
            </button>
          )}
          <button
            data-testid="button-reset"
            className="btn"
            style={{ padding: "3px 11px", fontSize: 11 }}
            onClick={() => {
              dbg.resetRequested = true;
            }}
          >
            RESET
          </button>
          <button
            data-testid="button-debug"
            className={`btn ${dbgOpen ? "on" : ""}`}
            style={{ width: 28, fontSize: 10 }}
            onClick={() => setDbgOpen((d) => !d)}
          >
            DB
          </button>
          <button
            data-testid="button-help"
            className={`btn ${help ? "on" : ""}`}
            style={{ width: 28, fontSize: 13 }}
            onClick={() => setHelp((h) => !h)}
          >
            ?
          </button>
        </div>
        {!tribal && !social.conversation && <Minimap />}
      </div>
      {help && (
        <div
          data-testid="panel-help"
          className="chip absolute"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            padding: "10px 16px",
            fontSize: 12,
            lineHeight: 1.45,
            maxWidth: 340,
            zIndex: 6,
            pointerEvents: "auto",
          }}
          onClick={() => setHelp(false)}
        >
          <b style={{ color: "#f6c35a" }}>How to explore</b>
          <div>
            Joystick or WASD to walk, tap RUN to latch sprint, or hold Shift.
            Release the joystick to stop sprinting.
          </div>
          <div>
            Drag the right side to orbit while walking or running. Movement
            direction is held for each continuous joystick gesture. Release and
            start a new gesture to use the new view.{" "}
            {tribal
              ? "Follow the torches to Council. Explore the jury gallery, private voting chamber and front voting entrance and the last-walk exit."
              : "Follow the trail between the beach, campfire, shelter and well."}
          </div>
          {!tribal && (
            <div>
              Walk close to a contestant and tap Talk (or E). Choose a response,
              then Leave. You can decline an approach with Not now.
            </div>
          )}
          <div style={{ opacity: 0.7, marginTop: 4 }}>Tap to close.</div>
        </div>
      )}
      <div
        className="rotate-hint chip absolute"
        style={{
          left: "50%",
          top: "40%",
          transform: "translateX(-50%)",
          padding: "6px 12px",
          fontSize: 12,
          zIndex: 6,
          animation: "bob 2s infinite",
        }}
      >
        Rotate to landscape for the best view
      </div>
      {!blocked && (tribal || !social.conversation) && (
        <div style={{ pointerEvents: "auto" }}>
          <Joystick />
          <RunButton />
        </div>
      )}
      {!tribal && <ConversationHud />}
    </div>
  );
}
