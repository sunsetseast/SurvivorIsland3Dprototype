import { useEffect, useState } from "react";
import { Joystick, RunButton, OrbitZone } from "../Hud";
import { dbg, clearInput } from "../state";
import { IslandMap } from "./IslandMap";
import { ZONES } from "./geography";
export function IslandHud({
  onMenu,
  low,
  setLow,
  overview,
  setOverview,
}: {
  onMenu: () => void;
  low: boolean;
  setLow: (v: boolean) => void;
  overview: boolean;
  setOverview: (v: boolean) => void;
}) {
  const [, tick] = useState(0),
    [help, setHelp] = useState(false),
    [travel, setTravel] = useState(false);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="island-hud">
      {!overview && <OrbitZone allowLookUp />}
      <div className="island-title">
        <span>RAILAY PENINSULA</span>
        <strong data-testid="island-location">
          {overview ? "The Andaman Coast" : dbg.location || "Railay West"}
        </strong>
      </div>
      <div className="island-toolbar">
        <button data-testid="island-menu" onClick={onMenu}>
          Menu
        </button>
        <button
          data-testid="island-overview"
          onClick={() => {
            clearInput();
            setOverview(!overview);
          }}
        >
          {overview ? "Walk" : "Overview"}
        </button>
        <button data-testid="island-travel" onClick={() => setTravel(!travel)}>
          Explore ▾
        </button>
        <button data-testid="island-quality" onClick={() => setLow(!low)}>
          {low ? "Quality: Low" : "Quality: High"}
        </button>
        <button
          data-testid="island-reset"
          onClick={() => {
            clearInput();
            dbg.resetRequested = true;
            setOverview(false);
          }}
        >
          Reset
        </button>
        <button aria-label="Help exploring" onClick={() => setHelp(!help)}>
          ?
        </button>
      </div>
      <IslandMap />
      {travel && (
        <div className="island-travel">
          {ZONES.map((z) => (
            <button
              key={z.id}
              data-testid={`travel-${z.id}`}
              onClick={() => {
                clearInput();
                dbg.teleportRequested = { ...z.spawn };
                setOverview(false);
                setTravel(false);
              }}
            >
              {z.name}
            </button>
          ))}
        </div>
      )}
      {help && (
        <div className="island-help" onClick={() => setHelp(false)}>
          <strong>Explore the peninsula</strong>
          <p>
            Walk with the left thumb. Drag on the right to look around; tap Run
            to sprint. On a keyboard, use WASD and Shift.
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
      {!overview && (
        <>
          <Joystick />
          <RunButton />
        </>
      )}
      <div className="island-credit">
        Coastline © OpenStreetMap contributors · ODbL
      </div>
    </div>
  );
}
