# Survivor cast migration

[Draft PR #30](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/30) on `feat/survivor-cast-renaissance`. Base `2f1f1c59e07d5f40fd01df52f35ee18a4bbe3b45` includes PR #29. The [branch head](https://github.com/sunsetseast/SurvivorIsland3Dprototype/commits/feat/survivor-cast-renaissance/) records the latest pushed SHA. Source inventory `b7b25b8e1bcd52be8be1d554ab8752237fac8993`. Rig pilot `e964daf22488a7e3a78ae92d32b585d2570bd48a`. Full asset batch `a1509b4b3db87dc1f25d4f8eea8a655f161bf435`.

| Checkpoint | Status |
| --- | --- |
| Source inventory | Imported 18 of 18 original records with all IDs, attributes and avatar paths. |
| Rigged cast pilot | Generated and visually reviewed 3 of 18. [WebGL front, profile, three-quarter, walk, run and sit](evidence/rig-pilot.jpg) for Jeremy, Cirie and Carolyn against PR #29. Adjusted tank fit and reduced beard and bun geometry after the first render. |
| Batch production | 18 of 18 generated and visually reviewed. [Full WebGL contact sheet](evidence/cast-contact-sheet.jpg). All 18 pass identity, 66-joint skin, 13-clip, geometry, texture and size validation. Total GLB payload is 8,662,908 bytes across separately loaded assets. |
| Selection | Verified Sandra, Jeremy and Carolyn using the landscape picker, original attributes, touch locomotion, unique camp slots and reloading the saved identity. All 18 models are selectable. |
| Shared NPC renderer and Council | Verification in progress. |

Original portraits provided the character cues. Lower-body wardrobe is expedition styling where portraits end. Models are stylized interpretations. Source photographs and illustrated portraits are references only. Asset and clip notices are recorded in the [PR #29 source report](../character-renaissance/FINAL_REPORT.md).

Next action is to finish the Low and High challenge measurements, Council and jury capture, then verify the final CI head.


## Repeat the cast bake

1. From the game repo, run `node tools/character/import-cast.mjs /path/to/SurvivorIsland2025` against the source revision in the manifest.
2. At the Ara 3D Gen revision in the linked source report, run its `node --import tsx scripts/setup-assets.ts`. Verify the MakeHuman checkout revision against the report. Copy `tools/character/bake-survivor.ts` into Ara's `scripts` directory.
3. From Ara, run `node --import tsx scripts/bake-survivor.ts <raw-directory> <game-cast.json> <appearances.json>`. An optional list of source IDs limits the bake.
4. From the game repo, run `node tools/character/optimize-cast.mjs <raw-directory>` with glTF Transform CLI 4.4.0. Set `GLTF_TRANSFORM` if its executable is outside PATH. Run `node scripts/validate-cast.mjs` from the game package. The contact sheet comes from `PORT=5226 BASE_PATH=/ node scripts/cast-model-qa.mjs` in that package.
