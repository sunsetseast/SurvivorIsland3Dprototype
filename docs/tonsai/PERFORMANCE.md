# Tonsai rendering evidence

Renderer: Chrome 142 / ANGLE SwiftShader, headless host browser, 1280 × 900 at DPR 1 unless a phone viewport is explicitly selected. **Not physical iPhone Safari.** Browser viewport emulation does not certify real device memory, thermals, sustained FPS or touch feel.

## Matched cameras

| View | Main calls / triangles | Draft calls / triangles |
| --- | ---: | ---: |
| 01-aerial | 175 / 628,624 | 158 / 996,535 |
| 05-cliff-hero | 139 / 558,176 | 171 / 1,081,635 |
| 10-canopy | 150 / 731,066 | 156 / 1,369,063 |
| 11-understory | 101 / 607,574 | 116 / 1,177,912 |
| 17-low-quality | 187 / 443,404 | 200 / 627,913 |

The same aerial submits 37.0% fewer triangles in low quality. Draw calls increase for this low-mode snapshot; no blanket draw-call improvement is claimed. Across the final high captures the largest recorded submission is 1,369,063 triangles. Counts include the surrounding peninsula and normal scene objects, not just new assets.

## Host timing samples

| Camera | CPU time around render + finish calls (ms) |
| --- | --- |
| 01-aerial | 3.40, 2.00, 1.40 |
| 17-low-quality | 3.60, 2.80, 7.30 |

These are three single-frame host samples. WebGL/Chromium can defer GPU work even around `finish`; screenshot capture is also affected by software rendering, compilation and competing processes. They are not sustained frame rates, GPU timer queries or a physical-phone benchmark. Raw per-view CPU submission durations remain in the JSON.

## Mesh / texture accounting

- Each high cliff formation: 105,000 triangles; each low formation: 33,600. Both LODs ship in the same 6,661,140-byte GLB.
- New surface textures: two 1024² JPEG maps (diffuse and OpenGL normal), plus an original 512² canopy alpha atlas.
- Static canopy occlusion: 512² R8. Depth/mud/lagoon water field is inherited from the terrain.
- No new HDRI cube, screen-space AO/reflections, 4K texture, peninsula shadow-map pass or post-processing chain.

Final capture: visible-scene CPU geometry attributes/index buffers 13,021,970 bytes; conservative uncompressed RGBA-with-mips texture estimate 28,311,573 bytes.
Reentry / gameplay: visible-scene CPU geometry attributes/index buffers 12,356,386 bytes; conservative uncompressed RGBA-with-mips texture estimate 29,709,675 bytes.

Texture estimates assume RGBA and mip levels, including for formats such as R8, so they can overcount. These scene scans can also miss retained but currently unmounted LOD geometry. They are not driver allocation readings or peak GPU memory certification. `gl.info.memory` counts are recorded per capture. Texture maps used through custom shader uniforms are explicitly included in the scans.

The final WebGL run reports no shader/page errors. The disposal test attaches listeners to actual world resources before scene exit; see the exact geometry/material/texture disposal counts in `gameplay-report.json`. Asset-failure tests block the main new GLB, both rock maps, canopy image and original botanical/geology requests. The coarse new cliff silhouettes and generated botanical/material fallbacks remain available.

## Mobile tradeoffs

High quality costs substantially more than main in geometry and texture memory. Low mode reduces vegetation candidates and near-detail radii, uses the coarse cliff meshes and reduces DPR. It retains all boulders with player collision to avoid invisible obstacles. Litter and small plants are distance-selected. Both cliff LODs are downloaded on entry; separate streaming and KTX2/mesh compression are future optimizations.

Vite production build passes with the inherited large-chunk warning. The lazy coastal/height-field bundle remains large. Physical iPhone Safari profiling is required before calling these budgets certified.
