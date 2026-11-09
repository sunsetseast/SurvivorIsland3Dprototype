# Blender cast benchmark

The Cook Islands Ozzy candidate is a review asset. The game continues to resolve the 18 production GLBs through the existing cast manifest. [Quality decision and evidence](../../../docs/blender-character-art/PROGRESS.md).

## Rebuild Ozzy

Use Blender 4.3.2, Python 3, Node 24 and glTF Transform CLI 4.5.1. Set `BLENDER`, `PYTHON` or `GLTF_TRANSFORM` for executables outside PATH. Prepare Ara at the pinned revision and verify MakeHuman's source revision using the [PR #29 provenance report](../../../docs/character-renaissance/FINAL_REPORT.md). Use the existing Ara setup to prepare its asset library. Keep `GAME`, `ARA`, `FOUNDATION` and `OUTPUT` as absolute paths. The last two should point to separate scratch directories.

```bash
mkdir -p "$FOUNDATION" "$OUTPUT"
cp "$GAME/tools/character/bake-survivor.ts" "$ARA/scripts/bake-survivor.ts"
cd "$ARA"
SURVIVOR_BLENDER_FOUNDATIONS="$GAME/tools/character/blender/appearances.json" \
  node --import tsx scripts/bake-survivor.ts "$FOUNDATION" \
  "$GAME/artifacts/survivor-camp-prototype/src/game/character/cast.json" \
  "$GAME/tools/character/appearances.json" 1
cd "$GAME"
node tools/character/blender/build.mjs "$FOUNDATION" "$OUTPUT" 1
```

The bake supplies a shirtless, full-topology MakeHuman foundation in the PR #30 bind space. Blender applies the contestant-specific sculpt strokes and layers, creates the curl mesh and strand atlas, and fits the garment trim and cord to the deformed surface. New layers use the Head bone or inherit up to four rest-space weights from the nearest underlying body or garment vertex. The binder remaps Blender's joint palette back to the foundation order and retains the original inverse binds, joint transforms and animation samples. Meshopt and WebP packaging follows.

The appearance file holds the editable strokes, hairline locks and facial hair regions. Add authored recipes before adding IDs to a batch. The build rejects IDs without a sculpt and writes review outputs to the specified directory. Read the subject's observed reference notes and provenance before authoring. A new hairstyle or wardrobe may need its own Blender implementation. References are links, with no source photo pixels used in textures.

## Review

```bash
gltf-transform dequantize "$OUTPUT/survivor-1.glb" "$OUTPUT/review.glb"
blender -b -t 6 --python-exit-code 1 --python tools/character/blender/review.py \
  -- "$OUTPUT/review.glb" "$OUTPUT/stills"
cd artifacts/survivor-camp-prototype
CAST_CANDIDATE="$OUTPUT/survivor-1.glb" node scripts/validate-cast.mjs
PORT=5226 BASE_PATH=/ CAST_CANDIDATE="$OUTPUT/survivor-1.glb" CAST_EVIDENCE="$OUTPUT/webgl" \
  node scripts/cast-model-qa.mjs
CAST_CANDIDATE="$OUTPUT/survivor-1.glb" CAST_EVIDENCE="$OUTPUT/webgl" \
  node scripts/cast-gameplay-qa.mjs
```

The gameplay harness serves the candidate at Ozzy's existing GLB URL only on its temporary QA server. It uses the normal picker, load cache, animation player and scene transitions. The cast workflow collects the comparison, game screenshots and landscape browser metrics separately from the regular cast regression evidence.
