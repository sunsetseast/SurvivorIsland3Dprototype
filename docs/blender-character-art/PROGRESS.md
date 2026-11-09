# Blender character art

Branch `feat/blender-character-art` starts at merged PR #30, `350652d948114b06a178a8114cde0159cc850f43`. The [branch history](https://github.com/sunsetseast/SurvivorIsland3Dprototype/commits/feat/blender-character-art/) records the latest pushed SHA.

| Checkpoint | State |
| --- | --- |
| Source audit | Reviewed the PR #30 contact sheet, cast manifest, MakeHuman bake, optimizer, shared model loader and skeletal playback. |
| Research | Cook Islands reference sheet inspected for Ozzy, including the original illustrated avatar and three season stills. |
| Blender benchmark | Pending. No approved replacement. |
| Natalie and Boston Rob | Production gated on the Ozzy review. |
| Game integration | PR #30 assets remain live until a candidate passes both quality criteria. |

The optimized Ozzy has a 2,040-triangle Skin primitive, a stock long hair proxy and 4,980 beard triangles. The cloth bake removes covered body faces, so deleting the tank from the existing GLB would expose holes. The existing 66 joints, 13 clips, cache and ID mapping are the production contract. The model uses one shared loading path across the picker, camp, challenges and Council.

MPFB can fit MakeHuman rigs to the same base topology. For this benchmark, the pinned MakeHuman mesh and Ara bake give the required rig and clips without a new retargeting dependency. The Blender pass uses the unoptimized full-topology body as its sculpt foundation.

Next action is to build the shirtless foundation, sculpt the face and author the Cook Islands hair, charcoal board shorts and pendant in Blender. Compare the exported candidate to PR #30 at matched angles before deciding whether to promote it.
