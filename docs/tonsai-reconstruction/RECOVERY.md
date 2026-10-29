# PR18 recovery audit — October 29, 2026

## What survived

GitHub's existing `feat/tonsai-environment-reconstruction` branch pointed to `651ab3629cdedcfbaf4ac178397cca32aa370ea0`, an earlier coastal-environment implementation already ancestral to current main. It did not contain the new camp reconstruction. At recovery, GitHub had no open/draft PR for this task and PR18 did not yet exist.

The later Work checkout survived with uncommitted changes on local `feat/tonsai-camp-reconstruction`, based on merged PR17 (`5249bf253db78a0808ffe2ffe348155ca7a5188e`). It contained the reconstructed shelter/botanical exports and authoring scripts, habitat placement, water/terrain/limestone integration, navigation/surface manifests, tests, documentation and before/after WebGL evidence. A separate older checkout contained PR17 work and was not used as the reconstruction source.

The preceding session had also uploaded 141 Git objects, recorded in its local upload checkpoint, without advancing the task branch or opening its PR. Those existing objects were reused when their content hashes matched. This continuation preserved the recovered work as a local checkpoint commit before making further changes.

## Work completed during continuation

- Independently rechecked the implementation, assets, screenshot evidence, test results and branch ancestry. No original work was discarded or rebuilt from main.
- Fixed inspection-camera capture ordering. Late-mounted foliage culling had seen the player camera during eye-height and aerial diagnostics, creating falsely bare views. Corrected both baseline and reconstructed diagnostics against their preserved production builds; native Player-camera evidence remains separate.
- Reduced high-detail tree/understory ranges while retaining habitat placement. The high spawn view falls from 1,361,902 to 1,182,710 submitted triangles, approximately 13%. This is a scene-submission comparison, not a device FPS claim.
- Fixed low-export simplification that erased every rope lashing. Both shelter exports now retain joint bindings; the separate low GLB is 2,980,604 bytes. Added an independent packed-geometry regression assertion.
- Rebuilt the affected assets, recaptured final low/high evidence, and refreshed unit/type/build, connected-world, touch-control and performance verification. Retained the completed 50-leg exploration evidence because trail, movement, candidate, navigation and interaction source did not change during this continuation.
- Reused the existing remote branch, with a fast-forward from its older ancestor, for one draft PR targeting current main. No changes were made to SurvivorIsland2025.

## Review limits

The final gallery is genuine WebGL gameplay/diagnostic evidence, not generated imagery. Rendering and input were exercised in Chromium with software WebGL. Physical iPhone Safari, sustained GPU time, thermals and battery behavior remain unverified. Foliage aliasing/repetition, dense-canopy darkness, secondary props and the procedurally authored headland remain visible art limitations. These are documented in REPORT.md and PERFORMANCE.md rather than treated as passed by unit tests.
