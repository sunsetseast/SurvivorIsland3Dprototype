# Gameplay and technical validation

The final source passes **103/103 Node tests**, TypeScript checking and a minified production build. [Unedited test stdout](evidence/test-results.txt) is retained. The new tests inspect the packed GLBs independently, verify finite geometry and complete PNG payloads, compare SHA256 manifests, enforce separate low exports, ray-check standing shelter clearance/slat support and protect all trail/hiding approach clearances.

## Actual browser checks

| Run | Result | Evidence |
| --- | --- | --- |
| Final exploration / approaches | PASS, 50 movement route legs, every existing hiding approach, shelter entry/exit, spring, southern cliff, cave and return; NPC water trip and camp anchors reachable | [report](evidence/gameplay/report.json) |
| Final production visual run | PASS, 38 fixed native-camera poses across low/high, 7 eye-height diagnostics, layout overview, no captured JS/shader errors | [report](evidence/after/report.json), [gallery](GALLERY.md) |
| Connected world | PASS, 15 checks: four camp/trail round trips, paused persistent camp state, repeated conversation, destination recovery, scene/resource disposal, Tribal Council and practice ballot | [report](evidence/journeys/browser-report.json) |
| Mobile controls | PASS, 16 asserted checks: trusted multitouch, joystick + sprint, release/restart, camera, cleanup and transitions | [report](evidence/multitouch/report.json) |

The retained exploration run was completed after the last vegetation-placement/camera-clearance change. During continuation, connected-world and multitouch checks were refreshed against the reconstructed scene and shorter detail ranges. The connected-world run preceded the final lashings-only export correction; multitouch and the final unit/asset/build checks include that correction. Trail, movement, navigation, candidate, interaction, save and social-system source did not change during continuation. No physical iPhone test is claimed.

The browser exploration uses trusted input and the actual movement solver, not only geometry assertions. Fixed 60 Hz simulation steps isolate gameplay from slow host software rasterization; genuine WebGL captures show the rendered result. This verifies behavior, not real-time device speed. The production screenshot harness uses a test-only module bridge that is not part of a normal build.

## Preserved contracts

The territory polygon, all 12 trail IDs/branches, spring position, camp activity anchors, minimap geography, movement rules, save schema, journey architecture and social simulation remain in place. All 39 candidate IDs are retained; the modified headland's surface anchors were independently ray-validated and the existing navigation manifest rebaked. Soft foliage introduces no player/NPC collision walls. Juvenile wood participates in the existing camera-boom obstruction handling. Shelter support placement, deck height and access ramp match existing physics.

No immunity-idol discovery, multiplayer, progression change, character redesign, new tribe camp or world boundary expansion is included. SurvivorIsland2025 was read only and not modified.

## Reproduce

From `artifacts/survivor-camp-prototype`:

```bash
pnpm typecheck
pnpm test
ART_DIAGNOSTICS=1 pnpm qa:reconstruction
REFINEMENT_APPROACHES=1 EXPEDITION_ONLY=1 EXPANSION_EVIDENCE=../../docs/tonsai-reconstruction/evidence/gameplay pnpm qa:expansion
WORLD_EVIDENCE=../../docs/tonsai-reconstruction/evidence/journeys pnpm qa:connected-world
SPRINT_EVIDENCE=../../docs/tonsai-reconstruction/evidence/multitouch pnpm qa:mobile-sprint
```

The added CI workflow runs TypeScript, tests and the real WebGL gallery. Local checks passed; GitHub-hosted CI is reported separately by the PR and is not pre-certified here.
