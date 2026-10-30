# Regression verification

The atmosphere change retains the existing simulation, movement, navigation bake, 12 trail definitions, spring/cave envelopes, 39 hiding IDs, save/provider contracts, location registry and travel permissions. Neither the original SurvivorIsland2025 repository nor its files were modified.

| Check                        | Evidence / result                                                                                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit suite                   | 106 tests; all pass. Covers authored asset hashes, shelter clearance, movement/navigation, all hiding surfaces/approaches, state/social contracts and three new atmosphere/provenance checks.                                                                                                                 |
| TypeScript                   | Application `tsc -p tsconfig.json --noEmit` passes.                                                                                                                                                                                                                                                           |
| Normal production bundle     | Uninstrumented Vite build passes. Existing large-chunk warning remains.                                                                                                                                                                                                                                       |
| Atmosphere integration       | [7 production WebGL check groups](evidence/integration/report.json): sun/light/water agreement in all three presets, texture dimensions and animation, filtered foliage, sky resource disposal, exposure restoration and playable missing-cloud fallback.                                                     |
| Connected world              | [15 browser checks](evidence/connected-world/browser-report.json): permissions, real exit interaction, four round trips, one detailed scene at a time, persistent social/NPC owners, conversations, cleanup, interrupted travel/recovery and Tribal Council practice ballot.                                  |
| Mobile controls              | [16 check groups](evidence/mobile-controls/report.json): trusted Chromium touch input at 932 × 430, joystick/Run/look together, latch release, cancel/reset/focus loss, scene exit/reentry, camera orbit, Tribal Council and Railay controls.                                                                 |
| Continuous walking routes    | [Route report](evidence/routes/report.json) and [checkpoint](evidence/routes/route-checkpoint.json): camp, shelter, spring/alternate return, limestone, cave and all 39 hiding approaches. The final run passes **50 continuous route legs** and observes a real NPC advancing **114.1 m** toward the spring. |
| Visual production comparison | [48 genuine captures](GALLERY.md), twelve poses in each profile, before/after. Native camera X/Y/Z match exactly; sky/overview inspection cameras are declared separately.                                                                                                                                    |

## Route fixture correction

The first long expedition successfully completed **48 player route legs, including all 39 hiding approaches**, then failed its NPC chore setup. The fixture assumed an NPC would still be over 70 m from the spring after many simulated minutes of player travel. That is not a stable condition in the living camp. The preserved [first failure](evidence/routes/initial-failure.json) records it.

The fixture now requests a normal rest trip to the campfire and waits for the selected NPC to physically arrive before requesting water collection. It uses the public intent API and real NPC movement solver; it does not set actor positions or fabricate routes. It records starting/arrival coordinates, travel distance and simulated preparation time. Production NPC behavior is unchanged. The entire expedition is rerun with this fixture, rather than declaring the original failure a pass.

## Reproduce

From the app directory after installing repository dependencies and Chromium:

```bash
node --import tsx --test tests/*.test.mjs
node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
PORT=5173 BASE_PATH=/ node node_modules/vite/bin/vite.js build
node scripts/atmosphere-qa.mjs
node scripts/atmosphere-integration.mjs
WORLD_EVIDENCE=../../docs/tonsai-atmosphere/evidence/connected-world node scripts/connected-world-qa.mjs
SPRINT_EVIDENCE=../../docs/tonsai-atmosphere/evidence/mobile-controls node scripts/mobile-sprint-qa.mjs
EXPEDITION_ONLY=1 REFINEMENT_APPROACHES=1 EXPANSION_EVIDENCE=../../docs/tonsai-atmosphere/evidence/routes node scripts/expansion-qa.mjs
```

Set `CAMP_CHROMIUM` for a browser outside Playwright's install. These local runs use Chrome headless shell 156 / ANGLE SwiftShader. The read-only GitHub workflow runs the new production visual/integration suite and uploads evidence; its hosted status is separate from local results. None of the browser tests certify physical iPhone Safari FPS, thermals or system touch behavior. The 60 Hz manual simulation isolates controller assertions from host raster cost.
