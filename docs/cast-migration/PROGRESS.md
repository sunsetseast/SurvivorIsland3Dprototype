# Survivor cast migration

[Draft PR #30](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/30) on `feat/survivor-cast-renaissance`. Base `2f1f1c59e07d5f40fd01df52f35ee18a4bbe3b45` includes PR #29. The [branch head](https://github.com/sunsetseast/SurvivorIsland3Dprototype/commits/feat/survivor-cast-renaissance/) records the latest pushed SHA. Source inventory `b7b25b8e1bcd52be8be1d554ab8752237fac8993`. Rig pilot `e964daf22488a7e3a78ae92d32b585d2570bd48a`. Full asset batch `a1509b4b3db87dc1f25d4f8eea8a655f161bf435`. Player selection `eb1299e2934101019c86144f14a998a8ec484ea2`.

| Checkpoint | Status |
| --- | --- |
| Source inventory | Imported 18 of 18 original records with all IDs, attributes and avatar paths. |
| Rigged cast pilot | Generated and visually reviewed 3 of 18. [WebGL front, profile, three-quarter, walk, run and sit](evidence/rig-pilot.jpg) for Jeremy, Cirie and Carolyn against PR #29. Adjusted tank fit and reduced beard and bun geometry after the first render. |
| Batch production | 18 of 18 generated and visually reviewed. [Full WebGL contact sheet](evidence/cast-contact-sheet.jpg). All 18 pass identity, 66-joint skin, 13-clip, geometry, texture and size validation. Total GLB payload is 8,662,908 bytes across separately loaded assets. |
| Selection | Verified Sandra, Jeremy and Carolyn using the landscape picker, original attributes, touch locomotion, unique camp slots and reloading the saved identity. All 18 models are selectable. |
| Shared NPC renderer | Camp, Coastal Traverse, Stillwater, challenge previews, Council and jury consume the same character assets and animation player. Camp, both playable challenges, Council attendance, seated jury and post-ceremony exploration were verified in WebGL. |
| Final verification | Local suite 200 passed, TypeScript and Vite production build passed. Production camp refinement QA enters through the survivor picker when no identity is saved and times loading from confirmation. The [pull request checks](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/30/checks) track CI on the latest branch head. |

Original portraits provided the character cues. Lower-body wardrobe is expedition styling where portraits end. Models are stylized interpretations. Source photographs and illustrated portraits are references only. Asset and clip notices are recorded in the [PR #29 source report](../character-renaissance/FINAL_REPORT.md).

The prototype retains four AI slots. Picking a default AI participant vacates that slot and fills it with an unused original identity. The existing season adapter owns who attends Council and who serves on the jury. The jury screenshot uses three staged IDs. Reload restores the selected survivor from versioned local storage. The world, AI simulation and challenge runs remain session-local.

## Gameplay evidence

- [Landscape picker](evidence/selection.jpg) and [touch-controlled survivor](evidence/selected-survivor-moving.jpg).
- [Tonsai Camp](evidence/tonsai-camp-cast.jpg), [Coastal Traverse](evidence/coastal-traverse.jpg) and [Stillwater Balance](evidence/stillwater-balance.jpg).
- [Council seating](evidence/tribal-council-cast.jpg) and [staged jury](evidence/tribal-jury.jpg).

Stillwater with five rigged participants in emulated 932 × 430 landscape at DPR 1. The browser used Chromium software WebGL. Frame intervals reflect that renderer.

| Mode | Draw calls | Submitted triangles | Median frame interval | P95 frame interval |
| --- | ---: | ---: | ---: | ---: |
| Low | 95 | 281,608 | 167 ms | 317 ms |
| High | 95 | 665,652 | 250 ms | 517 ms |

Cast GLBs load on demand, at 406–563 KB each. Active instances share geometry, textures and clip data. Each instance has its own skeleton and mixer. The bounded cache retains parsed data for reuse and releases renderer allocations when the last user leaves. NPC pose updates slow at distance and pause on hidden actors.

Next action after checking CI is a physical iPhone 17 Pro Max Safari landscape playtest of the picker and five-person challenge scenes. Seated, hand and foot contact remain approximate across the range of body shapes.

## Repeat the cast bake

1. From the game repo, run `node tools/character/import-cast.mjs /path/to/SurvivorIsland2025` against the source revision in the manifest.
2. At the Ara 3D Gen revision in the linked source report, run its `node --import tsx scripts/setup-assets.ts`. Verify the MakeHuman checkout revision against the report. Copy `tools/character/bake-survivor.ts` into Ara's `scripts` directory.
3. From Ara, run `node --import tsx scripts/bake-survivor.ts <raw-directory> <game-cast.json> <appearances.json>`. An optional list of source IDs limits the bake.
4. From the game repo, run `node tools/character/optimize-cast.mjs <raw-directory>` with glTF Transform CLI 4.4.0. Set `GLTF_TRANSFORM` if its executable is outside PATH. Run `node scripts/validate-cast.mjs` from the game package. The contact sheet comes from `PORT=5226 BASE_PATH=/ node scripts/cast-model-qa.mjs` in that package.
