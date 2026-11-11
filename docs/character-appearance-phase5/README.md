# Phase 5 · Jay Starrett appearance gate

**Visual decision · FAIL.** The fitted red pocket tank, visible eyes and relaxed pose improve the existing Jay. The loose hair still bunches like a wig. The tied-back version fits closer to the scalp, but its smooth crown and narrow tail miss the irregular texture and tied silhouette in the broadcast. The tank binding still lifts and breaks at the shoulder edges, and the shorts read as a padded shell. Together those issues keep the study below the cast benchmark.

[Current Jay vs. the study](evidence/jay-before-after.jpg) · [Front, three-quarter, rear and approximate gameplay distance](evidence/jay-views.jpg) · [Loose and tied-back hair trials](evidence/jay-hair-trials.jpg)

## Season 33 appearance

- The red scoop-neck tank, pale binding and contrast pocket recur in the preseason footage and on the boat. The tank also appears at Tribal Council. The low-resolution pocket graphic was left plain. [Preseason](https://www.truedorktimes.com/s33/images/e0/e0tv91.jpg) · [Boat](https://www.truedorktimes.com/s33/images/e1/e1tv17.jpg) · [Tribal](https://www.truedorktimes.com/s33/images/e13/e13tv60.jpg)
- Hair is dark and wavy when loose. Camp and challenge stills show an alternate tied-back state. The final study combines that alternate with the red tank for review. The Buff and black beanie are removable equipment, and neither is part of the skin, hair or clothing here. [Camp](https://www.truedorktimes.com/s33/images/e1/e1tv58.jpg) · [Challenge](https://www.truedorktimes.com/s33/images/e4/e4tv15.jpg)
- The red tank appears with dark bottoms in the Episode 11 challenge view. That frame supports the color pairing, with limited evidence for the exact cut and footwear. The slate shorts and bare feet are study choices. Red bottoms are a separately documented shirtless look. [Episode 11 outfit](https://www.truedorktimes.com/s33/images/e11/e11tv29.jpg) · [Episode 1 camp](https://www.truedorktimes.com/s33/images/e1/e1tv69.jpg)

The Phase 4 Blender study and visual report supplied the posture and style benchmark. Main was verified at `708a21c43b4b2969aa28bf2142005e4f5df0bcdf`, including PR #35. The open face-study drafts did not supply geometry for this work.

## Validation

| Check | Result |
| --- | --- |
| Blender 4.3.2 | Reopened the packed editable scene with ten skinned mesh objects, ten packed texture images, 66 bones and five review cameras. |
| Scratch GLB | Rest-pose export passed glTF validation with zero errors. Validator warnings covered generated tangent space and parented skinned meshes. |
| Production animation contract | All 66 joint names match. 64 local joint translations differ by more than 1 mm. The study GLB has no clips. Existing clip deformation and animation compatibility remain unverified. |
| Mobile readiness | The unoptimized study is 6.0 MiB and 87,552 triangles. The shipping asset is 427 KiB and 9,004 triangles. Safari performance remains unverified. |

Jay is the only Phase 5 study. The other 17 contestants, their requested Phase 4 refinements and the cast lineup are pending at the gate. The source and renders in this draft leave the runtime registry, production assets, contestant IDs and animations intact.

The next step is a single Jay fitting trial with a properly textured tied-back groom and independently cut tank and shorts panels. Review the shoulder openings, waistband and hair from rear and close views before spending time binding the art. Keep the current natural face proportions as the starting point.

## Reproduce the review

The foundation uses Ara 3D Gen at commit `c0abe46261171ad3ec570b39beabe386669cae4d` and its MakeHuman-derived CC0 mesh, skin, eye, brow, teeth, tongue and ponytail assets. Ara source is MIT. Blender-authored tank geometry, materials and pose are included as source. CBS footage was used for visual reference. [Ara license](https://github.com/olatunde85/3d-gen/blob/c0abe46261171ad3ec570b39beabe386669cae4d/LICENSE) · [Asset provenance](https://github.com/olatunde85/3d-gen/blob/c0abe46261171ad3ec570b39beabe386669cae4d/scripts/ASSETS_LICENSE.txt)

Set `game`, `ara` and `output` to absolute paths for this repository, a checkout of the pinned Ara revision and a writable scratch directory. Use Node 20+, Blender 4.3 and glTF Transform CLI 4.5.

```sh
cp "$game/tools/character/appearance-study/bake-jay.ts" "$ara/scripts/phase5-jay.ts"
(cd "$ara" && npm ci && node --import tsx scripts/phase5-jay.ts "$output")
gltf-transform dequantize "$game/artifacts/survivor-camp-prototype/src/assets/characters/cast/survivor-2.glb" "$output/jay-before.glb"
blender -b -Y --python-exit-code 1 --python "$game/tools/character/appearance-study/jay.py" -- "$output/jay-foundation.glb" "$output/review" candidate
blender -b -Y --python-exit-code 1 --python "$game/tools/character/appearance-study/jay.py" -- "$output/jay-before.glb" "$output/review" before
```
