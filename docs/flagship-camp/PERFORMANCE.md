# Performance and gameplay verification

Measured 2026-10-28, Chromium **156.0.8078.4**, ANGLE SwiftShader software WebGL, **932 × 430, DPR 1**. These are host observations, not physical iPhone Safari certification. Raw [visual](evidence/after/report.json), [journey](evidence/journeys/browser-report.json) and [multitouch](evidence/multitouch/report.json) reports are retained.

## Comparable default-pose rendering

Before and after use the same Camp spawn, yaw, pitch and viewport; both use the actual Camp renderer. NPC timing can vary with loading. They do not compare an aerial view with a ground view. Counts include the renderer's submitted work and depend on camera/frustum/shadows.

| Scene/profile | Calls | Submitted triangles | Uploaded geometries / textures | Attached materials | CPU geometry arrays | Estimated scene textures |
| --- | --- | --- | --- | --- | --- | --- |
| Original main, low | 219 | 325,419 | 103 / 8 | 44 | 9.86 MiB | 5.06 MiB |
| Rebuilt low default | 219 | 482,883 | 97 / 28 | 48 | 10.40 MiB | 43.98 MiB |
| Rebuilt high default | 229 | 744,211 | 97 / 28 | 48 | 10.54 MiB | 43.98 MiB |

The quality improvement costs **48.4% more submitted triangles on low** and a substantial texture-memory increase. High adds nearby detail and a larger shadow map. This PR does not claim a free performance improvement over the primitive original.

CPU storage counts attached geometry attribute/index arrays, not total JS heap, retained parsed source LODs or instance-matrix buffers. Texture estimates use RGBA8 plus mipmaps from image dimensions; they are **estimates, not measured GPU bytes**, and exclude driver overhead, render targets, compressed-format differences and browser decoded-image caches. Approximate shadow-map storage adds about 4 MiB on low / 16 MiB on high, depending on actual driver format. Renderer memory counters are object counts.

## Loading, transfer and reentry

Comparable visual-harness entry-plus-settle wall samples were original low **14.327s**, rebuilt low **8.441s**, rebuilt high **6.073s**. These include navigation/bootstrap, menu entry, shader/asset work, 150 manual simulation frames and sampling; they are not pure network timings. Runs can contend with other host work, so these samples do not establish a speedup. High's second-page assets benefit from HTTP cache reuse.

Initial actual model/ground-image requests carried **4,745,422 encoded bytes** and **4,747,822 transferred bytes**, excluding Vite's `?import&url` JavaScript modules. Both modes download the same compact LOD kit; low saves submitted work rather than claiming a smaller download. The 9.9 MB editable `.blend` is not part of the browser build. Warm binary requests in the high sample report 300-byte revalidation/cache responses rather than full re-downloads.

The separate permission-gated journey controller measured the following request-to-ready times, including fade, cleanup, module/assets and harness polling:

| Request | Destination | Host elapsed |
| --- | --- | --- |
| 1 | camp_tribe_a | 1.621 s |
| 2 | railay_trails | 2.977 s |
| 3 | camp_tribe_a | 0.943 s |
| 4 | railay_trails | 2.292 s |
| 5 | camp_tribe_a | 1.177 s |
| 6 | railay_trails | 2.268 s |
| 7 | camp_tribe_a | 1.098 s |
| 8 | railay_trails | 2.341 s |
| 9 | camp_tribe_a | 1.618 s |

The asset-failure/delay stress harness's menu reentry took **12.389s**. Routing interception disables normal cache behavior, and this stress result must not be presented as the normal warm journey return. It remains a real slow host observation, not omitted from the report.

## Frame observations and provisional budgets

Five actual render-plus-`gl.finish()` wall samples at the default Camp view:

| Profile | Range | Median |
| --- | --- | --- |
| low default | 2.60–4.00 ms | 2.80 ms |
| high default | 1.30–3.50 ms | 1.50 ms |

These submission/finish samples omit the whole game frame and cannot be converted into phone FPS or treated as GPU timestamp measurements.

Short live Camp RAF intervals, from [raw profile](evidence/profile/report.json). This is a small desktop software-renderer window, not a sustained mobile benchmark.

| Profile | Intervals | Mean | Median | p95 |
| --- | --- | --- | --- | --- |
| low default | 24 | 594.42 ms | 16.70 ms | 4149.80 ms |
| high default | 24 | 801.35 ms | 16.70 ms | 516.60 ms |

The multitouch harness also retains a live RAF sprint in the **unchanged Railay journey scene**, not a Camp FPS benchmark. It proves live input/rig displacement rather than measuring this camp's rendering throughput.

Provisional default-view budgets are ≤250 calls / 650k submitted triangles on low, ≤280 calls / 1.1M triangles on high, ≤12 MiB attached CPU geometry arrays, approximately ≤48 MiB scene-image texture estimate, and <5 MB packed Camp model/ground-image payload. The retained default samples meet these provisional budgets. They are engineering guardrails for this host view, not device acceptance criteria. DPR, shadow targets, alpha overdraw, thermal behavior and sustained Safari frame pacing still need actual-device measurement.

## Four round trips and resource ownership

| Sample | Calls | Triangles | Uploaded geometry / textures | Tracked global listeners |
| --- | --- | --- | --- | --- |
| initial camp | 219 | 482,883 | 97 / 28 | 43 |
| first Railay trail arrival | 118 | 415,807 | 83 / 12 | 50 |
| first camp return | 160 | 486,551 | 95 / 27 | 43 |
| Railay round 2 | 118 | 425,163 | 83 / 12 | 50 |
| camp round 2 | 160 | 486,551 | 95 / 27 | 43 |
| Railay round 3 | 118 | 425,163 | 83 / 12 | 50 |
| camp round 3 | 160 | 486,551 | 95 / 27 | 43 |
| Railay round 4 | 118 | 425,163 | 83 / 12 | 50 |
| camp round 4 | 160 | 486,551 | 95 / 29 | 43 |
| camp baseline pose after four rounds | 222 | 485,960 | 99 / 29 | 43 |

- Peak simultaneously mounted detailed locations: **1**. Camp's tracked global listener count is **43** on every return; Railay uses 50.
- Camp return geometry allocations stay at 95 in the sampled return views. Textures move from 27 to 29 with later views/NPC activity; they are not falsely described as an exact byte plateau. Returning to the baseline view uploads additional previously culled meshes.
- Most source-release checkpoints record **0 geometries / 1 retained texture**. Nonzero checkpoint(s): **railay_trails: 70 geometries / 12 textures**. This occurs around the existing overview exit; later release checkpoints return to 0/1. No persistent scene-count or listener accumulation was observed, but this is not a claim that every asynchronous checkpoint reached zero or that GPU bytes were proven leak-free.
- Observed disposal events: **1823 geometry, 458 material, 309 texture, 5 render-target** resources. Events are deduplicated per observed object and are not bytes freed.
- The new instance batches capture their instance object before React clears its ref, so their instance buffers receive explicit disposal. Final ownership release is idempotent even if an object was disposed and later uploaded again. Late model callbacks after unmount/timeout are disposed by their loader owner.

## Gameplay certification

| Verification | Result and evidence |
| --- | --- |
| Unit suite | **87 pass, 0 fail**: prior 84 plus provenance/finite asset budgets, physical root/rock bounds, and reachability of every activity/private/departure anchor |
| TypeScript and production build | Pass; existing large-chunk warning remains. No new runtime dependency |
| Real WebGL visual/loading harness | PASS: low/high captures, active running, reachable anchors, four aborted model requests with playable fallback, delayed model completion, complete reentry; no captured application/shader errors |
| Connected world | **15 pass**: unauthorized/authorized departure, four round trips, preserved NPC/provider/social-memory identity, safe return pose/controls, dialogue, error/cancel/retry, actual aborted module recovery and resource observations |
| Mobile controls | **16 pass**: trusted multi-pointer input, joystick + camera + Run, latch, normalized sprint, cancellation, focus/reset/map locks, Camp/Tribal regression and scene-exit input cleanup |
| Tribal Council | Real sanctuary/intro and folded/deposited practice ballot pass through the existing adapter; screenshots retained |
| Physical iPhone Safari | **Not tested or certified** |
| Historical iPhone diagonal | **Root cause unresolved**; not reproduced in this Camp baseline/final set, so not certified fixed |

The read-only CI workflow is supplied, but local passes are not represented as an unobserved GitHub Actions pass. Remaining art limits are listed in [REPORT.md](REPORT.md) and shown in [GALLERY.md](GALLERY.md).
