# Tonsai camp art direction

Warm coastal daylight, shaded green interiors, chalky eroded limestone and practical handmade camp construction. The existing survivor and interface establish the degree of stylization. Large natural forms should be readable at landscape-phone size; close views should reveal material variation and construction details.

| System | Direction | Acceptance view |
| --- | --- | --- |
| Forest | Overlapping asymmetric crowns above palms, saplings, shrubs and ferns. Eye-height vegetation should screen the interior while established trails remain readable. | West beach, shelter, fire, first trail, deep jungle, spring, cliff approach |
| Coast | Open dry sand; damp darker margins; irregular soil/litter transition under the treeline. | West beach and shoreline |
| Limestone | Unequal broad shoulders, retreating upper mass, an eroded undercut and preserved cave. Weathered mineral variation should follow the surface without repeated vertical texture stretching. | Beach, approach, cave entrance and base |
| Shelter | Open communal bamboo platform, lashed supports and braces, overlapping dry palm roof. Gathered materials have small imperfections. | Fire-to-shelter, interior and communal camp |
| Camp | Fuel, husks and spare materials grouped around work areas. Existing supplies and task positions remain recognizable. | Communal camp and fire |
| Lighting | One shadow-casting sun, warm highlights and readable canopy shade. Modest atmosphere beyond the playable foreground. | Compare low and high from the same pose |
| Water | One continuous translucent surface, gradual depth colour, moving small ripples and broken soft foam. | Shoreline and ocean |

## Baseline defects

The user's 1536 × 707 iPhone screenshot was inspected directly. A saved main-build checkpoint approximates its southeast heading from west beach. Original camera metadata is unavailable, so this is a reproducible approximation. The baseline shows sparse eye-height planting, repeated twisted crowns, an almost vertically extruded southern wall, broad hard foam strips, and an elaborate symmetrical hut with railings and furnishings.

## Visual gates

Inspect the full-size game captures in GALLERY.md. A passing unit test or larger foliage count cannot accept a visual change. Review the silhouette, nearby branches, ground contact, path opening, shade readability and shoreline together. Eye-height diagnostics and an elevated layout view supplement the native Player camera captures; they are labelled separately.

The first integrated pass failed this gate: pointed flat understory, dark canopy undersides and plants across the shelter approach were visible. Those assets, materials and placement exclusions were revised. Deck/roof tests also found an entrance support conflict and exposed an existing crate collider; the final geometry preserves the original side-post positions and supplies a visible crate.

The final review and remaining limitations are recorded in REPORT.md. Physical iPhone Safari acceptance remains a separate device check.
