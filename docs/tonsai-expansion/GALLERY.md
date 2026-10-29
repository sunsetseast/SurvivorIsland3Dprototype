# Actual WebGL gameplay evidence

All images below were captured from the running Three.js/R3F game in Chromium/ANGLE SwiftShader at 932 × 430, DPR 1. They are not Blender renders or generated concept art. Images 01–24 use the native third-person Player camera; individual showcase poses are staged at reachable world positions. The continuous expedition report separately validates travel between destinations with real Player input and collision. The NPC is moved by the existing physical runtime, not by assigning an actor position.

## Camp and southern limestone

Main camp, high profile:

![Main camp](evidence/high-01-main-camp.jpg)

Fire, shelter and the existing social space:

![Fire and shelter](evidence/high-02-fire-shelter.jpg)

Southern limestone viewed from playable beach:

![Southern headland from the beach](evidence/high-03-beach-southern-limestone.jpg)

Player at the actual cliff base, followed by the accessible undercut:

![Standing at the cliff base](evidence/high-04-southern-cliff-base.jpg)
![Accessible limestone roof](evidence/high-05-accessible-overhang.jpg)

The southern forest approach:

![Southern limestone trail](evidence/high-06-limestone-jungle-trail.jpg)

## Inland progression and spring

Interior forest, branching path and freshwater approach:

![Interior jungle](evidence/high-07-interior-jungle.jpg)
![Branching trails](evidence/high-11-branching-trails.jpg)
![Freshwater trail](evidence/high-08-freshwater-trail.jpg)

The remote spring and fern clearing:

![Remote freshwater spring](evidence/high-09-remote-spring.jpg)
![Fern bowl clearing](evidence/high-10-fern-clearing.jpg)

## Signature landmarks and secluded spaces

![Ancient buttress fig](evidence/high-13-ancient-fig.jpg)
![Fallen giant and exposed roots](evidence/high-14-fallen-giant.jpg)
![Actual southern cave interior](evidence/high-15-cave-interior.jpg)
![Walkable moss gate passages](evidence/high-16-moss-gates.jpg)
![Intertwined root crown](evidence/high-17-root-crown.jpg)
![Hollow storm stump](evidence/high-18-hollow-stump.jpg)
![Leaning tamarind](evidence/high-19-leaning-tree.jpg)
![Strangler fig around a boulder](evidence/high-20-strangler-stone.jpg)
![Bowed root bridge](evidence/high-21-root-bridge.jpg)
![Secluded stone alcove](evidence/high-12-secluded-alcove.jpg)

These landmarks support 39 future hiding candidates, without actual idols, identical containers or visible search markers. See the [grounded candidate registry](HIDING_REGISTRY.md).

## Movement, map and mobile profiles

Running is active in this native Player-camera capture:

![Player running in the jungle](evidence/high-22-running.jpg)

The map draws the same coastline and trail data as the world:

![Expanded interactive camp map](evidence/high-24-camp-map.jpg)

Low-quality mobile-sized rendering of camp and inland forest:

![Low profile camp](evidence/low-01-main-camp.jpg)
![Low profile jungle](evidence/low-07-interior-jungle.jpg)

The expedition physically walks into the cave and follows a water-collecting NPC on an expanded trail:

![Cave reached through Player movement](evidence/route/high-25-walked-into-cave.jpg)
![NPC physically navigating the expanded territory](evidence/route/high-26-npc-expanded-trail.jpg)

The [route report](evidence/route/report.json) records walking/running legs, actual endpoints and path waypoint counts. Its fixed-tick simulation runs the real Player, NPCs and collision between renders. NPC-only waiting ticks run the same CampRuntime movement solver, without changing an NPC's coordinates or route.

## Authorized journey and return

![Departure](evidence/connected-world/02-departure-trail.jpg)
![Return connection](evidence/connected-world/07-return-connection.jpg)
![Restored camp instance](evidence/connected-world/09-restored-camp.jpg)

The [connected-world report](evidence/connected-world/browser-report.json) includes four round trips, authorization refusal, source cleanup, preserved NPC/social state, conversation and Tribal Council regression checks.

## Before and after

Same default camp position, yaw, pitch, resolution and quality profile:

| Merged PR #15 | Expanded camp |
|---|---|
| ![PR15 default](../flagship-camp/evidence/after/high-01-main-camp.jpg) | ![Expanded default](evidence/high-01-main-camp.jpg) |

The camp clearing is retained. The larger change lies beyond its former boundary: the southern approach, cave, forest loops and remote spring shown above. Default-view submission measurements use matching camera conditions; images taken at new destinations are not presented as matching-camera performance comparisons.

## Elevated layout diagnostic — not a gameplay camera

![Elevated live WebGL layout diagnostic](evidence/diagnostic-27-expanded-overview.jpg)

This additional capture uses an elevated camera, disables distance fog for layout inspection, and updates the sky and vegetation culling for that camera. It is separate from the normal third-person views and is not used for the performance comparison. [Capture source](../../artifacts/survivor-camp-prototype/scripts/expansion-overview.mjs).

No physical iPhone Safari performance is claimed by these desktop browser captures.
