# Cook Islands Ozzy likeness

Branch `feat/ozzy-likeness-sculpt` starts at `8726885379fd6dc3b359b94ed1dcf1470c7f368d` (merged PR #32). The [branch history](https://github.com/sunsetseast/SurvivorIsland3Dprototype/commits/feat/ozzy-likeness-sculpt/) records the latest pushed SHA.

**Baseline** Reference study and bare-head review. PR #32 is the production control. Rendered the neutral bare head, profile and current clothed character. The eye sockets have little definition, the mouth is narrow with an even lip seam, and the forehead-to-nose transition is smooth and rounded. The high, close-cropped mass and broad clumps in the model give it a different silhouette from the season footage.

**Checkpoint** Candidate built and reviewed in Blender and WebGL. [Draft PR #33](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/33). [Rebuild instructions](REBUILD.md) · [Candidate GLB](../../tools/character/blender/candidates/ozzy-cook-islands-v2.glb)

- **A · Primary forms.** [Matched hairless study](evidence/anatomy.jpg). Sculpted the orbital shelf and cheekbone plane, reshaped the nasal bridge and alae, and widened the mouth and reshaped the chin. The first review exposed an abrupt inner brow, an angular tip and a level lip seam. Softened the orbital transition and nasal tip and added separate upper-lip peaks and slight asymmetry. The existing UVs and skinning carry through the sculpt.
- **B · Groom.** Replaced broad opaque locks with curved alpha-masked strand cards and a textured underlayer. The first groom covered too much forehead and formed large flat clumps. Raised the central fringe, narrowed the cards, varied their lengths and checked front, side, back and three-quarter.
- **C · Materials.** Painted new diffuse shading and fuller brows in the existing skin UVs, reduced the orange tint, adjusted eye roughness and fitted softly blended facial hair to the philtrum and chin. Retained the season-appropriate shorts, cord and footwear.
- **D · Final comparison.** [Matched Blender portraits and body view](evidence/studio.jpg). Brow, profile and nape are closer to the references. Some curl edges still read as overlapping ribbons, and the lid contour and cheek-to-mouth transition still lack enough individual character for a strong likeness. Candidate ready for developer review. Production uses the PR #32 GLB.

**Game review.** [Matched WebGL portraits and motion](evidence/webgl.jpg) · [Picker and Tonsai Camp](evidence/game.jpg). A local production-build preview served the exact candidate bytes at the Ozzy URL for the isolated review. The real picker rendered ID 1, the camp loaded the rigged actor, and touch locomotion advanced the walk or run state. The game capture uses the scene's lighting and a matching review camera. The regular cast remains mapped to the PR #32 production GLB.

**Validation.** 451,896 bytes, 22,978 triangles, 66 joints and 13 clips. The cast validator accepted all 18 models with the candidate staged. The decoded GLB validator reported zero errors and warnings. All 200 tests, TypeScript and the production build passed. Blender evaluated 52 finite poses across the 13 clips. A decoded comparison kept every animation sample time, with maximum normalized transform component drift of 0.000031 after recompression. Browser tests used landscape Chromium software WebGL. Physical iPhone Safari testing is pending.

**Next** Developer likeness review. The candidate remains outside the production cast while that review is pending.

## Reference board

| View | What it constrains | Reference |
| --- | --- | --- |
| Near-front cast portrait, smiling | Strong brows, inner socket transition, broad cheek shelf, medium-width lips. Treat the raised cheeks and narrowed eyelids as expression. | [CBS Cook Islands cast gallery](https://www.cbsnews.com/pictures/survivor-cook-islands/) |
| Near-front confessional, neutral | Full upper cheek width narrowing to a rounded chin, lower curls partly covering the ears, sparse mustache and beard. | [Episode 3 confessional](https://www.truedorktimes.com/s13/images/e3/e3tv88.jpg) |
| Strong three-quarter confessional | Straight-to-softly-convex bridge, rounded projected tip, brow shelf, jaw plane below the cheek and longer nape silhouette. | [Episode 5 confessional](https://www.truedorktimes.com/s13/images/e5/e5tv25.jpg) |
| Same-season oblique finale photo | Cheek and nose projection at another angle. Studio hair and clothing are secondary cues. | [CBS finale gallery](https://www.cbsnews.com/pictures/survivor-cook-islands-finale/) |
| Challenge lineup | Lean swimmer build, relatively long limbs, shirtless silhouette, charcoal shorts and a colored upper-arm cloth. | [Episode 7 lineup, center](https://www.truedorktimes.com/s13/images/e7/e7tv59.jpg) |
| Existing illustrated avatar | Useful for continuity. Longer straight hair, heavy beard and the red tank differ from the chosen on-island appearance. | [Read-only 2D source avatar](https://github.com/sunsetseast/SurvivorIsland2025/blob/cf894e578d77fce1e588d793dfc8d14f61ec7628/Assets/Avatars/ozzy.jpeg) |

Maintain a neutral expression with a subtly raised outer brow on one side. Prioritize the brow and socket relationship, nose tip and alae, zygomatic plane, chin and lip contour. The photos constrain a range of shapes. An orthographic side photo and unobstructed ear shapes are unavailable. Use the existing ears as a restrained secondary form. Hair should have an irregular off-center fall, dark roots, fine brown and sun-lightened fibers and curls that frame the temples down to the nape. Preserve the shirtless, charcoal-shorts and small pendant look from the footage.

The reference images are linked for review. The model uses the project's existing MakeHuman-derived body and textures under their [recorded provenance](../character-renaissance/FINAL_REPORT.md). Hair and grooming artwork will be authored without photo textures. Commercial likeness clearance has not been verified.
