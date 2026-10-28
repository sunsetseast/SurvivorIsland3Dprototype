# Connected Survivor world — implementation report

Base: `main` at `8ef774f` (merged mobile-controls PR #13). This change is for `sunsetseast/SurvivorIsland3Dprototype` only. The original `SurvivorIsland2025` repository was treated as read only. Nothing is merged or deployed.

## Implemented behavior

Camp → authorized Tonsai journey → Camp is playable. The camp boundary uses the existing southern jungle footpath and a small wooden waymarker. Without an invitation, the departure action is disabled and the transition authority rejects the request. Movement remains usable. A development invitation is available only with `?devTravel=1`; the normal menu has no unrestricted Railay scene selector. Tribal Council remains an explicit rehearsal adapter.

A 280 ms fade locks controls, removes the source tree, drains its resource cleanup, loads the destination module, validates its spawn, and waits for scene readiness. The UI explains loading and offers a safe return. Transition tokens reject stale completions, repeated requests cannot mount competing scenes, and failed loads support retry or return. A real aborted destination module request was recovered in Chromium, in addition to injected interruption/retry scenarios.

The renderer is reused across connected travel, with one detailed location tree mounted at a time. Camera projection, shadows, pixel ratio, overview state and modal locks are reset or configured per location. PR #13’s shared sprint authority and pointer-ownership controls are retained; travel calls the existing input-clear path, including keyboard releases and pointer-capture cleanup.

## Source of truth and geography

[`registry.ts`](../../artifacts/survivor-camp-prototype/src/game/locations/registry.ts) defines location identity, category, scene adapter, geographic anchor, local transform, named poses, connections, quality, tribe identity, instance scope and optional restrictions. The existing OSM-derived projection remains unchanged: metres, +X east, +Z south. No coastline, beach, cliff or terrain data was moved or regenerated.

| Stable location | Geographic association | Scene status | Instance scope |
| --- | --- | --- | --- |
| `camp_tribe_a` | Tonsai, 98.83375° E / 8.01755° N | Existing Camp | Tribe: Tonsai |
| `camp_tribe_b` | Existing south-cove anchor, 98.839° E / 8.0064° N | Metadata only | Tribe: South |
| `camp_tribe_c` | Railay East mangrove shore, 98.84105° E / 8.01015° N | Metadata only | Tribe: East |
| `railay_trails` | Existing peninsula and Tonsai lowland trail | Existing Railay | Journey |
| `challenge_main` | Existing West Beach challenge anchor | Metadata only | Event |
| `tribal_council` | Existing council-access anchor | Existing sanctuary adapter | Event |
| `journey_destination_1` | Existing northern journey anchor | Metadata only | Journey |

The compact Camp is an artistic local environment, associated with a geographic anchor; its local terrain is not a literal cutout of the peninsula. Its transform rotates local south into geographic east. The camp departure `(-6, 26)` maps exactly to the Railay arrival `(-417.967, -728.328)`. The camp’s initial spawn maps to the established Tonsai spawn. The return pose `(-1, 22)` lies on the existing camp path and faces inward along it. Railay uses geographic coordinates directly. Tests check transform inversion, matching connection endpoints, actual ground height, body clearance, bounds/water walkability and camera terrain clearance. The existing Player additionally checks the rendered camera boom against obstacles and terrain.

Camps B/C and the challenge arena have no renderer, no duplicate camp, no empty full-size scene, and no active assets. Activating them requires authored scenes, safe local poses and permission/event adapters. Expanded Railay map labels use the same registry.

## State and lifecycle ownership

[`travel.ts`](../../artifacts/survivor-camp-prototype/src/game/locations/travel.ts) owns the local session: participant/tribe identity, current location and instance, local poses, invitation and original return instance. Its version-1 defaults start older prototype sessions at Camp A; there was no disk-save format to migrate. This is in-memory session persistence across scene changes and the menu, not a new durable season save. Reloading the browser still starts a new prototype session.

The existing `CampRuntime` and provider retain their NPCs, routes, groups, physical receipts, social-memory owner and activity progress. They are never reconstructed by a transition. The local camp simulation intentionally **pauses while away** and resumes on return. Tests check exact object ownership and paused time, then verify progress and dialogue after multiple journeys. No inventory, advantages, relationships or season engine was invented to populate an interface.

[`SceneLifecycle.tsx`](../../artifacts/survivor-camp-prototype/src/game/locations/SceneLifecycle.tsx) observes scene-owned geometry, materials, textures, shader texture uniforms and shadow render targets. It records disposal events and finishes resources missed by ordinary R3F disposal, especially primitive assets and material maps. Camp terrain/ocean/sky textures now also have explicit owners. Existing Railay loader cancellation/disposal hooks remain intact. Source cleanup drains before destination mounting; renderer render lists are released. Explicit shared resources can opt out of the ownership sweep with `userData.shared`; no scene tree is retained invisibly.

Native JavaScript modules and browser HTTP caches remain cached. The baked terrain module can remain in CPU memory after first import; its temporary sampled arrays are released on Railay unmount. This is not a claim that JavaScript module caches or all browser/GPU allocations disappear. Characters currently use procedural rigs, so no common character model downloads are added.

## Verification and evidence

- 84 unit tests pass, including five new architecture tests covering geography/spawns, permissions/proximity, original-instance return, conflicting transitions, source-pose isolation during fade, rejection/retry/cancellation and stale completions.
- 15 connected-world browser checks pass: four round trips, unauthorized refusal, trusted movement and concurrent joystick/camera/Run input, source removal, state preservation, constant Camp listener counts, overview reset, interruption recovery, Camp conversation, sanctuary exploration, practice-ballot deposition, and an actual aborted module request.
- All 16 existing PR #13 Chromium mobile-control checks pass, including eight-direction speed normalization, third-touch Run, capture cancellation, map/reset/blur, live RAF movement, Camp, Tribal Council and clean reentry.
- The legacy Tonsai visual capture passes. Its brittle “two textures must be exactly 1024 px wide” assertion was replaced with `assetReady`, set only after both real albedo and normal texture callbacks complete. Scene readiness uses that same meaningful requirement. Geometry readiness and genuine texture-loading requirements are retained. Existing environment QA entry URLs now explicitly opt into the development explorer.
- TypeScript and the production build pass. Existing large-chunk warnings remain. A read-only GitHub Actions workflow runs the new journey harness and uploads evidence.

See the [ordered gameplay screenshots](evidence/README.md), [browser report](evidence/browser-report.json), [mobile report](evidence/mobile-regression/report.json), [legacy report](evidence/legacy-tonsai/webgl-report.json), [unit output](evidence/unit-tests.txt) and [build output](evidence/build.txt). The legacy harness retains an old static renderer label; the actual binary used for these runs is Chromium **153.0.8010.0**, as recorded by the connected-world/mobile harnesses.

## Performance findings

All measurements are actual host Chromium/ANGLE SwiftShader results at 932×430, DPR 1 and low quality. They are not iPhone Safari FPS, physical-device memory or GPU byte measurements. The journey harness advances real movement/animation at 60 Hz between real WebGL captures; its wall times include host rendering, transform/asset work and readiness polling.

Comparable default poses, same menu-entry harness and 2.5-second settling window:

| Sample | Before calls / triangles / geometry / textures | After calls / triangles / geometry / textures | Before / after entry + settle |
| --- | --- | --- | --- |
| Initial Camp | 219 / 325,419 / 103 / 8 | 219 / 325,419 / 103 / 8 | 5.731 / 5.944 s |
| Railay West default | 113 / 264,256 / 58 / 7 | 113 / 264,256 / 58 / 7 | 5.885 / 6.320 s |
| Camp menu reentry | 219 / 325,419 / 103 / 8 | 219 / 325,419 / 103 / 8 | 2.562 / 2.525 s |

These data establish comparable rendering cost, not a loading-speed improvement. They include a fixed settling window and are not precise load-duration benchmarks. The new transition deliberately adds a fade and cleanup drain. See [baseline](evidence/baseline.json) and [equivalent after](evidence/after-equivalent.json).

Actual connected journey request-to-ready samples and repeated resource results are summarized in [performance findings](PERFORMANCE.md). Unlike the default-pose comparison, journey samples use the Tonsai entrance and camp return path; their culling/triangle counts must not be compared to Railay West as a visual optimization claim.

## Limits and next steps

Known environment-art problems remain: unnatural limestone shapes, black terrain lines/seams, uniformly brown ground, and unconvincing vegetation. This PR adds only waymarkers required for travel. It does not reconstruct the camps or overhaul Railay art. The occasional journey still loads the existing full Railay environment. Its cost remains a priority for physical iPhone profiling.

There is no networking. **Client invitation checks are gameplay restrictions, not secure multiplayer access control.** Location, instance, participant and permission are distinct contracts, but the current authority and simulation are local. Future work should:

1. Store CampRuntime/provider state by stable server-owned instance, with independent tribe membership and NPC simulation lifetimes.
2. Validate travel on the authoritative server against participant, source instance, event permission, destination and expiry; atomically transfer membership and return identity, with idempotent request IDs.
3. Replace local pose ownership with acknowledged server snapshots and reconnect/save migration. Other participants keep occupying their own instances while this viewer unloads a scene.
4. Add event-scoped challenge/council instances and authorized visits that enter an existing tribe instance, rather than copying its world state.
5. Author Camps A/B/C independently and profile sustained Safari performance, peak memory and touch ergonomics on physical iPhone hardware before setting production budgets.
