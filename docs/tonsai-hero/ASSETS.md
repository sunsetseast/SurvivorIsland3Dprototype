# Tonsai showcase asset register — 2026-10-27

The shipped assets are either original work created for this repository or CC0 downloads. Reference photographs are research only and are not redistributed. No Sketchfab model, paid asset, AI background or proprietary game asset is included.

| Shipped asset | Creator / origin | License and attribution | Changes |
| --- | --- | --- | --- |
| `karsts-high.glb`, `karsts-low.glb`, `hero-anchors.json`, replacement divider fallback | Original designed ridge sculpt; `tools/tonsai/hero-design.json`, `hero.py`, `tools/blender/hero.py` | Original work, MIT | Five named peak masses, two saddles, recessed chambers, dissolution slots, shelves; Blender retopology, cavity tint, separate quality exports. Existing NW massif is carried through unchanged. |
| `botanical.glb`, `leaf-sprays.png` | Original work; `tools/blender/botanical-hero.py`, `tools/tonsai/leaf-sprays.py` | Original work, MIT | Three canopy architectures, three spreading ficus architectures and three curved coconut palms; near/far meshes, buttress/aerial roots, bent leaf spray cards, individual palm leaflets and vertex shading. |
| `coast_rocks_05.glb` | [Coast Rocks 05](https://polyhaven.com/a/coast_rocks_05), Rob Tuytel / Poly Haven | [CC0 1.0](https://polyhaven.com/license); attribution optional, credited here | Inspected original glTF: 401,298 vertices / 771,724 triangles with 1K albedo, normal and ARM maps. Reduced to 2,400 triangles, maps 512px, centered and normalized for existing boulder collision radii. Used only for selected large rocks near the showcase in high mode. |
| `fern_02.glb` | [Fern 02](https://polyhaven.com/a/fern_02), Rico Cilliers (modeling), Rob Tuytel (scanning) | CC0 1.0; attribution optional, credited here | Four original mesh silhouettes inspected: 2,384 / 2,248 / 784 / 816 triangles. Reduced to 699–700 each. Restored the separate alpha map into the JPEG albedo as RGBA; 512px maps. Detailed ferns used only near the viewer. |
| Existing `rock_06_*` maps | [Rock 06](https://polyhaven.com/a/rock_06), Rob Tuytel / Poly Haven | CC0 1.0; see [PR11 register](../tonsai/ASSETS.md) | Files unchanged. World-space shading now separates macro mineral/rain coloration from scanned grain and normal detail. |
| Existing NW massif and fallback foliage | PR11 original assets | Original work, MIT | Original NW geometry preserved. Procedural foliage remains a download-failure fallback; lighter distant ground cover is generated from the existing source. |

Exact generated asset hashes, byte sizes and mesh counts are in `src/assets/tonsai/hero-manifest.json`, `botanical-manifest.json` and `coastal-manifest.json`. The original PR11 GLB remains an offline source dependency for the NW massif, **not** a browser import. Editable Blender scenes are under `tools/blender/source/tonsai-hero.blend` and `tonsai-botanical.blend`; neither enters the web build.

## Candidate evaluation and research

- Poly Haven's coastal scan has genuine eroded ledges and scanned PBR detail. Its approximately four-metre raw mesh extent and open scan construction make it appropriate for small talus, not for enlarging into a 190m mountain. Actual geometry and maps were imported into Blender and inspected before optimization.
- Poly Haven's four fern meshes provide more convincing serrated fronds than the original formula-only fern. The downloadable glTF's JPEG base color lacked the separate alpha; this was repaired before use.
- [ambientCG](https://ambientcg.com/) and its [license documentation](https://docs.ambientcg.com/license/) were reviewed. CC0 permits asset redistribution, but no additional ambientCG file was needed: a second generic rock texture did not solve the designed silhouette problem.
- Sketchfab's [Limestone by trclifton](https://sketchfab.com/3d-models/limestone-21b5af0a9c4045518f54326bbb041f57) and limestone outcrop listings by Théobald Guffon advertise noncommercial/share-alike restrictions. They were rejected; no files downloaded or imported. “Free download” was not treated as redistribution permission.
- [Blender glTF guidance](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html), [Decimate](https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/decimate.html), [Khronos glTF](https://www.khronos.org/gltf/) and [SpeedTree](https://unity.com/products/speedtree) informed the use of fixed mesh budgets, shared atlases, instancing, actual silhouette variants and distance LOD. These are workflow references, not dependencies or included assets. Some documentation pages were inaccessible to the browsing service; export/decimation behavior was verified directly in Blender 4.5.3.

## Geographic and botanical reference

[Thailand tourism's Ton Sai Bay](https://www.thailandtourismdirectory.go.th/en/attraction/99177), [Railay climbing information](https://www.railay.com/railay/climbing/climbing_intro.shtml), [SouthClimb's Tonsai photographs](https://www.southclimb.com/en/activity/thailand) and [Tinidee's local gallery](https://www.tinideekrabiresort.com/gallery.php) were inspected for the limestone rather than generic mountain styling: high gray faces, warmer mineral exposures, shaded roof recesses, vertical dissolution, wooded crests and coastal palms. These photographs are not textures, geometry or redistributed reference sheets. Ficus/coconut/pandanus forms are botanical interpretations, not verified species surveys of individual trees.

## Reproduction (maintainer tooling only)

The user needs no Blender or desktop workflow. All optimized runtime assets are committed.

1. `python3 tools/tonsai/acquire-hero-assets.py` downloads the two CC0 glTF sources through Poly Haven's public API and verifies each supplied MD5. Pillow merges fern alpha.
2. `python3 tools/tonsai/hero.py` samples the designed divider into `/tmp/tonsai-hero/hero.npz` (numpy and scikit-image).
3. `python3 tools/tonsai/leaf-sprays.py` creates the original shared atlas.
4. Blender 4.5: `blender -b -t 4 --python tools/blender/hero.py`, then `botanical-hero.py`, then `coastal-assets.py` in the same directory. `ASSET_SOURCE` may override `/tmp/asset-candidates`.
5. Run the app tests and the three `qa:tonsai-hero*` commands. Sculpt `.blend` source is editable; screenshots are always captured in the game, not in Blender.

Sources and rights were checked on 2026-10-27. CC0 legal text: https://creativecommons.org/publicdomain/zero/1.0/legalcode
