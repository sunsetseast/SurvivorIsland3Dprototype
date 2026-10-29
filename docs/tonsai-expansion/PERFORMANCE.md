# Performance and regression measurements

The source baseline is merged PR #15, commit `0b709054dfc2a9b3d3ae4b837fdadc1699043c01`. Both baseline and final default-view profiles use Chromium 156, ANGLE SwiftShader, 932 × 430, DPR 1, the same spawn, yaw, pitch and camera position. These are desktop-host observations, **not physical iPhone Safari results**.

[Final matching-camera profile](evidence/profile/report.json) · [PR15 profile](evidence/baseline-pr15.json) · [Data/navigation measurements](evidence/data-metrics.json) · [Connected-world run](evidence/connected-world/browser-report.json) · [Mobile input regression](evidence/mobile/report.json)

## Matching-camera comparison

| Metric | PR15 low | Expanded low | PR15 high | Expanded high |
|---|---:|---:|---:|---:|
| Draw calls | 219 | 220 | 229 | 224 |
| Submitted triangles | 482,883 | 521,401 | 744,211 | 755,207 |
| Scene geometry CPU arrays | 10.40 MiB | 13.16 MiB | 10.54 MiB | 15.10 MiB |
| Estimated image texture storage | 43.98 MiB | 44.98 MiB | 43.98 MiB | 44.98 MiB |
| Dev entry + default sample wall time | 7.018 s | 8.761 s | 7.032 s | 18.449 s |

The roughly **3.33× larger walkable territory** adds **8.0% low / 1.5% high submitted triangles** at this matching view. Low adds one draw call; high uses five fewer. The distant boundary thicket uses an 80-triangle shrub instead of repeated scanned tree parts. High tree/palm near-detail thresholds are 36/42 m; low uses 24/26 m. Nearby scanned materials remain, while frustum/distance compaction limits distant submissions. Camera CPU observations in the default samples are 0.20/0.10 ms, single observations rather than a robust benchmark.

**Loading regressed on this host.** The final high-profile dev entry took 18.45 s versus 7.03 s in the baseline. Entry wall time includes dev module work, asset readiness, shader/render startup, 150 fixed simulation ticks and five synchronous render/finish probes. It is not a pure download timer or a production/device loading benchmark. The low comparison also increased. These observations are retained instead of claiming unchanged load performance.

The 24 live RAF intervals had the following ranges. They include host scheduling/renderer stalls and do not justify a phone FPS claim:

| Default view | Median interval | Maximum interval |
|---|---:|---:|
| low default | 16.70 ms | 16.80 ms |
| high default | 16.70 ms | 16666.00 ms |

All interval samples and five synchronous render/finish timings are in the raw JSON. A large high-profile scheduling stall occurred; the median alone must not be treated as sustained rendering performance. The gameplay tests use fixed simulation ticks to separate correctness from host raster speed.

## Terrain, vegetation and assets

| Profile | Terrain chunks | Registered vertices | Registered triangles |
|---|---:|---:|---:|
| low | 30 | 11,742 | 21,168 |
| high | 30 | 29,177 | 54,668 |

Terrain chunks share one ground material. Chunk frustum culling means registered triangle totals differ from submitted triangles. The 512² four-channel terrain mask replaces the former 256² mask, accounting for about 1 MiB more estimated texture storage including a mip allowance. Estimates use RGBA8 with a 4/3 mip factor; they exclude driver overhead, render targets and shadow targets and are not measured GPU residency.

| Placement registry | Count | Normal full-kit usage |
|---|---:|---|
| PALMS | 100 | Instanced scanned kit, near/far |
| BROADLEAF | 210 | Instanced scanned tree kit, near/far; separate authored/backdrop/crown assemblies also exist |
| FERNS | 959 | Instanced scanned fern variants |
| SHRUBS | 900 | Scanned understory plus inexpensive boundary shrubs |
| ROCKS | 87 | Instanced scanned talus |
| BAMBOO | 24 | Legacy degraded-art fallback |
| GRASS | 730 | Legacy degraded-art fallback |

These are world placements, not claims that every plant or every LOD is rendered simultaneously. A trunk/branch/leaf assembly can produce several instanced parts. Near/far meshes and materials are shared; no extra scanned binary asset is introduced. The three camp GLBs, fern GLB and four ground JPEGs total **4,745,422 bytes (4.75 MB)**, unchanged from PR15. Authored landmarks are runtime geometry/source code. Resource Timing entries in the profile preserve encoded-body and transfer/cache observations; Vite `?import&url` modules must not be counted as model downloads.

Shadows remain bounded around the main camp rather than expanding a full-resolution shadow map over the entire forest. Low/high use 1024²/2048² shadow maps and 2.5/1.5 m terrain tessellation. This is a deliberate mobile tradeoff; the inland forest does not acquire full-camp shadow coverage.

## Navigation and physical validation

The final metre-centre sample finds **24,877 m²** of walkable ground versus **7,460 m²** for PR15 using the same method. The broad-phase rectangle is 201 × 191 m; the rectangle is not the playable area. Sampling excludes water and solids, and is an area estimate rather than a survey.

The graph contains **24,878 nodes / 187,272 directed edges**. Fresh graph build on this Node host took **2992.6 ms**. It is reused across CampRuntime instances and scene reentry; per-route caches are bounded. The static graph is intentionally retained with persistent camp state rather than treated as a leaked scene GPU object. Collider lookups and boundary-distance queries avoid scanning the entire expanded world for every movement substep.

| Destination | Routed metres from spawn | Cold search | Cached search |
|---|---:|---:|---:|
| (104, 36) | 148.6 | 12.27 ms | 0.056 ms |
| (-17, 91) | 127.3 | 11.59 ms | 0.065 ms |
| (11, 104) | 162.6 | 13.76 ms | 0.066 ms |
| (16, 65) | 116.2 | 8.55 ms | 0.026 ms |
| (43, 80) | 149.8 | 17.52 ms | 0.030 ms |
| (30, 91) | 164.6 | 15.48 ms | 0.031 ms |
| (38, 5) | 71.2 | 5.14 ms | 0.019 ms |

The unit tests traverse all authored trail centrelines with the actual movement solver, validate every activity/hiding approach, complete an NPC collection/return trip, and raycast the actual cliff triangles through the cave centre and both sides at both quality levels. Dynamic avoidance can escape a newly overlapping NPC ring. The browser expedition uses trusted keyboard movement through continuous routes; actors are not teleported between destinations.

## Transitions, repeated loading and cleanup

The connected-world browser run passed 15 checks, including four Camp ↔ Railay round trips, authorization, persistent NPC/social ownership, conversation, Tribal Council ballot, interrupted/retried travel and an actual aborted destination module request.

| Successful transition | Request-to-ready observations |
|---|---|
| railay_trails | 3225.7 ms, 1921.8 ms, 1895.7 ms, 2304.9 ms, 3547.8 ms |
| camp_tribe_a | 1802.2 ms, 801.1 ms, 827.0 ms, 869.5 ms, 1796.4 ms, 4378.1 ms, 836.6 ms |

These controller timings include fade, cleanup, destination loading/readiness and host rendering. They use different entry poses from the matching-camera profile and cannot be substituted for its loading comparison.

Repeated return-view Camp listener counts stayed at 43; returning to the original spawn/UI returned to 39. The four extra listeners belong to the proximity-only departure button, not accumulating visits. Scene release checkpoints returned to **0 uploaded geometries / 1 retained texture** before destination mounting. The retained renderer allocation is not claimed as zero GPU memory.

Observed disposal events: 2009 geometry, 478 material, 305 texture, 5 render-target resources. Event counts are not bytes freed. Source and destination detailed scenes never overlap beyond the existing lifecycle contract.

## Regression status and limits

- **95 unit tests pass**, including the new world/landmark/navigation checks.
- TypeScript and production build pass. The build retains the existing advisory about large chunks.
- **16 mobile-input browser checks pass**: joystick/Run/look multitouch, pointer cancellation, diagonal speed, keyboard, focus/reset, scene exit and other scenes.
- The new expanded map also blocks trusted W input during 60 real Player ticks; [map check](evidence/map-check.json).
- **15 connected-world browser checks pass**, with raw cleanup and repeated-loading observations above.
- Matching-camera final low/high WebGL profiling passes. Continuous expedition and landmark screenshots are linked from the [gallery](GALLERY.md).
- High dev-entry loading and the long live-RAF stall are unresolved host observations. Physical iPhone Safari, production network loading and long-session device thermal behavior remain unverified. This draft does not claim device FPS or visual photogrammetric fidelity.
