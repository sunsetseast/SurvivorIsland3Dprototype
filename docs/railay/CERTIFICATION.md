# Railay implementation certification — draft review

**Base:** `90bb37a8ee3f56b3a3f23fe070680a7f2603faef` (latest main checked before submission). **Date:** 27 October 2026. **Disposition:** implemented, tested draft; not merged or deployed. The original `SurvivorIsland2025` repository was read only.

## Verified outcomes

- One connected, metre-scale Railay terrain, OSM coastlines / mapped islets, four contrasting coastal regions, authored limestone massifs, enclosed lagoon and rock shelter.
- Branching / rooted tropical broadleaf trees, coastal palms and pandanus, eastern mangroves, local fern understory, depth-coloured coastal water and original procedural assets.
- Third-person traversal through all four coastal areas, water / slope limits, reset, camera obstruction, region starts, high / low quality, overhead view, live minimap and expandable map.
- Existing camp and Tribal Council remain separate and playable. Planning anchors add no Survivor structures.

## Checks and evidence

| Check | Result |
| --- | --- |
| Automated application suite | **64 / 64 passed**, including 16 new world tests; [log](evidence/tests.txt) |
| TypeScript application check | **Passed**, zero diagnostics; [log](evidence/typecheck.txt) |
| Production game build | **Passed**, 665 modules / 10.73 s on host; [log](evidence/build.txt) |
| Real WebGL browser flow | **Passed**, zero application errors; [report](evidence/webgl-report.json) / [run](evidence/browser-run.txt) |
| Coast-to-coast navigation | **Passed** for Tonsai, West, East and Phra Nang using the actual substepped movement solver; [routes](evidence/reachability.json) |
| Lagoon walking reachability | **Intentionally separate**; steep descent awaits climbing |
| Failed asset requests | **Passed**: deliberately blocked geology GLB and both botanical textures; procedural cave and generated foliage masks remain rendered; [report](evidence/loading-report.json) |
| Scene resource release | 142 geometry, 10 material and 3 mapped-texture disposal events observed; water depth texture has separate owned cleanup |
| Menu regression | Railay → camp → Council → Railay passed; [camp](evidence/regression-camp.jpg) / [Council](evidence/regression-tribal.jpg) |
| Required visual evidence | 20 required views/comparison plus expanded map; [index](evidence/README.md) |
| Geographic comparison | Actual overhead rendering paired with ODbL vectors; [comparison](evidence/20-geographical-reference-comparison.jpg) |
| Physical iPhone / Safari | **Unverified**; 844 × 390 viewport is emulation only |

The browser movement check advances the real player for 100 fixed steps and measures **5.17 m** displacement, then verifies reset. Manual browser stepping uses the current R3F store state, avoiding stale frameloop values after menu / quality updates. The separate route search reaches **112,953** traversable 6 m samples from West; this is a connectivity diagnostic, not a geographic accuracy score. It records 277 lattice steps to Tonsai, 80 to East and 127 to Phra Nang, with full coordinates for review.

## Mobile-oriented measurements

Measurements come from **Chromium 142 + ANGLE SwiftShader**, not an iPhone. They describe actual submitted work, not device FPS.

Same Railay West aerial camera, 1280 × 900 viewport, DPR 1:

| Measurement | High | Low |
| --- | ---: | ---: |
| Draw calls | 170 | 122 |
| Submitted triangles | 537,838 | 263,072 |
| Retained WebGL geometry objects at capture | 120 | 122 |
| WebGL texture count at capture | 6 | 6 |
| Compiled programs | 9 | 9 |
| Host render-command submission | 4.0 ms | 7.4 ms |

Submission times are single host samples with software rendering; low mode must **not** be claimed faster from them. The reliable comparison is less submitted geometry / fewer draw calls. Retained object counts and small atlas dimensions do not decrease with low quality.

Other high-quality camera views span **28–289 draw calls** and **186,598–856,172 triangles**. The world is substantially cheaper in close views with limited visibility than in an entire-peninsula overview. Overview requests periodic updates instead of a continuous loop. These budgets still need physical iPhone frame-time / thermal / Safari memory validation before readiness is claimed.

At the final loaded entry, distinct CPU mesh attribute/index storage totals **7,836,880 bytes** (~7.47 MiB). Mapped texture RGBA + mip storage is estimated at **3 MiB**, plus the 601² RGBA depth texture (~1.38 MiB, no mip chain) and transient 32² leaf fallbacks. These are buffer estimates, not driver GPU allocation or total JS heap measurements.

Host cold world entry through loaded geology took **12.52 s** under software WebGL. World code/data is requested only from Explore Island. The build reports a **3,737 kB raw / 1,058 kB gzip** lazy terrain chunk, a ~19 kB world renderer chunk, ~45/25 kB botanical atlases and a 162 kB self-contained geology GLB. Existing common Three.js code remains in the shared bundle. Vite's >500 kB chunk warning remains visible; the baked geographic field is the main new payload. Binary height-field packaging is a possible future download/heap improvement; it is not implemented here.

No new server dependency, paid asset host, desktop player setup, Blender installation for the user or external runtime map API is required. Assets ship with the browser game. Blender and Pillow are authoring tools only.

## Fidelity and limitations

Coastal geometry is source-derived; elevations and rock art are not survey certified. The [implementation report](IMPLEMENTATION.md) identifies every major authored elevation/closure and the far mainland context. Beach widths, terrain surfaces, plant species forms and caves are idealized. Terrain / lagoon shorelines use a 6 m lattice and distant terrain uses 12 m LOD. The original concept's photoreal finish is not reproduced: this is a stylized game environment, with further cliff-surface / habitat art work appropriate before describing it as a final cinematic reconstruction.

The lagoon has no walking descent, individual tree trunks are decorative, water has no swimming or tide physics, and the far mainland context is not traversable. Hard bounds exist at the far terrain extraction edges. Camp / Council integration, persistent streaming, idols, camps and challenge equipment remain future work.

Nothing was merged, deployed or published as a website. This certification supports review of the draft implementation; it does not certify physical iPhone performance or survey-level Railay fidelity.
