# Camp production kit

The selected assets, creators, licenses and reference-to-art decisions are documented in [ASSETS.md](../../docs/flagship-camp/ASSETS.md). Runtime composition is in `src/game/environment/composition.ts`, separate from the asset kit and gameplay world.

From the repository root:

```bash
python tools/camp/acquire.py /tmp/camp-sources
blender -b --python tools/camp/build.py -- /tmp/camp-sources
python tools/camp/pack.py /tmp/camp-sources
pnpm --filter @workspace/survivor-camp-prototype test
pnpm --filter @workspace/survivor-camp-prototype qa:flagship-camp
```

Acquisition needs Python/Pillow and network access. Production needs Blender 4.5 LTS with its bundled NumPy. The game itself needs none of these tools or new packages. An editable optimized production scene is retained in `source/camp-kit.blend`; original scans can be reacquired with verified MD5 values.

Additional evidence modes, run from `artifacts/survivor-camp-prototype`:

```bash
CAMP_PHASE=profile pnpm qa:flagship-camp
CAMP_PHASE=inspection pnpm qa:flagship-camp
WORLD_EVIDENCE=../../docs/flagship-camp/evidence/journeys pnpm qa:connected-world
SPRINT_EVIDENCE=../../docs/flagship-camp/evidence/multitouch pnpm qa:mobile-sprint
```

`CAMP_CHROMIUM` optionally selects an installed Chromium executable. Without it Playwright uses its installed browser. `CAMP_PHASE=before` is for the original main renderer and should not overwrite the retained baseline when run against the rebuilt scene. Inspection mode labels its diagnostic eye-height cameras separately from native Player-camera screenshots.

After verified reports are present, `python tools/camp/report.py` rebuilds the performance tables. Geometry hashes, root/rock bounds, complete runtime part names, mobile budgets and activity/private/departure reachability are enforced by `tests/flagship-camp.test.mjs`.
