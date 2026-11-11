# Phase 5 · Jay Starrett appearance gate

**Visual decision · FAIL after refit.** Separate tank and shorts patterns removed the obvious standing-pose intersections and gave the clothing cleaner hems and a fitted neckline. The folded high tie fits closer to Jay's Season 33 silhouette, and the pocket tank reads clearly at a distance. At portrait range the groom is still too smooth and uniform. In the crawl sample the tank binding buckles into the shoulder, so the wardrobe construction has yet to hold up in gameplay poses.

[Shipping Jay vs. refit](evidence/jay-refit-comparison.jpg) · [Five review views](evidence/jay-refit-views.jpg) · [Idle, run and crawl samples](evidence/jay-refit-motion.jpg)

[First-pass comparison](evidence/jay-before-after.jpg) · [First-pass views](evidence/jay-views.jpg) · [First-pass loose and tied-back hair trials](evidence/jay-hair-trials.jpg)

## Season 33 appearance

- The red scoop-neck tank, pale binding and contrast pocket recur in the preseason footage and on the boat. The tank also appears at Tribal Council. The low-resolution pocket graphic was left plain. [Preseason](https://www.truedorktimes.com/s33/images/e0/e0tv91.jpg) · [Boat](https://www.truedorktimes.com/s33/images/e1/e1tv17.jpg) · [Tribal](https://www.truedorktimes.com/s33/images/e13/e13tv60.jpg)
- Hair is dark and wavy when loose. Camp and challenge stills show an alternate tied-back state. The final study combines that alternate with the red tank for review. The Buff and black beanie are removable equipment, and neither is part of the skin, hair or clothing here. [Camp](https://www.truedorktimes.com/s33/images/e1/e1tv58.jpg) · [Challenge](https://www.truedorktimes.com/s33/images/e4/e4tv15.jpg)
- The red tank appears with dark bottoms in the Episode 11 challenge view. That frame supports the color pairing, with limited evidence for the exact cut and footwear. The slate shorts and bare feet are study choices. Red bottoms are a separately documented shirtless look. [Episode 11 outfit](https://www.truedorktimes.com/s33/images/e11/e11tv29.jpg) · [Episode 1 camp](https://www.truedorktimes.com/s33/images/e1/e1tv69.jpg)

The Phase 4 Blender study and visual report supplied the posture and style benchmark. Main was verified at `708a21c43b4b2969aa28bf2142005e4f5df0bcdf`, including PR #35. The open face-study drafts did not supply geometry for this work.

## Validation

| Check | Result |
| --- | --- |
| Blender 4.3.2 | Reopened the packed refit with 12 skinned mesh objects, 10 packed textures including the hairline atlas, 66 bones and five review cameras. |
| Scratch GLB | Rest-pose export validated with zero errors and warnings for parented skinned meshes. |
| Movement samples | Retargeted idle, run and crawl from the shipping Jay for a Blender preview. Applied the rest-orientation delta per joint and scaled hip translation to the new body. Five frames verified that the clips move the study rig. The crawl sample exposed armhole deformation. |
| Mobile budget | The compact three-clip preview is 501,380 bytes and 20,332 triangles. It fits the repository's 650,000-byte and under-23,000-triangle limits. The full 13-clip export, optimized visual fidelity, in-game loading and iPhone Safari performance are unverified. |

Jay is the only Phase 5 study. The other 17 contestants, Phase 4 refinements and the cast lineup are pending at the gate. The draft contains source and rendered evidence. Production models and game integration are outside the draft.

The next step is to fit the armholes in both upright and crawl poses, using deliberate weight gradients at the clavicle and upper arm. Review the groom under portrait lighting using a broken-up hairline and the actual shape of the high tie. Keep the natural face proportions and use the same motion samples before expanding the cast.

## Reproduce the review

The foundation uses Ara 3D Gen at commit `c0abe46261171ad3ec570b39beabe386669cae4d` and its MakeHuman-derived CC0 mesh, skin, eye, brow, lash, teeth, tongue and ponytail assets. Ara source is MIT. The source also builds the tank, shorts, pocket, hairline atlas and studio pose. CBS footage was used for visual reference. [Ara license](https://github.com/olatunde85/3d-gen/blob/c0abe46261171ad3ec570b39beabe386669cae4d/LICENSE) · [Asset provenance](https://github.com/olatunde85/3d-gen/blob/c0abe46261171ad3ec570b39beabe386669cae4d/scripts/ASSETS_LICENSE.txt)

Set `game`, `ara` and `output` to absolute paths for this repository, a checkout of the pinned Ara revision and a writable scratch directory. Use Node 20+, Blender 4.3 and glTF Transform CLI 4.5.

```sh
cp "$game/tools/character/appearance-study/bake-jay.ts" "$ara/scripts/phase5-jay.ts"
(cd "$ara" && npm ci && node --import tsx scripts/phase5-jay.ts "$output")
gltf-transform dequantize "$game/artifacts/survivor-camp-prototype/src/assets/characters/cast/survivor-2.glb" "$output/jay-before.glb"
blender -b -Y --python-exit-code 1 --python "$game/tools/character/appearance-study/jay.py" -- "$output/jay-foundation.glb" "$output/review" candidate
blender -b -Y --python-exit-code 1 --python "$game/tools/character/appearance-study/jay.py" -- "$output/jay-before.glb" "$output/review" before
```
