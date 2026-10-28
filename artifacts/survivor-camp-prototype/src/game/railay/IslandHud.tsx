import { useEffect, useState } from "react";
import { Joystick, RunButton, OrbitZone, TouchButton } from "../Hud";
import { dbg, clearInput, input } from "../state";
import { IslandMap } from "./IslandMap";
import { ZONES } from "./geography";
export function IslandHud({
  onMenu,
  low,
  setLow,
  overview,
  setOverview,
  onBlockedChange,
}: {
  onMenu: () => void;
  low: boolean;
  setLow: (v: boolean) => void;
  overview: boolean;
  setOverview: (v: boolean) => void;
  onBlockedChange: (v: boolean) => void;
}) {
  const [, tick] = useState(0),
    [help, setHelp] = useState(false),
    [travel, setTravel] = useState(false),
    [mapOpen, setMapOpen] = useState(false);
  const blocked = help || mapOpen;
  useEffect(() => {
    onBlockedChange(blocked);
    if (blocked) clearInput();
  }, [blocked, onBlockedChange]);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="island-hud">
      {!overview && !blocked && <OrbitZone allowLookUp />}
      <div className="island-title">
        <span>RAILAY PENINSULA</span>
        <strong data-testid="island-location">
          {overview ? "The Andaman Coast" : dbg.location || "Railay West"}
        </strong>
      </div>
      <div className="island-toolbar">
        <TouchButton data-testid="island-menu" onActivate={onMenu}>
          Menu
        </TouchButton>
        <TouchButton
          data-testid="island-overview"
          onActivate={() => {
            clearInput();
            setOverview(!overview);
          }}
        >
          {overview ? "Walk" : "Overview"}
        </TouchButton>
        <TouchButton
          data-testid="island-travel"
          onActivate={() => setTravel(!travel)}
        >
          Explore ▾
        </TouchButton>
        <TouchButton
          data-testid="island-quality"
          onActivate={() => setLow(!low)}
        >
          {low ? "Quality: Low" : "Quality: High"}
        </TouchButton>
        <TouchButton
          data-testid="island-reset"
          onActivate={() => {
            clearInput();
            dbg.resetRequested = true;
            setOverview(false);
          }}
        >
          Reset
        </TouchButton>
        <TouchButton
          aria-label="Help exploring"
          onActivate={() => {
            clearInput();
            setHelp(!help);
          }}
        >
          ?
        </TouchButton>
      </div>
      <IslandMap onOpenChange={setMapOpen} />
      {travel && (
        <div className="island-travel">
          <TouchButton
            data-testid="travel-tonsai-showcase"
            onActivate={() => {
              clearInput();
              dbg.teleportRequested = { x: -670, z: -820 };
              input.yaw = -2.075;
              input.pitch = -0.1;
              setOverview(false);
              setTravel(false);
            }}
          >
            Tonsai · Limestone Cove
          </TouchButton>
          {ZONES.map((z) => (
            <TouchButton
              key={z.id}
              data-testid={`travel-${z.id}`}
              onActivate={() => {
                clearInput();
                dbg.teleportRequested = { ...z.spawn };
                setOverview(false);
                setTravel(false);
              }}
            >
              {z.name}
            </TouchButton>
          ))}
        </div>
      )}
      {help && (
        <div className="island-help" onClick={() => setHelp(false)}>
          <strong>Explore the peninsula</strong>
          <p>
            Walk with the left thumb. Drag on the right to look around; tap Run
            to toggle sprint. Release the stick to stop; Run stays on until
            tapped again. On a keyboard, use WASD and hold Shift.
          </p>
          <p>
            Follow jungle corridors between beaches. Sheer cliffs and deep water
            stop movement. Explore lets you start at another region; Reset
            returns to Railay West.
          </p>
          <p>
            The lagoon basin is visible from above. Its steep descent awaits
            climbing mechanics. Tap to close.
          </p>
        </div>
      )}
      {!overview && !blocked && (
        <div style={{ pointerEvents: "auto" }}>
          <Joystick />
          <RunButton />
        </div>
      )}
      <div className="island-credit">
        Coastline © OpenStreetMap contributors · ODbL
      </div>
    </div>
  );
}
