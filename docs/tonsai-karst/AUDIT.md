# Southern limestone audit before implementation

Base: main `5d54f292`, merged PR20. Resumed existing `feat/tonsai-karst-reconstruction`; no earlier implementation edits or PR21 existed.

The playable Camp uses `NaturalLandmarks` / `landmarks[-low].glb` for the southern formation, generated offline by `southernCliffGeometry`. Northern and offshore Camp formations instead reuse the existing CC0 scanned `limestone.glb` with uniform scales; Railay journey also has its independent imported `karsts` assets. No evidence of unintended nonuniform scale on the southern mesh: its vertices are already in world metres.

The exposed west end of the southern mesh is a pair of triangles per three-metre strip stretched from x=-40 to the fixed back plane z=127. It has essentially no lateral erosion or changing cross-section, joins the front with a hard boundary, and ends at y=baseHeight without submerged continuation. This is the dominant rectangular panel visible from West Beach. The upper front already has varied heights; increasing that noise alone will not fix the side. Independently chosen per-column row counts create unmatched edge vertices on the front, causing shading seams/T-junctions. UV-projected normal mapping also differs from the triplanar diffuse map. Interior darkening is intentional inside the cave, but abrupt exterior normals and the broad planar side accentuate the dark vertical boundary.

Plan: retain the lower front/cave physical envelope and stable hiding anchors; replace both straight end caps and crown with a continuous closed, irregular wraparound headland. Add composed vertical ribs, recesses, an undercut submerged western foot and connected secondary toes behind the existing southern boundary. Use common sampling per strip and consistent winding/normals. Use existing maps and instanced plants with raycast-verified ledge contacts. Preserve successful scanned offshore geometry. Capture matching low/high native Player-camera views and separately labeled eye/overview diagnostics before and after; measure render submissions, arrays, image estimates and host timings.

References consulted: NASA Earth Observatory, [Thailand’s Krabi Coast](https://science.nasa.gov/earth/earth-observatory/thailands-krabi-coast/); QT Luong’s [Railay limestone overhang](https://www.terragalleria.com/asia/thailand/railay/picture.thai48234.html). References guide massing/undercuts/mineral staining; no reference image is bundled or used as a texture.

## Confirmed after baseline inspection

Exported-GLB ray probes independently confirm inward west-cap winding (normal X +0.995) and a downward crown (normal Y −0.581); see `winding-audit.json`. Baseline clear coast/shoreline screenshots also show a blue slit at the front/cap sampling mismatch. Corrected outward/upward winding and shared border rows remove that specific geometric defect. The previous UV-space normal map was also misaligned with triplanar diffuse sampling and is removed on the natural-landmark material.
