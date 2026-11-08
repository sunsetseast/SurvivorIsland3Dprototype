# Railay Visual Renaissance

Current checkpoint: 1 of 4 complete — atmosphere and regression correction.
Base: main `816ac6912be1c61fe5a03416c726d8bf60c3cc18` (merged PR #27).

Diagnosis (three causes):
1. The southern hero massif is a regularly sampled extrusion with a shallow, regular crown and weak undercuts; surface noise cannot repair its outline.
2. Strong hemisphere light and emissive canopy flatten foliage; the default midday palette separates blue sky, dull water and pale rock instead of establishing coherent warm sunlight/cool shade.
3. Midground crowns repeat broad leaf cards and the cliff's broad faces lack large mineral/recess structure. Detail is distributed across the forest instead of concentrated at the southern coast.

Showcase: existing southern Tonsai beach, cliff-base trail and jungle margin (x -50..15, z 42..108). No geography, walk mesh, gameplay or controller changes.

Completed: inspected camp environment, material/loading ownership, southern cliff authoring and foliage instancing; retained ACES/sRGB pipeline; established a richer golden atmosphere as camp default; removed unconditional Replit development overlay from local Vite configuration.

Baseline: unchanged main build retained locally. Local Chromium profile sockets and shared browser localhost access are restricted. The dedicated CI benchmark captures main and branch with the same 932x430 DPR1 views, golden preset, static NPC stage and fixed time. Images must be reviewed before claiming visual success.

Resumed from remote `992e789d0925264f939b3f2fe148c810104213b7`. Reviewed the first successful CI comparison (run 42505657837). Corrected the stale midday assertion to require golden by default and retain developer-gated preset overrides, including an ungated midday rejection.

Remaining: authored hero geometry/material and selective foreground foliage; image review/refinement; final performance, cleanup/navigation and CI verification.

Continuation: check this branch's draft PR and latest Actions run; download `railay-renaissance` artifact; inspect three baseline views and corresponding branch views. Continue checkpoint 2 in `environment/limestone.ts`, `Landmarks.tsx`, `Environment.tsx`, `assets.ts` and existing offline GLB authoring. Do not change controls or collision geography. Commit/push at each of the remaining three major checkpoints.
