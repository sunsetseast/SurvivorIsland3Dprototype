# Targeted Camp audit

Base: `main` at `12b9816ff49d81681adf919b973eb52e5d894502`, including merged PR #14. The implementation and reference repositories are different projects. No writes were made to `SurvivorIsland2025` or the vendored reference simulation.

## The actual render paths

| Area | Entry and art | Gameplay and lifecycle |
| --- | --- | --- |
| Compact Camp | `App.tsx` → `Scene.tsx` → the original `Terrain.tsx`, `Flora.tsx`, Camp props and Shelter | `Player`, `Contestants`, persistent `CampRuntime`, `navigation.ts`, `world.ts`; PR #14 `SceneLifecycle` |
| Railay journey | Independently lazy loaded `railay/IslandScene.tsx` → peninsula Terrain/Geology/Vegetation and `railay/tonsai/*` | Separate geography/height grid and exploration world; permission-gated journey entry and return |
| Tribal Council | Independently lazy loaded `tribal/TribalScene.tsx` | Existing intro, voting, sanctuary assets and interactions |

PRs #10–#12 improved the second row. Their Tonsai karst, canopy and material systems were **not mounted by the dedicated Camp**. Importing the entire peninsula into Camp would also defeat PR #14's independent loading. This change adds a Camp-specific environment kit; the peninsula remains unchanged.

## Existing constraints preserved

- Camp coordinates are metres, with westward ocean and a roughly 94 × 94 m playable boundary. The visual terrain extends beyond it. The camp is not enlarged.
- Spawn `(-6,-24)`, fire `(-9,-31)`, shelter deck `x=7..17,z=-48..-40,y=1.8`, the existing ramp, beach and water-well anchors are retained.
- NPC activity and conversation anchors come from `CampRuntime.SPOTS`. A* validates edges against the same stepped collision and height functions as the player.
- The camp exit remains `(-6,26)`, with the same connection id, permission, registry transform, return spawn and season/instance ownership. It is still a trail through the forest.
- Camera boom collision uses `cameraBlocker` meshes; the new trunks and hero rock masses participate. Main rocks and added backdrop roots stay beyond the playable boundary. Ground decoration does not become an invisible barrier.
- PR #13's pointer ownership and Run latch are retained. No movement, social-decision, voting or travel-manager rewrite was needed.
- Existing Camp used Lambert shading, a single 896² baked green/brown ground image, 1024² sun shadows and primitive instanced flora. Camp's quality toggle previously did not reach its environment renderer.

## Keep, replace, reject

| Existing or evaluated item | Decision |
| --- | --- |
| Camp height field, shoreline contour, paths, shelter/fire/well and gameplay props | Keep: they already align with collision, NPC navigation and activities |
| Camp primitive foliage and faceted rocks | Replace during normal loading; retain only as an asset-failure fallback |
| PR #12 authored coconut palm geometry | Extract just the three near/far palm variants into `camp/palms.glb`; avoid loading unused canopy/ficus modules |
| PR #12 scanned Fern 02 | Reuse all four optimized variants; normalize their individual origins before instancing |
| PR #10–#12 procedural karst field, peninsula terrain and forest scatter | Do not import into Camp |
| Poly Haven Rock Face 02 and Coast Rocks 02 | Inspected; rejected for hero cliffs. Open/slab-like scan construction became conspicuous when enlarged. These candidates are not shipped |
| Raw Island Tree 02, approximately two million triangles | Retain the scanned branching and bark; retopologize complete leaf islands into cards. Ordinary aggressive decimation produced a sparse, needle-like crown and was rejected |
| Boulder 01 | Selected for solid three-dimensional mass, irregular silhouette and photographed surface relief. Rotated and placed with uniform scales; no trigonometric cliff field |

## Black-line investigation

The reported original iPhone diagonal was not reproduced in the fixed-pose Camp baseline or the final inspected Camp captures. The repository has no supplied original device frame, camera pose or reproducible condition tying that line to this Camp's terrain. The larger Railay scene has a separate terrain/material path and is outside this reconstruction.

The new Camp uses one continuous terrain mesh, shared vertex normals and continuous world-space material weights. There are no coplanar ground-zone overlays. Sun shadow bias/normal bias are tuned, and ground normal detail is applied in the tangent-space shader branch. These remove several seam-prone constructions, but **they do not establish the root cause of the historical iPhone defect**. This report does not certify that particular defect as fixed. No vegetation was added to conceal a known seam.
