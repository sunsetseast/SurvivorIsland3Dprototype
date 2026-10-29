# Performance observations

PR17 main `5249bf2` and this branch were measured with preserved minified production builds, Chromium 153 ANGLE SwiftShader, a 1536 × 620 touch viewport, DPR1, the same spawn camera and fixed simulation warm-up. Each build visits low then high. These are single host observations, not statistical benchmarks or iPhone frame-rate measurements. The high visit follows low in the same browser; cache/shader work affects menu timing. Do not interpret timing differences as device improvements.

| Metric | PR17 | Reconstruction |
| --- | ---: | ---: |
| low draw calls | 224 | 237 |
| low submitted triangles | 540,907 | 829,423 |
| low resident geometry MiB | 10.84 | 20.17 |
| low texture estimate MiB | 44.98 | 49.90 |
| low requested image/GLB body MiB | 5.48 | 8.31 |
| low menu → complete camp ms | 2425 | 2266 |
| low document → menu ms | 260 | 269 |
| low three render + finish samples ms | 4.3, 3.0, 2.8 | 4.3, 3.0, 2.7 |
| high draw calls | 231 | 254 |
| high submitted triangles | 807,865 | 1,182,710 |
| high resident geometry MiB | 14.52 | 25.43 |
| high texture estimate MiB | 44.98 | 49.90 |
| high requested image/GLB body MiB | 8.30 | 11.88 |
| high menu → complete camp ms | 1814 | 1967 |
| high document → menu ms | 7279 | 12167 |
| high three render + finish samples ms | 38.2, 19.2, 3.7 | 5.6, 6.1, 5.8 |

Raw records: [PR17](evidence/performance-before/report.json), [final reconstruction](evidence/performance-after/report.json), [recovered version before range optimization](evidence/performance-recovered/report.json). The full [gallery record](evidence/after/report.json) supplies a separate capture run. Resource totals sum Resource Timing `encodedBodySize` for requested image/GLB bodies, including cache-served bodies when reported; they are not wire-transfer measurements. They exclude JavaScript, HTML, CSS and evidence screenshots. Geometry is unique buffer storage. Texture estimates assume uncompressed RGBA8 plus mipmaps; they exclude driver copies, transient targets and other implementation allocations. They are resource estimates, not measured GPU memory.

## Cost and controls

The reconstruction increases submitted geometry and asset bodies materially: spawn submissions are about 53% higher on low and 46% higher on high than PR17. Shortening detail ranges reduces high submissions by about 13% from the recovered reconstruction, without removing habitat placements. Low still has the complete habitat placement set: simpler distant foliage and a smaller shelter export replace near geometry. The new low kit is about 2.98 MB; high is about 4.81 MB. The low kit retains the thin joint bindings that simplification had removed. Both use the same 1024² photographic spray atlas. Existing licensed source textures are retained, with shared material/texture ownership. No new runtime package or FFT/refraction render-target chain is introduced.

Instance batches compact by actual transformed mesh bounds, frustum and distance four times per second. This avoids submitting the entire island's vegetation. Ground fragments use spatial cells. The main foliage batches still scan their placement arrays during culling, so this is not a streaming/quadtree implementation. Alpha-tested sprays and close-camera hash fading trade geometry for some fragment overdraw. They need physical Safari profiling before release.

One sun supplies shadows; the new water uses one surface and one byte shoreline lookup. Low excludes near asset nodes rather than removing forest habitats. Full scene cleanup and repeated journeys were exercised in the connected-world browser test; disposal and bounded listeners passed. See [gameplay](GAMEPLAY.md).

No physical iPhone, Safari GPU timing, sustained FPS, thermal test, battery measurement or memory-pressure certification was available. The three `render + gl.finish` host samples are short render-only probes; simulation is manually stepped, so they cannot be converted into gameplay FPS. Startup includes host scheduling and software shader compilation. A production bundle still emits the existing large-chunk warning.

## Reproduce

From the app directory, run `ART_PHASE=before ART_SKIP_BUILD=1 ART_PROFILE_ONLY=1 ART_RENDER_TIMING=1 node scripts/reconstruction-qa.mjs` against a preserved baseline build, then the corresponding `ART_PHASE=after` command. To recreate the baseline build, check out PR17 separately and use the test bridge from this script. Set `CAMP_CHROMIUM` if Chromium is installed outside Playwright. Run profiles sequentially under the same viewport and host conditions.
