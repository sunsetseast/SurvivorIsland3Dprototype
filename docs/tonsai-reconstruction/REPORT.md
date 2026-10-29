# Tonsai camp reconstruction

This branch replaces the shelter, tree crown kit, eye-height understory and shoreline surface, and revises the southern limestone, ground blending, camp details and daylight. It is based on merged PR17 (`5249bf2`). The original SurvivorIsland2025 repository is untouched. This is one draft PR; no merge, deployment or publication is performed.

[Before/after WebGL gallery](GALLERY.md) · [Performance](PERFORMANCE.md) · [Gameplay](GAMEPLAY.md) · [Asset provenance](ASSETS.md) · [Art direction](ART_DIRECTION.md) · [Water decision](WATER_EVALUATION.md) · [References](REFERENCES.md) · [Recovery audit](RECOVERY.md)

## Implemented environment changes

- **Forest:** Three asymmetric crown architectures, photographic leaf sprays, curved/tapered wood, an existing high-detail scanned fig trunk in the mix, juvenile coastal palms and a new cupped broadleaf understory and branched juvenile trees filling the midstory. Five habitat zones use coastal exposure, moisture, clustered placement, established paths and landmark/approach exclusions. Large signature figs keep their original physical trunks and gain fuller crowns. Low quality retains the same understory placement set with reduced meshes. Continuation planting covers existing nonplayable slopes; tall crowns stay clear of used trail envelopes and the fire-to-shelter sightline.
- **Ground:** Darker soil/litter transitions replace the broadly sandy interior. Terrain-following small leaves, branches, vines and camp work debris add depth. Cell-based ground details and the existing scanned material library preserve the original terrain/navigation surface.
- **Limestone:** Unequal ridge controls, retreating shoulders, nonrepeating upper erosion and a sloping crown replace the repeated high vertical grooves. World-space triplanar colour mapping reduces stretched texture patterns. The lower cave/undercut remains compatible with exploration, and all 39 surface anchors were independently revalidated. Cliff-top plants are ray-grounded to the actual revised mesh.
- **Shelter:** An open communal lean-to with uneven round bamboo slats, supporting posts at the original collision positions, cross-bracing, visible lashings and overlapping split palm thatch. The existing accessible deck and ramp remain. A supply crate still matches its established collider. Decorative wall panels, rails, soft furnishings and the hanging lantern are removed.
- **Camp:** Fuel, husks, spare bamboo, frond scraps and leaf debris are grouped around work areas. The fire ring gains irregular spacing and its existing charred wood/ash remain. Seating log shapes gain slight curvature; NPC/task/social anchors are preserved.
- **Water:** A continuous coastal shader replaces three separate foam ribbons. It uses a shoreline lookup, gradual tint/transparency, moving ripples, soft broken swash and analytic sky reflection. No FFT or additional render-target chain is introduced.
- **Lighting/materials:** A warm sun and readable hemispheric bounce maintain beach brightness and canopy shade. Atmospheric falloff begins farther away. Photographic foliage, shared scanned bark/mineral materials and restrained thatch/wood colours tie the scene together.
- **Runtime:** Four-times-per-second instance compaction tests actual geometry bounds against distance and frustum. Floor detail is spatially partitioned. Parsed kits and cloned materials have explicit owners and disposal. The low GLB excludes near meshes and simplifies shelter geometry; texture baking/export uses integrity checks and atomic installation.

## Visual review

The new beach view has substantially more eye-height planting, a fuller forest roof, a different limestone silhouette and a continuous shoreline. The camp shelter reads as an open improvised communal structure instead of the previous furnished hut. Forest paths have vegetation at several heights and an organic floor. These are visible changes in actual production-rendered gameplay captures, independently of test counts.

The result remains a stylized browser prototype. The crown library still repeats at sufficient distance, some secondary camp props retain their earlier simple geometry/materials, and the large headland is an authored mathematical/control-point mesh rather than a hand-sculpted geological asset. The shelter's large footprint and long access ramp are retained for established gameplay compatibility. This is a substantial reconstruction, not a claim that every view has reached a final art standard.

The gallery should be reviewed at full size before accepting the visual direction. The eye-height and elevated views expose density, open paths, backdrop slopes and material repetition rather than concealing them. Any view the user still finds unsatisfactory remains a visual issue, even when technical checks pass.

## Corrections made at quality gates

The initial integration exposed pointed flat leaves, canopy undersides that were too dark, planting across the shelter approach, a central support conflicting with access, and an old crate collider without visible geometry. These were corrected before final validation. A subsequent capture caught an incomplete canopy PNG in a packed GLB; the texture was rebuilt and verified, export integrity checks were added, and affected captures/checks were rerun. Failed intermediate captures are excluded from the final gallery.

Continuation review caught two further defects: the low simplifier had removed all thin rope lashings, and diagnostic-camera captures were culling vegetation for the player camera. Joint bindings are now retained in both exports, with a packed-mesh regression assertion. Every subscriber sees the diagnostic camera before culling, and affected baseline/after views were recaptured. The corrected spring inspection is enclosed by foliage; the earlier apparent bare corridor was a capture defect. High-detail ranges were also shortened without removing habitat placements, reducing high spawn submissions by about 13% from the recovered version.

## Visual acceptance review

| Concern | Review of final WebGL evidence |
| --- | --- |
| West-beach failure view | Substantial improvement: dense multi-height edge, different ridge, continuous translucent swash. Exact original camera data is unavailable. |
| Forest enclosure | Camp edge, deep interior and the corrected spring inspection are enclosed by layered foliage. Shelter/fire retain intentional clearings. These sampled views do not certify every possible camera direction. |
| Trees | Fuller asymmetric crowns and juvenile branching replace the skeletal scene. Repetition, leaf-card aliasing and dark undersides remain visible in some views. |
| Shelter | Raised uneven bamboo platform, open sides, structural bracing, lashings and layered sloping palm roof. Existing large deck/ramp is a compatibility compromise. |
| Limestone | Repeated vertical grooves are replaced by an unequal retreating ridge. Broad close-up surfaces still show mathematical massing and repeated material detail; no hand-sculpted geological claim. |
| Ground and camp | Forest soil/litter and work debris improve contact and use. Some secondary props remain simple, and beach microdetail is restrained. |
| Water | The overlapping turquoise/foam ribbons are removed; a continuous depth/swash surface is visibly softer. Scene refraction and real reflection are absent. |
| Lighting/cohesion | More shaded interiors and warm daylight produce depth. Dense canopy can appear dark; close-camera hash fading is visibly grainy in stills. |

This is a substantial implemented visual improvement, but it is not blanket sign-off against every release-blocking art criterion. Foliage repetition/aliasing and some cliff/secondary-prop close-ups remain review items. Keep the PR in draft for visual acceptance and physical device review; do not infer approval from the 103 passing tests or foliage-ray fractions.

## Limits

Physical iPhone Safari, sustained GPU timing, thermals, battery drain and native touch feel are unverified. Software WebGL captures and controlled simulation confirm rendering/behaviour, not device frame rate. GPU memory is estimated from resource data; driver allocation, compression and transient targets are not fully represented. Water reflects an analytic sky approximation and does not refract scene objects. The camp remains geographically compressed fiction, with the same territory, trail layout and landmark locations as the established prototype.

There is no new idol discovery, progression, multiplayer, social simulation, character redesign, additional camp or world expansion in this PR.
