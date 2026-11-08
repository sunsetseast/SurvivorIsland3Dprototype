# Performance measurements

The implementation adds no animation/physics dependencies, textures, skeletons or rendered meshes. Both graphics modes use the same bounded controller and pose work. Collision uses five lens-envelope queries against local cached solids, terrain boom sampling, instance bounds and authored equipment/cliff proxies. Wide authored cinematic cameras retain their staged behavior.

## Measurement methods

- `scripts/third-person-qa.mjs`: actual Chromium software WebGL at 932×430, DPR 1, trusted inspector touch sequences. Fixed 60 Hz updates isolate simulation from software rendering. Low and High modes record draw calls, triangles, geometry, texture and ownership counts plus 180 camera CPU samples and contestant animation timings. These are CPU timings on a CI runner, not iPhone FPS.
- `scripts/third-person-benchmark.mjs`: reproducible local Node CPU-only benchmark over the full 416-piece course and eight traversal pose updates per frame. Its 539 post-warmup samples measured camera mean 0.046 ms / P95 0.118 ms, eight poses mean 0.017 ms / P95 0.032 ms. This excludes DOM, renderer and GPU.
- Repeat checks compare the entire scene geometry set, owned resources and listeners exactly. GPU geometry/texture residency must not grow; these renderer counters depend on which visible geometry has actually been submitted. Hub teardown requires zero owned resources, geometries, scenes and canvases plus a destroyed old context. The legacy Challenge Beach fixture additionally renders the complete owned scene once before strict GPU count equality, then restores every original visibility/culling flag and camera view. This normalizes lazy upload residency without changing the game or its resource assertions; run `42491846301` passes.

## Optimization evidence

The first browser implementation spent 4.28 ms average / 4.5 ms P95 on camera queries. Replacing merged equipment triangle casts reduced the average to 2.31 ms; the remaining merged cliff triangle queries were then replaced with conservative per-mass bounds. Final browser measurements from source `bfb1416c` / run `42419275087`:

| Measurement | Low | High |
| --- | ---: | ---: |
| Camera CPU mean, 180 frames | 0.057 ms | 0.029 ms |
| Camera CPU P95 | 0.100 ms | 0.100 ms |
| Mean contestant animation update | 0.0128 ms | 0.0056 ms |
| Initial sampled draw calls | 82 | 82 |
| Initial sampled triangles | 225,650 | 603,182 |
| Active CPU geometry bytes | 8,873,244 | 10,601,204 |
| Scene geometry objects | 89 | 89 |
| Owned resources / relevant listeners | 127 / 38 | 127 / 38 |

Later CPU-sampling frames render 70 calls / 215,054 triangles in Low and 82 / 603,182 in High; culling/competitor progress changes submission counts. Low repeat scenes retain exactly 89 scene geometry objects, 127 ownership entries and 38 listeners. Renderer-resident geometry/texture counts decrease from 68/11 after retry to 65/9 after fresh entry; no repeat growth. Hub disposal has zero owned resources/geometries/canvases/scenes and a lost old context. The renderer retains one fallback-texture bookkeeping entry on the destroyed context; it is not a surviving world resource.

Artifact `13592638459`, SHA-256 `dcf8be42599df3ff6ed9a7331b7475fca4f3c8206c8b46f529d5d4c2094f6caf`; raw samples are in `evidence/browser-report.json`. The final camera mean is over 98% below the first measured implementation, with no new rendered assets. High's smaller mean is runner measurement variability, not a claim that High is intrinsically faster.

Physical iPhone 17 Pro Max Safari FPS, thermal behavior and long-session memory remain for the practical iPhone test guide. Software-renderer wall time must not be presented as device FPS.
