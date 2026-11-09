# Railay Visual Renaissance

Current checkpoint: 4 of 4 — coastal finish implemented, final verification in progress.
Base: main `816ac6912be1c61fe5a03416c726d8bf60c3cc18` (merged PR #27).

Diagnosis (three causes):
1. The southern hero massif is a regularly sampled extrusion with a shallow, regular crown and weak undercuts; surface noise cannot repair its outline.
2. Strong hemisphere light and emissive canopy flatten foliage; the default midday palette separates blue sky, dull water and pale rock instead of establishing coherent warm sunlight/cool shade.
3. Midground crowns repeat broad leaf cards and the cliff's broad faces lack large mineral/recess structure. Detail is distributed across the forest instead of concentrated at the southern coast.

Showcase: existing southern Tonsai beach, cliff-base trail and jungle margin (x -50..15, z 42..108). No geography, walk mesh, gameplay or controller changes.

Completed: inspected camp environment, material/loading ownership, southern cliff authoring and foliage instancing; retained ACES/sRGB pipeline; established a richer golden atmosphere as camp default; removed unconditional Replit development overlay from local Vite configuration.

Baseline: the pinned merged PR #27 build in GitHub Actions. Local Chromium profile sockets are restricted. The dedicated CI benchmark captures main and branch with the same 932x430 DPR1 views, golden preset, static NPC stage and fixed time. Images must be reviewed before claiming visual success.

Resumed from remote `992e789d0925264f939b3f2fe148c810104213b7`. Reviewed the first successful CI comparison (run 42505657837). Corrected the stale midday assertion to require golden by default and retain developer-gated preset overrides, including an ungated midday rejection.

Checkpoint 2: broadened the asymmetric crown and fractured shoulders, deepened upper erosion ledges, and added continuous chalk/oxide/seepage material masks. Both GLBs regenerated without increasing topology or file sizes. Six targeted geometry tests pass, including the 2,299-point walkable body-clearance grid in both shipped LODs. Initial full suite: 192/192 pass. Local Chromium launch was tried once and is blocked by process singleton socket permissions; reuse CI captures. Corrected the benchmark to exercise actual High on two-core CI hosts, anchor the player at each inspection position, and pair native cameras against merged PR #27 rather than its obsolete pre-camera base.

Checkpoint 2 follow-up. Inspected run 42529254861 and its paired reports. The Low jungle camera differed by 0.000045 m in x. Capture v1 inherited warm-up camera and collision-cache state and let auto-recenter override the requested orbit. Capture v2 resets the test-only cache at teleport, clears input, holds manual look and settles 300 fixed frames after asset requests finish. The native boom and 1e-6 camera tolerance remain in use, along with the existing draw, triangle and exact resident-resource guards. Added negative camera/orbit regression coverage. Reviewed run 42529254789. The cliff now shows clearer chalk and mineral relief, with foliage and coastal finish still pending. Local Chromium hit process-singleton socket EPERM, so CI provides the WebGL renders.

Checkpoint 3. Added 17 authored upper-rim and shelf contacts checked against the shipped Low and High limestone. Kept the roots shared between profiles and reused the existing instanced shrub material and geometry. Varied and lowered southern ferns along the cliff approach, with a few new clustered accents outside the trail and cave. Added broken moss and damp mineral shading to the southern rock. Foliage keeps its existing nonblocking behavior. Shoreline finish and exact-head CI evidence are next.

Checkpoint 4. Refined wet sand, translucent turquoise shallows, sand shelf illumination and broken moving swash on the existing continuous surfaces. Added a paired tidal shelf camera and automated framing, quality, memory and render budget checks for the Railay gallery. Seeded the water-trip test's NPC decision provider after the Third-person CI run 42544109011 exposed a random route encounter. The same trip and arrival assertions remain in place. Final CI runs and physical iPhone verification are tracked separately.
