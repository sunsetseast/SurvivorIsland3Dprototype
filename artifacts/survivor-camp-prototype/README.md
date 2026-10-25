# Survivor Island — living 3D camp

This is the existing 3D camp with Sandra, Parvati, Russell and Boston Rob,
autonomous activities and physically grounded conversations. Production identity,
personality, presence and owner-scoped memory modules are reused through pinned
source snapshots. Camp decisions and limited dialogue are an explicit demo provider,
not the complete Survivor season/conversation engine. It does not read or write
original saves, access GitHub at runtime, modify Survivor Island 25, or publish itself.

## Play

Open this artifact's Replit preview in Safari and rotate the iPhone to landscape.
Drag the left joystick to walk, hold RUN with another finger, and drag the right
side to turn the camera. Desktop: WASD/arrows, Shift, mouse drag on the right.
Walk close to a stationary contestant and tap Talk (desktop: E). Choose a
response, then Leave (Escape). NPCs sometimes walk over to ask for a word; Talk
or Not now accepts or declines. Reset returns the player to the clearing.
The help button explains controls.
Follow the dirt path north to the shelter ramp, west to the beach, or south
through the jungle loop to the western well. The contoured shoreline and
terrain edges are movement limits; they are not original-game geography.

## Reference status

Read-only public references accessed during development:
- https://github.com/sunsetseast/SurvivorIsland2025/pull/362
- Branch `experiment/island-3d-map-prototype`, `experiments/island-3d/layout.js`
- Branch `docs/3d-island-map-navigation-audit.md`
- Branch `Assets/map.png`, directly downloaded to a temporary file and viewed.

The map visually supports a western beach, northern/northeastern shelter,
campfire between them, and a western inland well. It has no scale or compass.
The PR itself describes its coordinates as unapproved guesses. This prototype
uses its four landmark anchors, not surveyed geography. Distances, elevations,
curved shoreline, vegetation, shelter ramp, and the simplified winding route
are explicitly provisional. Full scene-background reconciliation and the
original conditional fork topology have NOT been reproduced or approved.
No requested map reference was missing; no original art is shipped in the game.
All runtime scenery is procedural original geometry.

## Structure and integration boundary

`world.ts` is the pure deterministic terrain/navigation/collision model.
`Scene.tsx` assembles the environment. `Terrain`, `Flora`, `Shelter`, and `Camp`
provide the art; `geo.ts`, `flora.ts`, and `props.ts` build original meshes.
`groundTexture.ts` bakes the ground colour/contact shading on a local canvas.
`Player.tsx` owns terrain-following locomotion and obstruction-aware camera;
`Survivor.tsx` owns the articulated character and distance-driven gait.
`state.ts` is transient input and debug state; `Hud.tsx` handles multitouch.
`CampRuntime.ts` owns physical NPC travel, spatial witnesses, groups, interruption
and approach lifecycle. `navigation.ts` builds collision-validated routes from the
actual world; `Contestants.tsx`, `contestantArt.ts` and `characterMotion.ts` own
original character meshes and articulated displacement-driven animation.
`simulation/contracts.ts` is the integration port. `DemoProvider.ts` owns temporary
activity selection and limited authored dialogue, reusing production personality
and SocialMemory rather than a competing relationship/alliance engine.
`ConversationHud.tsx` supplies touch/keyboard dialogue over the running 3D view.
There are still no challenges, council, multiplayer, auth or save persistence.
See [architecture](../../docs/living-camp/ARCHITECTURE.md) and the
[certification report](../../docs/living-camp/CERTIFICATION.md).

## Verification

- `pnpm --filter @workspace/survivor-camp-prototype test` runs deterministic
  navigation, physical presence, privacy, approaches, autonomous behavior and foot IK tests.
- `pnpm --filter @workspace/survivor-camp-prototype qa:living-camp` launches local
  Vite and Playwright, drives the actual game, captures WebGL evidence and records
  renderer statistics. Install a Playwright Chromium browser first. Optional
  `CAMP_CHROMIUM` selects a compatible Chrome/headless-shell executable.
  `CAMP_RESTRICTED_HOST=1` works around hosts that disallow network-interface enumeration.
  This uses accelerated fixed game frames between captures; it is not device FPS.
- Committed captures and raw measurements: `docs/living-camp/evidence/`.

- `pnpm --filter @workspace/survivor-camp-prototype run typecheck`
- `node artifacts/survivor-camp-prototype/scripts/world-check.mjs` checks
  solid collision substeps, shoreline containment, ramp entry/exit, raised deck
  side blocking, and the entire landmark path centreline.
- `scripts/walkthrough.mjs` uses Chrome DevTools Protocol and Node's built-in WebSocket.
  Start Chromium with headless software WebGL and remote debugging port 9222,
  then run `node artifacts/survivor-camp-prototype/scripts/walkthrough.mjs` from root.
  Tests spawn, keyboard walk/run, camera follow, concurrent three-finger touch
  movement/run/orbit, input release, reset, viewport hit targets, shelter ramp
  ascent/descent and actual game-frame navigation to shelter, beach, jungle,
  and well. Gameplay frames are accelerated with GPU draws disabled between
  stops; the real movement/camera/animation code runs, not teleportation.
  Touch events are separately delivered through the browser.
  Captures and JSON results go in ignored `generated-artifacts/camp-overhaul`.
- Browser render verified at 844×390 with software WebGL; portrait checked at
  390×844. The default screenshot runner cannot create a WebGL context.
- No actual iPhone hardware or Safari/WebKit run was available. Safari browser
  chrome/safe areas, sustained device FPS, thermal behavior, and touch feel need
  real-device confirmation. Software-renderer FPS is not an iPhone benchmark.

Rendering uses instanced foliage/rocks, distance/frustum-limited undergrowth,
merged static props, one directional 1024 shadow map, capped 1.5 pixel ratio,
no postprocessing, and no external runtime assets.

## Asset provenance

All scenery, the survivor, signs, and textures are authored procedurally in this
prototype. No Outlaster/Roblox models, downloaded asset packs, original-game art,
remote models, or external texture downloads are used. Third-party runtime
libraries (React, Three.js, React Three Fiber and Drei) retain their own package
licenses; this does not assign a new license to the project's original art/code.
