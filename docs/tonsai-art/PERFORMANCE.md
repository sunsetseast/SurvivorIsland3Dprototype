# Performance evidence

Production Chromium 153 / ANGLE SwiftShader, 932 × 430 touch viewport, DPR 1. These are software-host measurements, not an iPhone 17 Pro Max FPS certification. Reports retain errors, loading stages, resource transfers and raw timing samples.

## Matched spawn resources

| Metric | Low before | Low after | High before | High after |
| --- | ---: | ---: | ---: | ---: |
| Draw calls | 234 | 234 | 251 | 251 |
| Submitted triangles | 680,644 | 683,599 | 980,009 | 984,059 |
| Resident geometry arrays, bytes | 20,819,754 | 20,819,754 | 26,447,300 | 26,447,300 |
| Estimated image storage, bytes | 55,031,152 | 55,031,152 | 55,031,152 | 55,031,152 |

Submitted triangles change by +0.43% low / +0.41% high because altered foliage bounds change culling. This is not an increase in stored mesh triangles. Across 24 native comparison poses, the automated limits are +5% submitted triangles and at most two extra calls; all pass. Some poses submit fewer calls, while cave/inland views add one. The image-storage estimate uses uncompressed RGBA with mipmaps and is not a measured browser/GPU allocation.

[All paired pose budgets and camera parity](evidence/comparison.json)

## Asset payloads

| GLB | Before bytes | After bytes |
| --- | ---: | ---: |
| Landmarks, low | 1,006,012 | 1,006,012 |
| Landmarks, high | 3,841,196 | 3,841,192 |
| Reconstruction, low | 2,963,136 | 2,963,140 |
| Reconstruction, high | 4,788,628 | 4,788,648 |

No new images or runtime dependencies. Relief transfer runs offline. Near/far cliff exports remain below the existing per-mesh triangle limit; exported correspondence is tested within the existing 1.6 m tolerance. Byte-identical rebuild results and mesh identity checks are in [asset integrity](evidence/asset-integrity.json).

## Software-host timing observations

Each finish sample measures one real WebGL render followed by `gl.finish()`, after warmup, at the spawn pose; the table gives the median of 12 samples. Loading is the time from the Explore click to the ready scene, excluding menu navigation. Sequential before/after runs reduce concurrency interference, but small sample sizes and host variability still limit interpretation.

| Capture run | Low finish median, ms | High finish median, ms | Low ready, ms | High ready, ms |
| --- | ---: | ---: | ---: | ---: |
| Original before gallery | 1.65 | 1.50 | 2,219 | 1,858 |
| Final after gallery | 2.80 | 2.90 | 3,092 | 2,322 |
| Isolated before 1 | 2.25 | 2.70 | 2,167 | 2,005 |
| Isolated after 1 | 2.75 | 1.90 | 2,311 | 1,864 |
| Isolated before 2 | 2.65 | 2.85 | 2,410 | 2,056 |
| Isolated after 2 | 2.45 | 2.60 | 2,489 | 2,040 |

The original after gallery is slower; it is retained. Isolated low results vary between a regression and an improvement, while high results are lower in these two repeats. This evidence does not support a stable performance improvement or a mobile frame-rate claim. Some repeated high-quality menu navigations take roughly 14–15 seconds before clicking Explore; those observations remain in the raw reports and are not hidden inside ready-time numbers.

Raw reports: [before gallery](evidence/before/report.json), [after gallery](evidence/after/report.json), [before 1](evidence/performance/before-1/report.json), [after 1](evidence/performance/after-1/report.json), [before 2](evidence/performance/before-2/report.json), [after 2](evidence/performance/after-2/report.json).
