# Tribal Council certification

Status: implemented and browser-verified draft. Not merged, deployed or published. Physical iPhone Safari performance remains unverified.

## Access

Start screen → **Explore Tribal Council**. The opening runs drone → ruin detail → Jeff Probst standing at the host terrace → survivors entering → staggered seating. It ends seated; **Stand up and explore** enables the shared third-person controls. **Skip intro** reaches that same seated handoff. **RESET** returns to the start of the jungle arrival path. **MENU** returns to the start screen; **Return to the Island Camp** retains the existing camp experience. SOUND is opt-in.

A standalone HTML preview can be built from the checked-out PR head with `pnpm --filter @workspace/survivor-camp-prototype preview:standalone`. `dist/standalone/preview-manifest.json` records the source commit and SHA-256. It bundles the same application into one HTML file; it is not a separate mockup. A WebGL-capable browser/HTML preview is required. No hosting operation is part of this PR.

## Verification

- TypeScript passes; production Vite build passes (existing large main-chunk warning remains).
- 17 automated tests pass, including the original camp tests and new locked-layout, alternating stagger, route, anti-tunnelling, staging-anchor and continuous-intro tests.
- All four arrival/voting/jury/exit routes traverse both directions through the actual Player controller. Accelerated fixed game frames are used between real GPU captures; movement tests are not device-FPS measurements.
- Natural intro completion, gated controls, seated handoff, skip/reentry, joystick, actual touch events/release, run/orbit, booth camera obstruction, exact grounding and menu/island transitions pass. 54 browser check records, zero page/console errors.
- Camp regression WebGL harness passes conversations, response choices, approaches, touch controls, camera recovery, all landmark activities and autonomous updates. Its new result is retained as `evidence/camp-regression.json`; original camp screenshots were preserved.
- Legacy world-check script passes 120 solid-collision checks and all six island topology assertions.
- 20 genuine WebGL screenshots include all 11 requested subjects, the four requested viewport sizes and six opening/staging frames. See `evidence/`. Cinematic-camera captures are labeled in the harness; they are actual game renders, not generated art.

## Performance findings

Chromium 153 with ANGLE/Vulkan SwiftShader software rendering; DPR 1. These are synchronous wall-time draw/readback samples (8 draws per viewport, one shadow refresh per five draws), not sustained FPS and not an iPhone GPU benchmark. The rest of the game clock is stopped during the sample. Capture-specific camera/frustum changes affect the counts.

| Viewport | Median draw + readback | Sample range | Last draw calls | Last submitted triangles |
| --- | --- | --- | --- | --- |
| 375 × 812 | 649.2 ms | 601.8–758.1 ms | 123 | 286,970 |
| 430 × 932 | 377.2 ms | 306.7–454.2 ms | 52 | 204,012 |
| 844 × 390 | 1100.0 ms | 702.1–2035.3 ms | 170 | 353,186 |
| 1280 × 800 | 4128.5 ms | 2576.0–4881.2 ms | 159 | 345,874 |

Initial testing showed excessive off-screen work. Spatial foliage batches, lighter frond spines, fewer unused ground triangles and selective shadow casting reduced the landscape sample from roughly 909k to 353k submitted triangles (including shadow passes). This does not establish an iPhone FPS gain; the software renderer timings remained slow and noisy. Static detail was retained. Dynamic shadows update around 6Hz; point lights cast no shadows. The scene adds five 512px procedural surface textures and bounded sparks/smoke. Main rendering remains at the existing 1.5 DPR cap.

Before claiming smooth iPhone Safari performance, run the standalone preview on the actual phone in landscape, walk the full route and inspect native touch, safe areas, thermal behavior and sustained frame time. Device certification is the principal remaining limitation.

## Visual review and limits

All major areas were inspected in actual WebGL renders. The review corrected entrance and gallery clearance, an urn-adjacent path start, a reversed host chair, unattached relief placement, initial camera readiness and portrait HUD overlap. Night exposure is intentionally restrained. The style matches the existing stylized prototype; Jeff is an original stylized blue-shirt host model, not a photoreal scan. Seating uses procedural posing, and the cast is the four current contestants plus the player, not a full merged tribe. All twelve alternating stump slots and twelve juror anchors are reserved.

The architectural theme is original and fictional. Focused reference research informed the result; it does not certify a season-by-season replica or exhaustive reference catalog. Audio is synthesized ambience, not location-recorded wildlife. Fine foliage does not impede the camera, and low-poly proxies represent major obstructions. Walking through minor decorative leaves/vines is allowed. No voiced host dialogue, vote UI, ballot logic, elimination or jury decisions are implemented.

## Recommended next phase

First verify sustained performance and touch feel on the target iPhone. Then add a presentation adapter from the original season engine's named Tribal beats to these anchors, retaining its 2D voting/event interface. Improve sit/stand transitions and stage the attending tribe/jury through that adapter; do not create another voting simulation.

Reference architecture and data boundaries: [DESIGN.md](DESIGN.md).
