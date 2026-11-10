# Rebuild the Ozzy likeness candidate

Blender 4.3.2, Python 3 and glTF Transform CLI 4.5.1. Blender's bundled NumPy is used for the sculpt and texture artwork. Run from the game repository with `OUT` set to an absolute scratch directory.

```bash
mkdir -p "$OUT"
source=artifacts/survivor-camp-prototype/src/assets/characters/cast/survivor-1.glb
git show "8726885379fd6dc3b359b94ed1dcf1470c7f368d:$source" > "$OUT/production.glb"
gltf-transform dequantize "$OUT/production.glb" "$OUT/foundation.glb"

PYTHONDONTWRITEBYTECODE=1 blender -b -t 6 --python-exit-code 1 \
  --python tools/character/blender/ozzy-likeness.py -- \
  "$OUT/foundation.glb" "$OUT/authored.glb"
python3 tools/character/blender/bind.py "$OUT/foundation.glb" "$OUT/authored.glb" \
  "$OUT/bound.glb" Survivor_1
gltf-transform optimize "$OUT/bound.glb" "$OUT/survivor-1.glb" \
  --compress meshopt --texture-compress webp --texture-size 512 \
  --simplify false --resample false --join false --instance false --palette false

gltf-transform dequantize "$OUT/survivor-1.glb" "$OUT/review.glb"
blender -b -t 7 --python-exit-code 1 --python tools/character/blender/review.py -- \
  "$OUT/review.glb" "$OUT/renders" front three-quarter profile back body-front walk run
```

The [landmark inputs](../../tools/character/blender/ozzy-landmarks.json) are in metres from the Head joint. They control the primary anatomy independently of the groom. Compact radial interpolation blends the moved surface back into the existing topology. The author script restores the original inverse-bind coordinate space after applying the sculpt. It requires the foundation to have the same mesh-space transform across its joints.

For hairless comparisons, pass `--bare` to the author script, bind the result, then render the result and the baseline with `review.py -- … --bare-rest front profile three-quarter`. The groom uses fitted texture cards, an underlayer hidden within the silhouette, an original strand atlas and UV-painted skin shading. None of the external reference pixels are used in the art.

```bash
cd artifacts/survivor-camp-prototype
CAST_CANDIDATE="$OUT/survivor-1.glb" node scripts/validate-cast.mjs
PORT=5226 BASE_PATH=/ CAST_CANDIDATE="$OUT/survivor-1.glb" \
  CAST_EVIDENCE="$OUT/webgl" node scripts/cast-model-qa.mjs
```

The build writes a review GLB to scratch. The tracked [candidate](../../tools/character/blender/candidates/ozzy-cook-islands-v2.glb) is outside the game's production cast.
