# Tonsai environment reconstruction — implementation and honest review

Base: `24c7c9dbc4b1b35086b32eb3293a7247d7230de1`, latest main with merged Railay PR #10. Draft only. No merge, deployment, publication of a hosted game, or changes to SurvivorIsland2025.

**Assessment: substantially improved environment art; the cinematic concept target is not achieved.** The new main formations are genuine volumetric meshes with undercuts and recesses, and their surfaces now read as weathered stone. Forest silhouettes, palms, soil, debris, water and sky are visibly different. The aerial views still expose the simplified footprint/crown construction and texture repetition. Trees remain stylized instances with recognisable branch families. This is an implemented, playable art overhaul, not an assertion of AAA or photoreal quality.

[Complete matched gallery](evidence/GALLERY.md) · [Capture and performance data](evidence/after/webgl-report.json) · [Gameplay / touch / disposal checks](evidence/gameplay-report.json) · [Loading failures](evidence/loading-report.json) · [Navigation routes](evidence/reachability.json)

## Physical environment and geography

The OSM coastline dataset, map projection, orientation, metre scale, beach coordinates and region start positions are unchanged. The world remains continuous. Only the existing `tonsai-divider` and `northwest-wall` formations receive replacement cliff assets. Their exact original footprints are retained in `tools/tonsai/footprints.json` and compared against runtime geography in tests. Other Railay cliffs and botanical placements outside the Tonsai mask retain their previous geometry.

The old polygon-ring loft is no longer the visible Tonsai cliff implementation. An original signed-volume sculpt produces real 3D undercuts, projecting lobes, dissolution pockets, oblique fractures and irregular faces. Blender imports the main formations, reduces topology, generates vertex mineral coloration, exports high and low GLBs, and saves an editable compressed `.blend`. A small independently exported fallback contains those same new silhouettes; a failed GLB request does not restore the curtain walls.

The crown elevation function was locally smoothed. Terrain triangles beneath the replacement massifs are omitted; edge samples are lowered to their non-karst ground level to eliminate old triangles poking through the new feet. The updated 6 m height lattice continues to ground the player. Large boulders and the analytic cliff field add low-height collision, including projections on elevated ground. Both graphics modes retain every collidable boulder. Camera obstruction uses the visible cliff meshes. Terrain and collision remain shared across the peninsula.

These are authored landforms at the existing geographic references, **not surveyed replicas of individual climbing walls**. OSM-based plan positions are stronger evidence than the estimated heights, hidden inland closures, erosion shapes and vegetation species distribution. The photographic references were used for morphology and palette, not projected onto the landscape as copyrighted textures.

The complete authored inland route passes the real substepped movement solver, with a 22 m correction to one waypoint at the divider / Diamond Ridge corridor. This shifts the path within existing low ground; it does not cut or flatten a headland. The rocky coastal promontory remains in place. No tide simulation or certified low-tide coastal traverse is claimed. The inland route is the verified walking connection. The wider four-beach BFS also passes. The lagoon descent remains outside ordinary walking, as in main.

## Art systems delivered

| System | Implementation |
| --- | --- |
| Main cliff solids | `tools/tonsai/sculpt.py`, `tools/blender/tonsai.py`; 2.4 m volumetric extraction, Blender reduction, 105,000 triangles per high formation and 33,600 per low formation |
| Rock surfaces | CC0 Rock 06 diffuse and OpenGL normal maps at 1024², triplanar world-space projection, desaturated mineral layers, damp/moss coloration, variable roughness and derivative fine relief |
| Reusable forest assets | Four canopy topologies, two ficus forms, three coconut palm variants, two each of pandanus, fern, large-leaf aroid and litter; branching/tapered trunks, buttresses, aerial roots and modelled palm leaflets |
| Ecological placement | Seeded clusters, shore/elevation/slope/rock-foot masks, different heights and crown forms, route clearances; low mode is a stable subset rather than a newly randomized forest |
| Ground | Darker soil transition, smooth mottling, shader litter detail, nearby modelled leaves/branches/ferns/aroids and tree roots |
| Grounding | 512² R8 canopy occlusion field from actual tree positions, with no peninsula-wide shadow-map pass |
| Shore | Instanced weathered boulders, pebbles and driftwood with clear inland routes; damp sand retained near the water |
| Water / atmosphere | Richer shallow/deep colours, transparency, small wave normals and highlights, existing depth-based foam, gradient sky and coastal haze |
| Runtime | Spatial/distance vegetation LOD, instance batches, cliff quality LOD, lower DPR in low mode, texture/mesh failure fallbacks and explicit disposal |

Vegetation candidates comprise 1,729 canopy trees, 414 ficus forms, 80 palms, 30 pandanus and 9,269 understory/litter candidates. These are candidate placements across the full enclosing Tonsai area, **not simultaneously detailed draw instances**. Understory disappears beyond 65 m low / 115 m high; detailed trees switch to simpler crowns at 180 m low / 270 m high, with farther culling. Plants are plausible tropical forms, not a verified botanical inventory. Ficus aerial roots provide hanging woody detail; a dedicated climbing-vine asset system and individually authored ledge gardens remain future work.

The shared water and daylight changes also affect the rest of Railay visually. Other regions have not received their own geometry or vegetation reconstruction. Existing camp and Council scenes keep their original assets, lighting and gameplay.

## Visual-first process and review

The baseline was rendered from main in the actual game before source changes. Camera positions, targets, 55° FOV and viewport sizes are in `scripts/tonsai-views.json`. The corrected close-up and palm viewpoints were also rendered from an untouched main worktree. Both sides use equivalent static daylight; the upgraded light and atmosphere are intentionally part of the comparison. Waves and transient LOD settling are not pixel-identical. The third-person pair uses the same Tonsai spawn with the normal gameplay camera.

Initial hero renders were rejected during development: the first solid looked too bulbous, the initial rock shader was stippled, terrain feet had spikes, and leaf shading was too dark. Subsequent passes reduced rounded bedding, added oblique fractures, changed the crown function, removed the terrain spikes, introduced the licensed normal/albedo detail and rebuilt the canopy atlas and roots. A real shader compilation error in an intermediate bark material was corrected before the final zero-error capture. Export success was not treated as visual acceptance.

| Review question | Final finding |
| --- | --- |
| Still curtain-like / extruded? | The ring curtains are gone locally; real recesses and undercuts are visible. Broad polygon footprint edges and simplified table-like crowns remain apparent in aerial views. |
| Convincing limestone material? | Considerably better, especially close up. Reads as weathered rock; it is still a generic weathered-rock scan with authored tropical staining, not a scan of Tonsai limestone. Repeated texture scale can be seen on long aerial walls. |
| Organic canopy? | More varied, brighter and substantially more connected than main. Layered alpha cards remain visibly flat in some close views. |
| Cloned trees? | Multiple branch/crown topologies help, but repeated families and simplified root wedges are still recognisable. |
| Natural beach? | More rugged, with rocky ends, scattered debris and damp transitions. The inherited 6 m shoreline raster and some geometric sand transitions remain visible. |
| Species / density? | Palms have individual leaflets and curved tapering trunks; forest / understory categories are distinct. Crown density, frond fullness, ledge vegetation and species fidelity need further art direction. |
| Lighting depth? | Better colour separation, haze, sky and ground contact shading. Canopy occlusion is a static artistic approximation, not physically accurate sun shadows. |
| Southern Thailand? | The cove, tall rock enclosures, palms and tropical forest are more evocative. No exact photographic match or complete geological reconstruction is claimed. |
| Closer to the concept? | Yes in stone detail, canopy variety and water colour. Still clearly below the concept in silhouette richness, botanical detail, natural layering, shadowing and cinematic composition. |

## Navigation, controls and regressions

Automated tests cover unchanged footprints, valid exports, optimized LODs, new silhouette fallbacks, mesh-to-field agreement, deterministic ecological constraints, stable quality subsets, safe spawn, beach motion, the complete inland trail and conservative cliff collision. Sampled Blender vertices must remain within 3.8 m of the pre-decimation analytic field; this is a voxel/art tolerance, not geographic or centimetre collision certification.

Browser checks cover map open/close, region teleport and reset, actual player advance, high/low captures, return to menu, camp, Council, island reentry, resource disposal and failed asset requests. Emulated 932 × 430 touch testing exposed an existing Explore Island issue: the joystick and Run inherited `pointer-events: none` from their HUD parent. A local wrapper now restores pointer events. The test dispatches real CDP touch events to the joystick and orbit zone and checks movement and yaw changes, rather than only injecting input state.

The full local suite passes **71 tests**; TypeScript and production build pass. The build still warns about large lazy terrain/application chunks. The new `tonsai.yml` workflow runs the relevant checks and uploads WebGL evidence without deploying.

## Performance and limitations

See [PERFORMANCE.md](PERFORMANCE.md) for the actual capture counts and memory estimates. Rendering measurements are from Chrome 142 with ANGLE/SwiftShader on this host. Submission timings and calls around `gl.render` / `gl.finish` are CPU/browser measurements and may exclude deferred browser/GPU work. They are **not iPhone FPS, sustained performance or a Safari certification**.

The art increases triangle and texture cost. Low quality reduces geometry but does not necessarily reduce draw calls for every camera. Both high and low GLB meshes are downloaded together; cliff LOD reduces submissions, not that initial download. The GLB is about 6.35 MiB, the two rock JPEGs about 1.54 MiB combined, and the editable `.blend` is development source only. No HDR cube maps, 4K textures, photogrammetry megascans or added screen-space effects are used.

Remaining technical gaps: physical iPhone Safari testing, GPU/thermal profiling, more aggressive texture deduplication/compression, independently streamed high cliff LODs, fine camera collision profiling, individual tree colliders, a dedicated vegetation streaming system and more detailed terrain beneath the jungle. Static candidate caches contain small CPU objects and are reused on region reentry; render resources are disposed on exit. Decorative small plants, litter and driftwood do not have player collision. The natural routes exclude tall vegetation and large debris.

## Reproduce

No desktop work is required of the user. The generation sources and exports are already included. For future engineering regeneration:

```sh
python -m pip install numpy scikit-image pillow
python tools/tonsai/sculpt.py
blender --background --threads 2 --python-exit-code 1 --python tools/blender/tonsai.py
python tools/tonsai/foliage.py
```

From `artifacts/survivor-camp-prototype`, use the package scripts `test`, `typecheck`, `build`, `qa:tonsai`, `qa:tonsai-gameplay` and `qa:tonsai-loading`. Set `CAMP_CHROMIUM` only when a custom Chromium executable is needed. Capturing `TONSAI_PHASE=before` must use the untouched main source, not the upgraded scene. `TONSAI_VIEWS` can restrict captures to comma-separated view IDs.

## Research and asset rights

Read [ASSETS.md](ASSETS.md) for exact included files, rights and hashes. The user-provided concept and satellite images were inspected privately and are not redistributed with this PR.

- [Via Krabi — Tonsai Beach](https://viakrabi.com/places/tonsai-beach/): sheltered cove, rugged shore and the rocky/inland Railay connections; distinguishes mainland Tonsai from Phi Phi Don.
- [Karst Climbing — area](https://karstclimbingkrabi.com/about-the-area/): dissolution-formed limestone towers, caves and climbing-wall context.
- [Karst Climbing — gallery](https://karstclimbingkrabi.com/photo-gallery/): visual reference for recesses, mineral staining, tufas, crowns and coastal walls. Photos remain reference-only.
- [TheCrag supplied reference](https://www.thecrag.com/en/climbing/thailand/krabi/area/3097160649): attempted; returned an access/payment error here, so no unseen content was treated as evidence.
- [Poly Haven Rock 06, Rob Tuytel](https://polyhaven.com/a/rock_06), [CC0 asset license](https://polyhaven.com/license): included 1K diffuse and OpenGL normal maps. Offline assets only; no API requests occur in the game.
- Existing OSM data and attribution remain in [data/railay](../../data/railay/README.md).
