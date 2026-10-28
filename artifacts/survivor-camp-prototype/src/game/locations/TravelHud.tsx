import { useEffect, useState, useSyncExternalStore } from "react";
import { camp } from "../CampRuntime";
import { TouchButton } from "../Hud";
import { CONNECTIONS, LOCATIONS, localToGeographic } from "./registry";
import { worldTravel } from "./travel";
export const developerTravel =
  new URLSearchParams(location.search).get("devTravel") === "1";
export function TravelHud({ blocked = false }: { blocked?: boolean }) {
  const social = useSyncExternalStore(camp.subscribe, camp.getSnapshot);
  const s = useSyncExternalStore(
      worldTravel.subscribe,
      worldTravel.getSnapshot,
    ),
    [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 150);
    return () => clearInterval(id);
  }, []);
  const session = worldTravel.session,
    p = session.poses[session.locationId],
    route = Object.values(CONNECTIONS).find(
      (c) => c.source === session.locationId,
    ),
    near =
      route &&
      p &&
      Math.hypot(p.x - route.exit.x, p.z - route.exit.z) <= route.radius;
  if (s.phase === "menu") return null;
  if (s.phase !== "ready" && s.phase !== "fading")
    return (
      <div
        className="world-transition"
        role="status"
        data-testid="world-transition"
      >
        <span>SURVIVOR ISLAND</span>
        <h2>{s.error ? "The trail is waiting" : s.message}</h2>
        <p>{s.error || "Moving between island locations"}</p>
        {s.error && (
          <TouchButton
            data-testid="travel-retry"
            onActivate={() => worldTravel.retry()}
          >
            Try again
          </TouchButton>
        )}
        <TouchButton
          data-testid="travel-cancel"
          onActivate={() => worldTravel.returnSafely()}
        >
          Return safely
        </TouchButton>
      </div>
    );
  if (s.phase === "fading")
    return (
      <div
        className="world-transition world-fade"
        role="status"
        data-testid="world-transition"
      >
        <span>SURVIVOR ISLAND</span>
        <h2>{s.message}</h2>
      </div>
    );
  const map = p && localToGeographic(session.locationId, p);
  return (
    <>
      <div className="world-location" data-testid="world-location">
        <strong>{LOCATIONS[session.locationId].name}</strong>
        {developerTravel && (
          <small>
            {session.locationId} · {session.instance.id}
            {developerTravel && map
              ? ` · map ${map.x.toFixed(0)}, ${map.z.toFixed(0)}`
              : ""}
          </small>
        )}
      </div>
      {route &&
        !blocked &&
        !(
          session.locationId === "camp_tribe_a" &&
          (social.conversation ||
            social.nearbyId !== null ||
            social.incomingId !== null)
        ) && (
          <section className="world-route" aria-label="Island journey">
            {near ? (
              <>
                <strong>
                  {route.permission === "return"
                    ? "Trail back to Tonsai Camp"
                    : "Jungle trail departure"}
                </strong>
                <p>
                  {worldTravel.permission(route.id) || "Your route is open."}
                </p>
                <TouchButton
                  data-testid="travel-connection"
                  disabled={!!worldTravel.permission(route.id)}
                  onActivate={() => worldTravel.travel(route.id)}
                >
                  {route.permission === "return"
                    ? "Return to camp"
                    : "Begin journey"}
                </TouchButton>
              </>
            ) : (
              <small>
                {route.permission === "return"
                  ? "Return to the wooden camp sign to head home."
                  : "Jungle trail · follow the camp path south to its edge."}
              </small>
            )}
            {session.locationId === "camp_tribe_a" && developerTravel && (
              <TouchButton
                data-testid="grant-journey"
                onActivate={() => worldTravel.grantJourney()}
              >
                Development · authorize test journey
              </TouchButton>
            )}
          </section>
        )}
    </>
  );
}
