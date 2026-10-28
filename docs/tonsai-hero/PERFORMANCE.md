# Measured performance and limits

Measurements are real Three.js renderer counters from Chrome 142 headless shell / ANGLE SwiftShader at 1280×900, DPR 1. **They are not physical iPhone FPS.** Both versions use the same player-accessible eye position (-670, terrain + 1.7, -820), look target (-313,77,-623) and 62° capture FOV. Main baseline is commit `807d85c5a1ddca8000b01f9621c0d5f898de3b82`.

| Quality | Main calls / triangles | This PR calls / triangles | Triangle change |
| --- | ---: | ---: | ---: |
| high | 214 / 1,241,579 | 218 / 1,063,473 | -14.3% |
| low | 144 / 514,783 | 147 / 479,525 | -6.8% |

A separate six-view sweep recorded 1,116,915 triangles for the same high benchmark after other viewports, versus 1,063,473 in the final paired run: approximately **10–14% below main**, rather than a claim that all camera histories give one fixed number. Low recorded 479,525, about 7% below main. Camera history, frustum selection and LOD settling affect counters. The raw reports and the sweep stdout are committed.

`hero-environment-qa.mjs` advances LOD callbacks at a fixed 0.8s inspection step with every callback seeing the captured camera. This avoids player/overview camera ownership contaminating the counts. Actual gameplay checks run the real controller separately. High/low budget checks reject counters above the matched main baseline, and low must contain a visible forest.

## Asset and rendering controls

- Divider mesh: 61,832 submitted high triangles; 17,146 low (source budgets 62k and 28%). PR11's corresponding mesh was 104,995 / 33,582. Five peak masses and shelves replace the old nearly level cap.
- Separate karst files: high about 4.5MB; low about 1.36MB. Low-only entry was network-traced: `karsts-low.glb`, botanical, fern and existing geology loaded; **no high karst or scanned talus request**. Quality switching can subsequently fetch the other file.
- Far canopy variant: 96 leaf triangles + 80 wood triangles, versus 1,600 leaves + 868 wood near. Ficus and palm also have distinct reduced meshes. Ground ferns get detailed scanned meshes only near the viewer.
- Geometry and atlas variation is real, not just scaled clones. Shared meshes/materials are instanced. Per-instance frustum/distance selection runs at coarse intervals after the final game camera is set; ground detail has a short radius.
- The high-quality scan appears only on selected larger near-showcase boulders; low uses the original inexpensive collision-compatible rock geometry. Vines are limited to 63 authored shelf gardens (32 low), rather than every crest tree.
- No screen-space effects, dynamic peninsula shadow maps, displacement tessellation, HDR cubemap or post-processing passes. Contact shading is a static R8 canopy field plus baked rock vertex occlusion.
- Camera raycasts use approximately 1,800-triangle divider and existing NW proxies. Visible high meshes no longer enter the per-frame camera blocker list.
- High-resolution sources and editable `.blend` files are offline repository content. The original PR11 combined GLB is a source dependency, not a runtime import. The production bundle includes both quality files but the browser requests only the chosen one.

## Timing and memory honesty

The JSON includes synchronized host render timings, initial entry wall time, CPU attribute bytes and an RGBA+mipmap texture estimate. These estimates do not measure GPU allocations, sustained frame rate, thermal throttling, battery use or Safari memory pressure. The 932×430 phone-layout low screenshot's live third-person frame recorded 623,553 triangles from a different camera; do not compare it with the fixed benchmark as if it were the same view.

Physical iPhone Safari remains **unverified**. Existing large application/height-grid bundle warnings remain in the build log. No claim of a universal mobile FPS target or marketing-art certification is made.
