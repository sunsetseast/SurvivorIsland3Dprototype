# Stillwater Balance — measured rendering and retention

Tested runtime: `35b89747b825a4c9eab9b330a89648cbe47804b0`. Actual Chromium **153.0.8010.0 / SwiftShader**, emulated landscape mobile **932×430 DPR1**. Fixed 60 Hz updates between real renderer captures isolate simulation advancement from host software raster cost. These are **not FPS, physical iPhone Safari, thermal or battery measurements**.

The active Low/High samples use the same player-station challenge framing. Exploration views before/after are different and initial asynchronous texture warming changes residency; do not interpret those rows as a paired optimization comparison. Character/equipment instances stay in the scene even if outside the camera frustum. Submitted triangle counts include zero-scaled unplaced stack instances.

| Sample | Draw calls | Submitted triangles | Resident geometries | Textures | Active array bytes | Ownership entries | Tracked listeners | Active scenes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| exploration-low | 106 | 269,776 | 77 | 8 | 10,078,356 | 120 | 35 | 1 |
| active-low | 93 | 263,178 | 90 | 11 | 10,617,708 | 130 | 15 | 1 |
| active-high | 93 | 647,222 | 102 | 11 | 12,770,020 | 142 | 15 | 1 |
| retry-0 | 93 | 647,222 | 102 | 11 | 12,770,020 | 142 | 15 | 1 |
| retry-1 | 93 | 647,222 | 102 | 11 | 12,770,020 | 142 | 15 | 1 |
| retry-2 | 93 | 647,222 | 102 | 11 | 12,770,020 | 142 | 15 | 1 |
| retry-3 | 93 | 647,222 | 102 | 11 | 12,770,020 | 142 | 15 | 1 |
| exploration-high-after-retries | 45 | 566,990 | 61 | 11 | 12,230,668 | 132 | 35 | 1 |

## Retention result

Four complete High-quality competition/retry cycles retain the same **102 GPU geometries, 11 textures, 142 ownership entries and 15 tracked listeners**, with one active scene. Switching to another preview cancels the challenge, restores the original movement UI and releases the temporary competing roster. Returning to camp restores the original runtime/provider/NPC/memory identities and exact source instance/pose. The separate existing Challenge Beach regression additionally tests repeated configuration replacement and three camp round trips.

The same five instanced draw groups serve all eight dynamic stations. Geometries/materials are shared, disposed on configuration/quality departure, and no buffers or materials are allocated per animation frame. Platform/object/counterweight transforms read the fixed-step simulation. The world scene subscribes only to control-ownership changes; HUD revisions do not rerender the environment. No physics engine, new model/texture library or package dependency was added.

## What these numbers mean

- Draw calls and triangles are `WebGLRenderer.info.render` submissions from actual rendered frames.
- Resident geometry/texture counts are `WebGLRenderer.info.memory` resource counts. **They are not VRAM bytes.**
- Active array bytes sum scene geometry attribute/index arrays, including hidden retained player geometry. They are a CPU-side array estimate, not a heap or GPU memory profile.
- Ownership entries count resource references retained by the existing scene lifecycle owner, not memory bytes.
- Listener instrumentation counts matching window/document pointer, keyboard, blur, visibility and survivor events. The active challenge replaces exploration listeners; different modes have different valid counts.
- Equivalent retries, rather than unlike views, establish the retention plateau. No existing test budget or threshold was loosened.

Raw samples and checks: [browser-report.json](evidence/browser-report.json). Source manifest: [runtime-manifest.json](evidence/runtime-manifest.json). The earlier complete integration checkpoint is retained separately as [integration-checkpoint.json](evidence/integration-checkpoint.json); final review uses browser-report.json and the final gallery.
