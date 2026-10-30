# Performance observations

PR18/main `76b84bc` and this update use preserved minified production builds, Chrome headless shell **156.0.8078.79**, ANGLE SwiftShader, 1536 × 620, DPR1 and the same native spawn camera. Profiles run sequentially, low then high, in a fresh browser for each source version. The final source comparison was run without a competing test suite. Fixed 60 Hz simulation warms the scene; render-only probes call the actual renderer and `gl.finish`. This does not measure sustained gameplay or physical iPhone GPU time.

| Profile | Metric                         |    PR18 | Atmosphere |
| ------- | ------------------------------ | ------: | ---------: |
| low     | Draw calls                     |     237 |        237 |
| low     | Submitted triangles            |  829423 |     736895 |
| low     | Geometry buffer arrays MiB     |   20.17 |      19.84 |
| low     | Image storage estimate MiB     |   49.90 |      52.48 |
| low     | Geometry + image estimate MiB  |   70.07 |      72.32 |
| low     | Requested image/GLB bodies MiB |    8.31 |       8.41 |
| low     | Menu to complete camp ms       |    2553 |       2433 |
| low     | Render + finish median ms (12) |    3.30 |       3.45 |
| low     | Render + finish range ms       | 1.9–5.2 |   1.8–17.3 |
| high    | Draw calls                     |     254 |        254 |
| high    | Submitted triangles            | 1182710 |    1075334 |
| high    | Geometry buffer arrays MiB     |   25.43 |      25.22 |
| high    | Image storage estimate MiB     |   49.90 |      52.48 |
| high    | Geometry + image estimate MiB  |   75.33 |      77.70 |
| high    | Requested image/GLB bodies MiB |   12.77 |      11.86 |
| high    | Menu to complete camp ms       |    1857 |       2163 |
| high    | Render + finish median ms (12) |    2.30 |       7.15 |
| high    | Render + finish range ms       | 1.6–5.6 |   3.1–16.2 |

Raw paired data: [PR18](evidence/performance-before/report.json), [atmosphere](evidence/performance-after/report.json). [Gallery before](evidence/before/report.json) and [after](evidence/after/report.json) retain separate capture-run samples. Timings vary materially between these runs and are not interchangeable with FPS. The 12-probe high sample is slower in this host observation; reduced geometry is **not** evidence of a frame-rate improvement.

## Longer render-cost probe

The [30-sample high-profile diagnostic](evidence/cost-diagnostics/report-high.json) uses the same production renderer. After five render/finish warm-ups, the default scene median is **2.70 ms** (1.4–4.8 ms). Hiding only the sky gives **2.05 ms** (1.4–5.4 ms), an observed difference of roughly **0.65 ms** for the sky in this software context. Disabling foliage coverage has a **3.15 ms** median and a 2292 ms outlier; it does not establish an improvement. Restoring material variants then produces a severe **2066 ms median** software-render stall. The untouched production default also passes the gallery/integration checks in separate fresh contexts. The diagnostic recorded its results, then its process required interruption after the stall.

The variant-switch stall is retained in the raw record and remains unresolved. Previous environment reports also document software-renderer stalls, but that history does not establish this event's root cause. The probe is a diagnostic observation, not a performance-pass certificate. These inconsistent host timings cannot certify sustained phone performance. Geometry/resource comparisons are much more reproducible here than elapsed render time.

## Fixed resource changes

Spawn submissions fall **11.16% low / 9.08% high**, with draw calls unchanged at **237 / 254**. No plant placement is removed. Far cupped leaves keep 56 leaves with fewer sections; the water grid is cheaper. Near detail, the dense understory, all habitat sets and low/high profiles remain. The tree batches keep four-times-per-second bounds/frustum/distance compaction and material/LOD instancing. The sky changes from two draws to one; minor additional batch visibility from crown variation offsets that draw reduction in the complete scene.

The original 1024 × 512 PNG is **120,785 bytes** on disk and approximately **2.67 MiB** as RGBA8 plus mipmaps. Removing the old glow texture offsets part of that; the scene image estimate rises about **2.58 MiB**. The reconstruction GLBs shrink by 17,468 bytes low and 17,472 bytes high. Texture compression is not introduced; existing photographic textures still dominate the roughly 50 MiB image estimate. No runtime authoring dependency, reflection target, SSR, FFT or volumetric raymarch is added. Cloud lookup uses ordinary sphere UVs, avoiding per-pixel trigonometric projection and a longitude derivative discontinuity.

Image estimates assume RGBA8 with mipmaps, not actual driver allocation. Geometry storage sums unique buffer arrays, including parsed geometry not necessarily uploaded in the current view. Their sum is a resource-storage estimate, **not total GPU memory**: shadow targets, antialiasing/framebuffer attachments, programs, driver copies and transient buffers are excluded. The existing directional shadow map remains 1024² low / 2048² high. Resource Timing body totals include cache-served bodies when reported and exclude JS/CSS/HTML. They are not wire-transfer totals.

## Timing and certification limits

The cloud pass and MSAA foliage smoothing have fragment/shading costs even when triangle submissions decrease. Short software-renderer samples show substantial jitter; a diagnostic probe separates the sky and coverage costs rather than certifying a phone speedup. Physical iPhone Safari, sustained frame intervals, thermal throttling, battery use, true GPU memory and Safari memory-pressure behavior remain unverified. High quality should remain under device review before release. The normal bundle retains the existing large-chunk warning.

## Reproduce

From the app directory against each matching preserved build:

```bash
ART_PHASE=before ART_SKIP_BUILD=1 ART_PROFILE_ONLY=1 ART_RENDER_TIMING=1 ART_EVIDENCE=../../docs/tonsai-atmosphere/evidence/performance-before node scripts/atmosphere-qa.mjs
ART_PHASE=after ART_SKIP_BUILD=1 ART_PROFILE_ONLY=1 ART_RENDER_TIMING=1 ART_EVIDENCE=../../docs/tonsai-atmosphere/evidence/performance-after node scripts/atmosphere-qa.mjs
```

Use `ART_COST=1 ART_QUALITY=high` for longer warmed render-cost diagnostics; its sky-hidden/coverage-disabled probes are diagnostic interventions only. Production visuals remain enabled.
