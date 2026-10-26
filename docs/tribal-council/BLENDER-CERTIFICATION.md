# Blender sanctuary certification

## Result and integration boundary

Tribal Council now uses an executed Blender production pipeline and nine original asset modules: a two-tier tiled voting roof, remeshed elephant guardian, carved naga terminal, root-wrapped column, ceramic urn, fallen relief/rubble, fern cluster, hanging vine and lotus wall relief. The kit replaces the procedural voting roof and elephant sculptures; other modules compose the ruin edges and jungle understory. Existing prang/chedi geometry, temple layout, attached voting walls, furniture, characters and scene interactions are retained and upgraded, rather than relabelled as Blender assets.

The palette moves to terracotta, aged sandstone, damp stone and dark soil. Irregular missing flagstones expose soil; moss, fallen leaves, roots and ferns connect masonry to the jungle. Walking lanes, seating, host and voting areas retain stone. A visible sanctuary torch and a reallocated existing point light highlight the main prang. Cool ambient/moon fill is restrained. There are still six point lights and one shadow-casting directional light; the new props add no real-time lights. This is stylized original technical art, not scanned or photoreal temple reconstruction.

**Branch strategy:** latest main was `82a3c84358ddf5c995df7d9bccffaaaf26d612b3` (PR #5 merged). PR #6 remained open/draft at `1cc2f87d3d051558b34426dc9a142784f0a54720`. This successor explicitly includes that exact prerequisite content: corrected corridors/exit, grounded paving, character polish and elimination rehearsal. No changes were silently taken from another branch; PR #6 itself remains untouched. Review the combined successor, or merge #6 first later and let GitHub reduce this PR's diff. This PR targets main, remains draft, and does not merge or deploy either PR. `SurvivorIsland2025` was read only and is unmodified.

## Executed asset pipeline

Official **Blender 4.5.3 LTS**, Linux x64, build `67807e1800cc`; the downloaded archive matched Blender's official SHA-256. Execution used `BLENDER=/tmp/blender-4.5.3-linux-x64/blender node tools/blender/regenerate.mjs`, which runs headless Blender, saves an editable packed `.blend`, exports both real GLBs and validates them. Regeneration was executed repeatedly during material/UV review. A seeded build is structurally reproducible; Blender's binary serialization can vary, so each run writes fresh output SHA-256s rather than claiming byte-identical exports.

| Export | Triangles in nine source modules | Materials | Atlases | Download |
| --- | ---: | ---: | --- | ---: |
| Full | 33,198 | 2 | 2 × 1024² | 6.88 MB |
| Low | 16,734 | 2 | 2 × 512² | 2.46 MB |

Each GLB embeds its textures, normals, UVs and weather vertex colors. The manifest records both binary hashes and the generator hash; stale exports fail validation. The source `.blend` contains the full quality kit before fallback decimation. Runtime modules own placement/loading/instancing, while Blender owns source mesh and atlas production. See [pipeline instructions and architectural references](../../tools/blender/README.md) and [actual exported budgets](blender-evidence/asset-budgets.json).

## Validation

- **30 automated tests pass:** real GLB buffers/materials/units/hashes/fallback budgets; conservative decorative footprints; reclaimed tread preservation; existing cast, voting privacy, all four routes both ways, approach group width and five contestants' continuous snuff/departure routes.
- App TypeScript, production Vite build and six original world checks pass. The existing large JavaScript chunk warning remains. Self-contained HTML preview building also passes with both asset variants embedded.
- **67 Tribal browser check records, 32 captures, zero page/console errors:** real Player controller traversal, arrival framing, intro/skip, seated handoff, stand/reseat, voting/ballot lock, snuff rehearsal/exit, touch release/look, menu and camp transition.
- **6 camp browser checks, 14 captures, zero page errors:** autonomous cast, conversations, approaches, touch and reentry regression.
- Asset review confirms all nine Blender modules loaded in actual WebGL, with 12 full-quality captures covering arrival, council, seats, host, booth, approach, exit and guardian; 375×812, 430×932, 844×390 and 1280×800 viewports are represented.
- Low-quality WebGL confirms the alternate kit, DPR 1, disabled shadow map and available touch controls. A deliberate GLB 404 retains procedural architecture and exploration. Menu/reentry reloads successfully after failure and resource disposal. Expected 404 requests are recorded separately from application errors.

Tests run with Chrome Headless Shell **142.0.7444.175**, Three.js WebGL/SwiftShader on Linux. Accelerated movement advances the real controller through fixed simulation steps. Neither these checks nor viewport emulation constitute physical iPhone Safari testing.

## Rendering cost and limits

The same fixed council and voting-roof cameras were captured on latest main and the implementation. Renderer counters below exclude an updated shadow pass; shadow-enabled captures and readback samples are retained in the raw reports.

| Camera / quality | Draw calls | Submitted triangles |
| --- | ---: | ---: |
| Council, main | 190 | 356,292 |
| Council, full | 252 | 436,290 |
| Council, low | 248 | 388,938 |
| Voting roof, main | 94 | 270,538 |
| Voting roof, full | 131 | 286,713 |
| Voting roof, low | 131 | 257,583 |

The full wide view costs **32.6% more calls / 22.5% more triangles**. Low reduces its submitted triangles by 10.9% relative to full, uses one-quarter the atlas pixels, caps DPR and eliminates shadow-map rendering. The kit's atlas memory including mipmaps is approximately 10.67 MiB full / 2.67 MiB low; this is not total game GPU memory. Only the selected kit downloads. Spatial instance batches share geometry/materials and retain frustum culling; source buffers, textures and instance resources are disposed on exit.

Short synchronous software GPU readback medians were roughly 0.75–0.84 seconds on the main captures and 0.86–2.46 seconds across the full-quality captures; raw results include concurrent host workloads and are **not comparable hardware FPS**. The extra rendering cost is real. Physical iPhone Safari frame pacing, sustained performance, memory pressure, thermals, battery and native touch feel remain unverified. The fallback mitigates cost; this report does not certify device performance.

The scope remains the existing playable 3D presentation prototype. Practice ballots and elimination rehearsal do not drive original-game season outcomes. No new save schema, native wrapper or original-game mutation was introduced. Characters and legacy towers remain stylized; hand sculpting, scanned materials, facial performance and fully baked global illumination are not claimed complete.

## Evidence and reproduction

[Before/after comparison](blender-evidence/before-after.jpg) · [Full gallery and raw reports](blender-evidence/README.md)

```sh
pnpm --filter @workspace/survivor-camp-prototype assets:regenerate
pnpm --filter @workspace/survivor-camp-prototype assets:validate
pnpm --filter @workspace/survivor-camp-prototype test
pnpm --filter @workspace/survivor-camp-prototype typecheck
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/survivor-camp-prototype build
node artifacts/survivor-camp-prototype/scripts/world-check.mjs
pnpm --filter @workspace/survivor-camp-prototype qa:tribal
pnpm --filter @workspace/survivor-camp-prototype qa:assets
pnpm --filter @workspace/survivor-camp-prototype qa:living-camp
```

Set `BLENDER` to the supported executable for regeneration. `CAMP_CHROMIUM` can select a locally installed WebGL-capable Chromium; otherwise Playwright uses its managed browser. The CI workflow runs tests/build, camp, Tribal and asset loading/render checks and retains evidence as an artifact. Review hosted CI separately from completed local verification.
