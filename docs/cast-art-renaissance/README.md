# Cast renaissance style gate

**Status — stopped at Batch A.** The three Blender studies improve portions of the anatomy and clothing silhouette. They fall short of the recognizable facial construction, materials and groom quality required to scale the method to all 18. All 18 have written appearance specifications. The other 15 have yet to receive 3D studies.

[All 18 appearance specifications](ART_DIRECTION.md)

## Blender comparisons

Each sheet has the production GLB and the latest study under the same studio lighting, with frontal, three-quarter and full-body views. The control is at an idle animation frame and the study is in its modeling pose. Framing follows the different heights and facial positions. These are direct Blender renders.

| Study | Improved | Still below the gate |
| --- | --- | --- |
| [Boston Rob Mariano](evidence/boston-rob.jpg) | Shorter, shaped goatee, separate eyes and a brim that reveals more of the face | Jaw and cheek planes still read as a generic head. The eye and mouth shapes do not deliver the reference expression. The fabric visor and embroidered initial need cleaner contours. |
| [Cirie Fields](evidence/cirie.jpg) | Fuller torso, separate eye geometry, modeled scalp braid directions and more recognizable wardrobe layers | The cheek-to-lip transition and open-eyed expression miss the likeness. Braid rows still read as carved channels at close range. The cloth cover follows the torso too closely for the intended loose weave. |
| [Sandra Diaz-Twine](evidence/sandra.jpg) | Asymmetric hair silhouette, modeled eyelids, lifted cheeks and a distinct tapered chin | The forehead, orbit and nose still read as the source face. Side waves show evenly spaced ribbons, and the painted brows and lips lack integration with the surrounding skin. |

The first pass used localized anatomical shape controls on Blender Studio's CC0 realistic anatomy. The second pass corrected garment intersections and revised the grooms and eyes. The final pass replaced the facial shape controls with independent front and three-quarter landmark cages. It added wardrobe cues from the press photos and a separate side-wave groom for Sandra. The repeated anatomy and material limitations are visible after these changes. Extending either method in its current state would repeat the unresolved likeness and finish issues across the cast.

No study was promoted to a playable candidate. Candidate GLBs, rigging, animation checks, game screenshots and mobile measurements were deferred at the artistic gate. The production cast and game code were outside the change set.

## Reproduce the studies

Download the [Blender Studio Human Base Meshes v1.4.1 CC0 bundle](https://www.blender.org/download/demo-files/#assets) and extract it. The downloaded ZIP had SHA-256 `811f43accbb31a88266d932f8f5563b2d13586fca0ba2693aad1f5fe582b3515`. Blender 4.3.2 with its bundled NumPy rendered the studies in Cycles on CPU. Each run creates an editable `art-study.blend` and the three studio images.

From the repository root, set `CAST_BASE` to the absolute path of `human_base_meshes_bundle.blend` and `CAST_OUT` to an output directory.

```sh
for id in 4 10 11; do
  OPENBLAS_NUM_THREADS=1 blender -b -t 2 --python-exit-code 1 \
    --python tools/character/renaissance/pilot.py -- "$CAST_BASE" "$CAST_OUT/study/$id" "$id"

  mkdir -p "$CAST_OUT/decoded"
  pnpm dlx @gltf-transform/cli@4.5.1 dequantize \
    "artifacts/survivor-camp-prototype/src/assets/characters/cast/survivor-$id.glb" \
    "$CAST_OUT/decoded/$id.glb"

  blender -b -t 2 --python-exit-code 1 \
    --python tools/character/renaissance/compare.py -- "$CAST_OUT/decoded/$id.glb" "$CAST_OUT/control/$id"
done
```

The geometry base is credited to Blender Studio and community contributors. The Blender scripts use the base as anatomy reference and mesh input. Reference photos and the 2D avatar images were viewed separately from the modeling process. The studies use original geometry edits and vertex colors, with no image projections or photo textures.

## Verification

- All three latest Blender studies and the matched production controls rendered successfully in all three views.
- The production cast validator accepted all 18 current GLBs. The current game suite passed all 200 tests. These runs verify the baseline only.
- Physical iPhone Safari performance and in-game rendering of the studies were outside the completed checkpoint.
