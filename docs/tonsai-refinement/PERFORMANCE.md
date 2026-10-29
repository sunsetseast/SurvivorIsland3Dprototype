# Production performance and regressions

Baseline: merged PR16 `fd2c39d`; final: this draft. Each primary sample uses a **fresh Chromium process**, minified Vite production assets, the same native default camera, 932 × 430 touch viewport, DPR1, ANGLE SwiftShader. The renderer is stopped for deterministic simulation and explicitly finished before collecting its default-view resource statistics. No physical iPhone results or sustained FPS are claimed.

The earlier 18.45 s dev-entry observation mixes different stages, manual simulation and synchronous render probes. It is not directly comparable with the timers below. Document-to-menu includes the eager world/navigation module work; Explore-to-ready measures subsequent scene/asset readiness. Separating these timers exposed the substantial pre-menu cost. These are individual host observations, not distributions or network-device forecasts.

| Metric | PR16 low | Refined low | PR16 high | Refined high |
|---|---:|---:|---:|---:|
| Draw calls | 220 | 219 | 224 | 225 |
| Submitted triangles | 521,401 | 507,015 | 755,207 | 746,503 |
| Scene geometry CPU arrays | 13.16 MiB | 10.84 MiB | 15.10 MiB | 14.52 MiB |
| Estimated image texture storage | 44.98 MiB | 44.98 MiB | 44.98 MiB | 44.98 MiB |
| Document → menu | 5.993 s | 0.960 s | 6.428 s | 0.420 s |
| Explore → asset-ready scene | 2.828 s | 4.647 s | 3.040 s | 3.594 s |

Scene-only readiness is slower in both refined samples; the extra mesh payload and graphics setup remain costs to review. The improvement is concentrated in pre-menu graph work, not a claim that every loading stage became faster.

Geometry counts include shared arrays only once. Image estimates assume RGBA8 plus 4/3 mip allowance and exclude driver, render-target and shadow-map overhead. Submitted triangles include the active scene/shadow passes and differ from total registered asset triangles.

## Stage investigation

| Stage (host CPU/wall observation) | Low | High |
|---|---:|---:|
| PR16 navigation construction | 5588.5 ms | 5930.5 ms |
| Refined graph decode/link | 145.9 ms | 58.9 ms |
| Territory distance field | 103.5 ms | 52.8 ms |
| World tables/scatter | 95.9 ms | 31.5 ms |
| Terrain material mask | 438.2 ms | 338.8 ms |
| Terrain mesh generation | 61.3 ms | 73.6 ms |
| Landmark fetch/parse/readiness | 265.8 ms | 1321.3 ms |

The default navigation graph is no longer constructed on the browser main thread. Build-time validation uses the identical 0.12 m body/height tests; the shipped compact edge masks preserve exact float64 trail costs. An independent cold reconstruction test compares every node and directed edge. Source hashes fail CI when the geography/collision/navigation bake is stale. Custom grid sizes retain the original constructor.

The final graph contains **24,917 nodes / 187,616 directed edges**, 274,087 decoded bytes. The same territory boundary and all 12 trail branches remain. Scan-shaped collisions free a small amount of former rectangular corner space; this is not a territory expansion.

The terrain mask remains the largest measured small synchronous art-initialization stage, so its 1 MiB CPU weight array is cached across reentry. GPU textures/materials still belong to the scene and are disposed. Offline authored indexed landmark meshes replace runtime mesh assembly; per-site bounds/LOD also avoid raycasting one enormous world-spanning landmark mesh. No new texture image is added.

Asset-load/parse measurements include asynchronous fetch, image decode, scheduling and the callback; they overlap and must not be summed. Resource Timing entries retain transfer durations independently. Shader variants/program counts are recorded, but GPU compilation time was not independently isolated. Scene mounting, shader preparation and software raster synchronization remain in the ready timer; no claim that navigation explains all load cost is made.

## Rendering/scheduling stall investigation

An additional unbounded live-RAF diagnostic reproduced large stalls while software rendering. [The retained PR16 diagnostic](evidence/baseline-profile/report.json) preserves the original intervals. These observations show why a median RAF interval cannot certify smooth iPhone rendering.

- PR16 low: 24 RAF intervals; median 16.70 ms, maximum 33.30 ms.
- PR16 high: 24 RAF intervals; median 16.70 ms, maximum 30198.80 ms.

The primary startup runs use fresh processes without that live-RAF loop and explicitly drain submitted work. This avoids attributing preceding scene teardown/queued software work to the next cold load. It does **not** prove that every scheduling stall is fixed, or that Safari will reproduce these numbers. The QA harness also supports bounded live sampling (`ART_MEASURE_LIVE=1`, synchronous finish per render) for software-host investigation. That mode is not a GPU/device FPS benchmark either.

## Transfer budget

- `landmarks-low.glb`: **1,000,480 bytes**, 22,004 total registered triangles across its included parts/LODs, no embedded images.
- `landmarks.glb`: **3,959,084 bytes**, 101,390 total registered triangles across its included parts/LODs, no embedded images.

Low downloads only its reduced kit. High retains both LODs. This adds transfer bytes relative to PR16 even though default submissions/CPU geometry arrays improve. The graph also increases the JavaScript transfer; its compact binary data is embedded as base64. This is a deliberate startup-CPU versus transfer tradeoff, not a claim of a smaller overall download. Existing production chunk-size advisories remain.

## Gameplay and cleanup

- **100 unit tests pass**, plus the final focused asset/navigation/surface checks. TypeScript, normal production build and 294 eligible collision checks pass.
- **51 continuous browser route legs**, including **39/39 hiding approaches**, cave entry/exit, cliff, both spring routes and a real NPC water journey. Trusted keyboard gestures advance the real Player; no teleport between route destinations.
- **16 mobile-input checks**, including two-thumb Run/joystick/look, diagonal normalization, pointer cancellation, map/focus/reset and other scenes. Desktop touch emulation, not physical iPhone Safari.
- **15 connected-world checks**, including four complete round trips, authorization, persisted NPC/social ownership, conversation, existing Tribal Council ballot, failed-module recovery and cleanup.
- **48 production camera rays/orbit samples** near the cave, cliff, ancient tree and fissure pass. The 28 gallery captures retain exactly matching native camera positions to within 1e-6 m/radian.

Scene peak ownership stays at **1 detailed scene**. Every recorded release checkpoint returns to **0 uploaded geometries / 1 retained renderer texture**. Observed disposal events: 1946 geometry, 456 material, 296 texture and 5 render targets; these are events, not freed-byte measurements. Equivalent return-view listener counts remain stable.

Production high-quality menu reentry observed **1634 ms**; resource disposal was observed before reentry. Its repeated terrain-mask stage was **1.20 ms**. Parsed GPU assets are released; persistent social/navigation and the CPU mask cache are intentional retained world state.

## Raw primary profiles

- [before low](evidence/production-before-low/report.json)
- [before high](evidence/production-before-high/report.json)
- [after low](evidence/production-after-low/report.json)
- [after high](evidence/production-after-high/report.json)

Physical iPhone Safari, thermal behavior, real mobile network loading, sustained device GPU timings and a separately isolated shader compilation benchmark remain unverified.
