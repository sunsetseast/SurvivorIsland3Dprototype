# Tonsai environment refinement — draft review

The oversized green rounded-box formations are removed. Their replacements are lower, fractured scanned-rock compositions with exposed mineral surfaces and irregular passages. The alcove and strangler stone use the same corrected asset strategy. The expanded PR16 geography remains intact.

[Before/after gallery](GALLERY.md) · [Measured performance](PERFORMANCE.md) · [Asset provenance](ASSETS.md) · [Initial defects](DEFECTS.md) · [Regeneration workflow](../../tools/camp/refinement/README.md)

## Implemented

- **Limestone fissure (stable `moss-gates` ID):** scan-derived boulders with varied orientations/heights, a split rear recess, selective low damp coloration and separate debris. The old rounded boxes and their old collision branches are gone. Convex scan footprints release the former invisible corners.
- **Southern limestone:** coherent indexed normals, irregular fluting, cracks/strata variation, a projecting undercut and exposed mineral colors. Its base stays approachable along the original beach and jungle routes. It is still an authored limestone analogue, not a surveyed Tonsai scan.
- **Cave:** an irregular real opening, asymmetric rough vault, fractured back surface, shoulder/back talus, sediment floor blending and restrained ambient darkening. Generic trees/understory were removed from the entrance/interior together with their colliders. The walkable floor, corridor and exit remain real terrain rather than a painted entrance.
- **Signature wood:** tapered and curved trunks, rounded ground-following buttress sections, asymmetric leaders/crown lobes, ray-fitted strangler roots, broken cambium rims and real hollow log/stump interiors. Fallen and bridge profiles differ in mass and bow. No cylinder or torus mesh is used as the primary signature wood mesh.
- **Jungle finish:** more restrained foliage response, irregular crown assemblies, contact shade around landmarks, inland ground shading, small trail-edge fragments and a rock-based spring rim replacing the old bright round pebbles. Trail openings remain clear. Broad background species variety is still limited by the existing scanned kit.
- **39 future hiding candidates:** all IDs and idol/clue eligibility survive. Each physical surface is independently ray-validated against near/far asset geometry; approach points are separately routed/walked. The three roof approaches were moved a few metres closer to the actual face because their old targets pointed into empty undercut space. No spawning/discovery system is added.
- **Targeted optimization:** offline high/low GLB exports, per-site distance LOD/bounds, a reduced-only low download, shared existing textures/materials, baked body-valid navigation and a reusable CPU terrain-weight mask. Stage diagnostics separate pre-menu navigation from scene/asset work.

## Genuine visual review

All 14 requested matching views were inspected in high and low quality. The gallery contains **56 original WebGL screenshots: 28 before and 28 after**. Both quality profiles use the same native Player camera positions, angles and viewport. Contact sheets below are labeled combinations of those originals, not new renders.

| Feature | Review result | Remaining limit |
|---|---|---|
| Former Moss Gates, alcove, strangler stone | Manufactured green blocks are gone; fractured rock silhouettes and open passages are plainly visible | The same CC0 scan is reused in multiple orientations; it is not a unique scan per boulder |
| Southern cliff | Smoother coherent erosion relief and consistent mineral response; direct base access retained | Large face/UV regions can still read as authored rather than real field geology |
| Cave entrance/interior | Jagged asymmetric roof, no accidental entrance trees, a visible walkable sediment floor and small talus | It remains a compact closed-back cave; some texture repetition and simple wall sections remain |
| Ancient fig/root crown/leaning tree | Tapered irregular wood, curved buttress profiles, distinct root/crown composition | Upper trunks/canopies would benefit from a dedicated hand-sculpted botanical kit |
| Fallen giant/stump/bridge | Broken irregular rims, exposed roots and actual hollow interiors replace regular cylinder/torus ends | Small damaged-wood detail is section-authored, not scanned decay/fungi |
| Spring/general trails/coastal camp/inland forest | Consistent materials, subdued inland ground, natural small rock pieces and clear routes | Background canopy and understory are an incremental refinement; not a new species-rich forest rebuild |

[High comparisons 1](evidence/comparison-high-1.jpg) · [High comparisons 2](evidence/comparison-high-2.jpg) · [Low comparisons 1](evidence/comparison-low-1.jpg) · [Low comparisons 2](evidence/comparison-low-2.jpg)

## Verification

- **100 unit tests**, TypeScript and the normal production build pass; the world check covers 294 eligible collision sweeps.
- **51 continuous browser route legs**, including every one of the **39 hiding approaches**, cliff/cave entry and exit, spring alternatives and an NPC's real water trip. These use trusted keys and the actual Player solver, separately from gallery teleports.
- **16 mobile-input** and **15 connected-world** browser checks pass: simultaneous joystick/Run/look, normalization, cancellation/reset/focus/map locks, four Camp ↔ Railay round trips, persistence, conversations, Tribal Council ballot, failure recovery and disposal.
- **48 production camera-wall samples** at the cave, cliff, ancient fig and limestone fissure pass. Low/high geometry surfaces and open cave/log/stump geometry also have independent ray tests.
- Cold production profiles, resource estimates, stage timings, return timings and cleanup findings are in the [performance report](PERFORMANCE.md), with raw JSON linked beside the claims.

## Certification and limits

**Suitable for draft review as a meaningful art/performance refinement.** The reported giant moss-covered block defect is visibly corrected. The evidence supports the geometry/accessibility and regression claims above. This is not a photorealistic/AAA art certification, nor a claim that the original trees were professionally sculpted in Blender.

The new mesh download increases total transfer relative to PR16; low has its own smaller kit. The unbounded software-RAF diagnostic still demonstrates why host frame medians cannot certify mobile performance. Shader compilation was not separately isolated. Physical iPhone Safari, long-session thermal behavior, sustained device GPU timing and real mobile-network loading still need device verification.

The camp boundary, all 12 trail branches, remote spring, southern approaches and activity locations are preserved. Save schema and the social/gameplay systems are unchanged. Work targets only `SurvivorIsland3Dprototype`; the original `SurvivorIsland2025` repository is untouched. No merge, deployment or publication is performed.
