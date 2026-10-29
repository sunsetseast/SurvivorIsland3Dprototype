# Tonsai refinement authoring

From `artifacts/survivor-camp-prototype`, with normal workspace dependencies installed:

```bash
node --import tsx ../../tools/camp/refinement/build.mts
node --import tsx ../../tools/camp/refinement/migrate.mts
node --import tsx scripts/bake-camp-navigation.mjs
node --import tsx --test tests/*.test.mjs
```

Run these in order after changing profiles, landmark placements or physical geography. `build.mts` creates high/low GLBs, hashes and convex scan footprints. `migrate.mts` starts from the unmodified candidate-layout data, ray-fits each hiding surface, and preserves all 39 IDs. It separately moves the three old roof approaches closer to the actual rock face. `bake-camp-navigation.mjs` validates graph edges using the real movement substeps and stores exact float64 trail costs. The full reconstruction and source hashes are checked by tests, preventing a stale bake from passing CI.

`model.mts` contains editable hand-authored cross sections and placement profiles; `limestone.ts` contains the exterior/cave surface. Original scans remain in the existing camp kit. GLBs can also be imported into Blender. This is an offline mesh-authoring workflow, not a claim that these meshes were manually sculpted in Blender.

No new runtime or build dependency is required. MeshoptSimplifier is the existing Three.js bundled utility and runs only during authoring; no meshopt decoder is needed in the game.

Browser evidence, from the same app directory:

```bash
# Actual minified production build, native third-person camera, 14 poses x 2 profiles
ART_PHASE=after node scripts/refinement-qa.mjs
# Continuous trusted-key Player walking, all 39 approaches and NPC water trip
REFINEMENT_APPROACHES=1 EXPEDITION_ONLY=1 EXPANSION_EVIDENCE=../../docs/tonsai-refinement/evidence/expedition node scripts/expansion-qa.mjs
WORLD_EVIDENCE=../../docs/tonsai-refinement/evidence/journeys node scripts/connected-world-qa.mjs
SPRINT_EVIDENCE=../../docs/tonsai-refinement/evidence/mobile node scripts/mobile-sprint-qa.mjs
```

Set `CAMP_CHROMIUM` to a local Chromium executable when Playwright's bundled browser is unavailable. The production QA bridge is injected by a test-only Vite plugin; it is not part of the normal build. `ART_SKIP_BUILD=1` reuses the retained build; `ART_PROFILE_ONLY=1` profiles without overwriting the gallery; `ART_QUALITY=low` or `high` isolates one profile in a fresh browser process. Live software-frame sampling is opt-in with `ART_MEASURE_LIVE=1` and drains each render. Before comparisons require the PR16 source or the retained PR16 build, never today's renderer relabeled as before.
