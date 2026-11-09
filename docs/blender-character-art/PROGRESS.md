# Blender character art

Branch `feat/blender-character-art` starts at merged PR #30, `350652d948114b06a178a8114cde0159cc850f43`. The [branch history](https://github.com/sunsetseast/SurvivorIsland3Dprototype/commits/feat/blender-character-art/) records the latest pushed SHA. [Draft PR #31](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/31) · [Rebuild instructions](../../tools/character/blender/README.md).

| Checkpoint | State |
| --- | --- |
| Source audit | Reviewed the PR #30 contact sheet, cast manifest, MakeHuman bake, optimizer, shared model loader and skeletal playback. |
| Research | Inspected the three original avatars and Cook Islands, San Juan del Sur and Marquesas broadcast stills. The [appearance file](../../tools/character/blender/appearances.json) records individual observations, sources and uncertainties. |
| Blender benchmark | Rebuilt Ozzy's face, hair, facial hair, shirtless body presentation, shorts and pendant. No candidate passed both approval criteria. |
| Natalie and Boston Rob | Photo specifications recorded. Sculpting is gated on Ozzy. |
| Game integration | All production cast GLBs are still the PR #30 versions. The candidate is wired to the normal game loader on the QA server. The [PR checks](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/31/checks) carry browser status and screenshots. |

The PR #30 Ozzy used a 2,040-triangle Skin primitive, a stock long hair proxy and 4,980 beard triangles. Its tank removed occluded skin faces. MPFB can fit a MakeHuman mesh and rig. The pinned MakeHuman and Ara foundation keeps the original bind and clip contract without adding a retargeting dependency.

[Matched front, profile and three-quarter Blender renders](evidence/blender-portraits.jpg) · [Matched full body, walking and running renders](evidence/blender-body-motion.jpg). The candidate row was rendered from the optimized GLB after lossless decompression for Blender import. No reference images are included.

- **Model quality.** The full-topology body provides better facial and shoulder surfaces. The old goatee and straight hair panels are gone. After the first render, the refinement lowered the crown, layered the nape, opened the lids, fitted the cord to the neck and added hair fibers and sparse brow and beard geometry. The hair still breaks into visibly separate broad locks, and the facial stubble reads as isolated dots in close shots.
- **Likeness.** The charcoal shorts, cord pendant, shorter hair and lighter facial hair are closer to the season footage. The brow-to-eye shape and cheek-to-mouth planes remain too close to the source mannequin. The render does not support approval as a recognizable Cook Islands Ozzy.

| Asset | Bytes | Triangles | Material primitives | Estimated RGBA8 textures with mipmaps |
| --- | ---: | ---: | ---: | ---: |
| PR #30 Ozzy | 537,292 | 16,450 | 12 | 7.52 MiB |
| Blender candidate | 489,460 | 22,768 | 13 | 5.42 MiB |

Both have 66 joints and 13 clips. Texture memory is an estimate from image dimensions, not a GPU measurement. All asset budget checks passed with the candidate staged. Physical iPhone Safari timing and deformation remain unverified.

Next action is a manual likeness sculpt of Ozzy's eye sockets, cheek and lower face, plus narrower overlapping curl groups. Repeat the same matched comparison before authoring the Natalie and Boston Rob models.
