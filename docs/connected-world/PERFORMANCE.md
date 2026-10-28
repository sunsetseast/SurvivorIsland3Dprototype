# Performance and lifecycle findings

Actual run: Chromium 153.0.8010.0, host ANGLE SwiftShader, 932×430, DPR 1, low quality. [Raw report](evidence/browser-report.json). No physical iPhone, Safari FPS, thermal measurement or GPU-memory byte measurement is claimed.

## Comparable before/after

[Baseline main 8ef774f](evidence/baseline.json) and [equivalent after](evidence/after-equivalent.json) use the same default Camp and Railay West poses, menu entry, quality and 2.5-second settling window. Calls, triangles and uploaded geometry/texture counts are unchanged: Camp **219 / 325,419 / 103 / 8**, Railay West **113 / 264,256 / 58 / 7**. Entry-plus-settle wall samples were 5.731 → 5.944 seconds for initial Camp, 5.885 → 6.320 for Railay West, and 2.562 → 2.525 for Camp menu reentry. These are small host samples with an intentional fade/cleanup addition, not evidence of faster loading or sustained frame rates.

Production main JS is approximately 1,364 kB (396 kB gzip) versus 1,312 kB (378 kB gzip) on baseline; the pre-existing terrain data stays in a separate approximately 3.7 MB module loaded for Railay. Existing large-chunk warnings remain. Camp does not eagerly mount or import the full Railay terrain/render tree.

## Actual connected-travel wall times

These are request-to-ready times from the transition controller. They include the 280 ms fade, resource cleanup, module/assets, software rendering and harness readiness polling. Different scene poses and methodology mean they must not be subtracted from the default-pose baseline above.

| Request | Destination | Host elapsed |
| --- | --- | --- |
| 1 | camp_tribe_a | 2.819 s |
| 2 | railay_trails | 3.418 s |
| 3 | camp_tribe_a | 1.799 s |
| 4 | railay_trails | 1.970 s |
| 5 | camp_tribe_a | 1.964 s |
| 6 | railay_trails | 1.910 s |
| 7 | camp_tribe_a | 1.935 s |
| 8 | railay_trails | 2.003 s |
| 9 | camp_tribe_a | 2.519 s |

Error/retry/recovery timings are separately labeled in the raw report. Recovery samples can include time spent showing/capturing an error before the recovery request; they are not pure network-duration measurements.

## Render/resource samples through four round trips

Geometry/textures are `renderer.info.memory` object counts, not bytes. Submitted triangles and calls depend on camera/frustum and continuing NPC animations. Warm return views differ from the initial camp view.

| Sample | Draw calls | Submitted triangles | Uploaded geometries | Uploaded textures | Tracked global listeners |
| --- | --- | --- | --- | --- | --- |
| initial camp | 219 | 325,419 | 103 | 8 | 43 |
| first Railay trail arrival | 118 | 415,807 | 83 | 12 | 50 |
| first camp return | 156 | 293,087 | 101 | 9 | 43 |
| Railay round 2 | 118 | 425,163 | 83 | 12 | 50 |
| camp round 2 | 156 | 293,087 | 101 | 9 | 43 |
| Railay round 3 | 118 | 425,163 | 83 | 12 | 50 |
| camp round 3 | 195 | 331,409 | 101 | 9 | 43 |
| Railay round 4 | 118 | 425,163 | 83 | 12 | 50 |
| camp round 4 | 195 | 331,409 | 101 | 9 | 43 |
| camp baseline pose after four rounds | 219 | 321,207 | 105 | 9 | 43 |

- Peak simultaneously mounted detailed locations: **1**.
- Each source cleanup checkpoint reached **0 uploaded geometries and 1 retained texture** before the next detailed scene mounted. The single remaining renderer allocation is not attributed as a known scene asset or claimed as zero GPU memory.
- Repeated Camp return geometry/texture counts plateaued at **101 / 9**; Railay at **83 / 12**. Camera sampling can change submitted calls/triangles without introducing additional scene trees. Returning to the default Camp camera uploaded a few additional previously culled meshes, rather than recreating a second camp.
- Camp’s tracked global input/lifecycle listener count stayed **43** at every sampled return, enforced by the browser test. Railay’s corresponding count was **50** in these samples. Local/once/internal listeners outside the explicitly tracked event families are not included in this proxy.
- Observed owned-resource disposal events across the journey/error scenarios: **1886 geometry, 439 material, 166 texture, 5 render-target resources**. Counts include resources observed during asynchronous asset replacement; they are not a count of bytes freed. Existing disposal hooks and the ownership sweep both participate. No target leak growth was observed.
- Typed geometry attribute/index arrays in the scene: about **10.34 MB Camp / 8.77 MB Railay** (CPU-side arrays). RGBA8-plus-mip texture estimates: about **5.31 MB / 34.56 MB**; these exclude driver overhead, render targets, compression/format differences and hidden allocations. They are not actual GPU byte readings.
- The browser’s coarse `performance.memory` buckets were 50.4 MB during journey samples. They do not establish a precise heap plateau. Baseline/after menu buckets were 50.4/56.8 MB; module/cache growth and browser bucketing prevent treating that difference as a measured GPU leak or a controlled heap comparison.

## Asset requests

The report records 52 asset-looking responses and raw Resource Timing entries; `?import&url` entries are Vite URL-export JavaScript modules, not binary model transfers. Excluding those modules, recorded transfer size across the full repeated journey scenario was **5,495,266 bytes**. Initial low-quality assets included the approximately 1.37 MB karst GLB, 1.64 MB botanical GLB, 0.48 MB fern GLB, 0.16 MB geology GLB, and limestone images. 27 later binary timing entries reported no more than 300 transferred bytes each, consistent with HTTP cache/revalidation reuse rather than downloading each full model again. This remains browser HTTP-cache behavior; GLTF parsing and scene-owned GPU allocation occur again on entry. Procedural characters add no model downloads.

## Remaining measurement work

Physical iPhone Safari remains uncertified. Measure sustained FPS/frame pacing, peak Safari memory pressure, GPU allocations where tooling permits, decoded-image retention, network behavior and touch/camera feel on actual hardware before setting production budgets. The journey still uses the existing broad Railay environment; this PR establishes location isolation rather than rebuilding its environment art or certifying its high-quality mobile cost.
