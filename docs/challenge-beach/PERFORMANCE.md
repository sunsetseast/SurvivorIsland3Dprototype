# Challenge Beach measured performance

Runtime: `831e47400c06f120fa7d73791ba2eea4d8cfbe40`. [Successful WebGL run](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42068507831). [Original report](evidence/browser-report.json) · [Machine-readable baseline and budgets](PERFORMANCE_BASELINE.json).

Chromium 156 / SwiftShader, emulated mobile landscape **932 × 430, DPR1**. Low and High use the same four inspection poses. Simulation updates are advanced manually at 60 Hz between genuine renderer captures to avoid conflating host raster cost with locomotion. **No physical iPhone FPS, thermal, battery or Safari graphics certification is claimed.**

| Selected setup | Draw calls Low / High | Triangles Low / High | Active geometry arrays MiB Low / High | Resident GPU geometries Low / High | Resident GPU textures Low / High |
| --- | ---: | ---: | ---: | ---: | ---: |
| beach-obstacle | 22 / 22 | 190,182 / 567,714 | 7.98 / 9.62 | 33 / 79 | 8 / 10 |
| ocean-relay | 59 / 59 | 224,688 / 603,204 | 7.93 / 9.59 | 57 / 71 | 8 / 10 |
| jungle-net | 91 / 91 | 249,292 / 628,360 | 8.19 / 9.95 | 66 / 79 | 9 / 10 |
| individual-balance | 92 / 92 | 258,294 / 640,482 | 8.90 / 10.87 | 67 / 79 | 10 / 10 |

The array-byte column sums active geometry attribute/index typed-array lengths. It is not total JavaScript heap or physical VRAM, excludes instance matrices and texture storage, and can count interleaved views separately. Renderer memory fields are resident resource **counts**, not byte totals. Camera culling changes draw/triangle counts; these four views are an initial reproducible envelope, not an exhaustive worst case.

GPU uploads are lazy: previously inspected views and Low/High geometry can remain resident until scene departure. This explains rising initial resource counts without implying a leak. Equivalent-state tests after repeated switching are the relevant cleanup check.

## Cleanup and existing-renderer comparison

Three complete selection cycles plateau at **80 geometries / 11 textures / 33 tracked global listeners**, with identical **88 draws / 623,830 triangles** in the repeated normal-player view. Three camp returns plateau at **148 geometries / 26 textures / 48 listeners**. Peak detailed-scene count is **1**. Lifecycle instrumentation observed **1,769 geometry, 259 material, 150 texture and three render-target disposals** over the run, including scene changes and quality/configuration replacement.

The same runner's camp departure sample was 163 calls / 614,879 triangles / 163 geometries / 31 textures in Low; repeated High camp returns were 137 calls / 273,780 triangles / 148 geometries / 26 textures. These different poses/locations are context, not matched before/after benchmarks. [PR22 camp spawn measurements](../tonsai-art/FINAL_PERFORMANCE.md) provide another renderer reference; no percentage improvement is inferred across unrelated camera poses.

## Initial review budgets

The observed fixed-view maxima are 92 draws, 258,294 Low triangles, 640,482 High triangles, 80 resident geometries and 11 resident textures. Initial review ceilings derive from those measurements with about 15% headroom and upward rounding:

| Metric | Low ceiling | High ceiling |
| --- | ---: | ---: |
| Draw calls in saved views | 110 | 110 |
| Triangles in saved views | 300,000 | 740,000 |
| Active geometry attribute/index arrays | 11 MiB | 13 MiB |
| Resident GPU geometry count after repeated selection | 100 | 100 |
| Resident GPU texture count after repeated selection | 13 | 13 |
| Simultaneous detailed scenes | 1 | 1 |

These are measured-scope review thresholds, not hardware FPS guarantees. CI currently enforces resource/listener plateaus and the single-scene invariant; fixed-view budget comparisons are documented for subsequent changes. Measurements stage the **four current prototype contestants**. Larger multi-tribe rosters require fresh profiling before increasing the budget or declaring mobile suitability.

Equipment is merged into one opaque material/geometry per selected configuration. Trees and understory are instanced; foliage uses alpha testing or opaque geometry. The ocean uses world-space waves without water physics. Existing 1k mineral/sand/litter assets are reused. No new postprocessing, physics dependency, shadow light or uncompressed texture asset was added.


## Continuation cleanup verification

[Successful cleanup run](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42113512588) at `7803dc698f9f531cb0d90f9d684407e6c8c277be` rechecks the four fixed Low/High views above: every draw, triangle, active-array-byte and resident GPU count matches the original table. [Raw follow-up report](evidence/cleanup-browser-report.json) · [Artifact/report hashes](evidence/cleanup-provenance.json).

The collector now forgets disposed, detached assets instead of retaining their CPU geometry arrays until scene departure. Still-live/re-uploaded resources and resources awaiting disposal remain owned for the final sweep. Ownership-map entries are counts of geometry/material/texture/target references, not a heap-byte measurement.

- All three equivalent High main-course cycles remain at **114 ownership entries / 80 GPU geometries / 11 textures / 33 listeners**. The eight fixed setup/quality samples show 102 ownership entries in Low and 114 in High.
- All three camp returns remain at **322 ownership entries / 151 GPU geometries / 26 textures / 48 listeners**, with 201 calls / 1,002,744 triangles in this run's returned camp view. The harness now advances at least one complete collector interval (12 frames rather than three) before sampling. These camp camera/settling conditions differ from the original run; no matched before/after camp rendering claim is made.
- Four new behavioral tests cover released geometry/material/texture listeners, attached disposed assets, delayed disposal and 64 replacements including reused assets. All **138 unit tests** and **10 WebGL groups** pass.

This adds CPU ownership-reference coverage to the original GPU/listener plateau checks. It does not measure total JavaScript heap, physical VRAM or physical-device FPS.
