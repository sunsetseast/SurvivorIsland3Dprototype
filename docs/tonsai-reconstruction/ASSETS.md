# Asset provenance and authoring

All shipped third-party material comes from the already licensed project kit. New botanical/shelter geometry and texture composition are original reproducible work. No new game runtime dependency was added.

| Input/output | Origin and license | Modification/use |
| --- | --- | --- |
| Existing coastal tree, bark, photographic leaf atlas | Poly Haven `island_tree_02`, CC0; creator and source-file checksums retained in `src/assets/camp/provenance.json` | Reused scan trunk in the fig mix; shared bark/leaf materials for new foliage. |
| `canopy-spray.png` | Derived from that same CC0 photographic leaf atlas | `tools/camp/reconstruction/textures.py` crops, arranges and bakes an asymmetric branch spray. No reference photograph is included. |
| `reconstruction.glb` / `reconstruction-low.glb` | Original project work, MIT; embedded branch spray derives from the CC0 input above | Three crown architectures, tapered curved wood, cupped understory leaves, lashed bamboo structure, slat floor, thatch and visible supplies. Low exports omit near meshes and simplify shelter geometry. |
| Limestone, talus and spring rocks | Existing Poly Haven `boulder_01`, CC0, and project materials | Retained scanned detail, with a new original southern headland profile and stable cave. Large headland geometry is not a stretched boulder scan. |
| Ground materials | Existing Poly Haven `sand_02` and `brown_mud_leaves_01`, CC0 | Continuous habitat blending, moisture transition and ground contact shading. |
| Ferns / palms | Existing licensed kit; see `docs/flagship-camp/ASSETS.md`, `src/assets/tonsai/botanical-manifest.json` | Reused ferns and full palms; scaled juvenile palms in the coastal understory. |
| Ground details / vines / camp work debris | Original project work, MIT | Terrain-following leaf litter, branches, hanging vines, fuel, coconut husks and spare materials. |

This is offline control-point and mesh authoring with an existing scanned material library. The reconstruction was authored through the retained scripts, rather than a Blender hand-sculpting workflow. The PR does **not** claim hand sculpting, new photogrammetry, or Blender-authored production assets. Existing project `.blend` source scenes remain available. Geometry and optimized binary exports are reproducible from the scripts retained here. The low exporter preserves the thin rope-lashing mesh: applying the shelter-wide simplification tolerance had erased it entirely. A packed-mesh assertion now protects those visible bindings.

## Source evaluation

- [Poly Haven license](https://polyhaven.com/license): CC0 redistribution permits the existing source kit and its derivatives. Reusing these assets keeps material scale and licensing consistent.
- [ambientCG](https://ambientcg.com/): evaluated as a CC0 PBR source; the existing sand/litter library already covers this scene's ground needs, so no additional download is shipped.
- [Quaternius Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html): its page identifies CC0 free models and several product tiers. Its broader Ghibli-oriented library was evaluated; no tier-specific assets or shaders are copied.
- [Sketchfab foliage example](https://sketchfab.com/3d-models/foliage-assets-low-poly-ca88e522c4ff4930a026723baa2832f9): considered during discovery; no model was acquired, and no redistribution license is assumed.
- Ultra-Water was read for technical comparison only. No source code, shaders, textures or binaries were copied. See WATER_EVALUATION.md.

## Reproduce

From `artifacts/survivor-camp-prototype`, with Python/Pillow and the repository dependencies installed:

```bash
python3 ../../tools/camp/reconstruction/textures.py
node --import tsx ../../tools/camp/reconstruction/build.mts
node --import tsx ../../tools/camp/refinement/build.mts
node --import tsx ../../tools/camp/refinement/migrate.mts
node --import tsx scripts/bake-camp-navigation.mjs
```

The first two commands build the new kit. The next two regenerate the modified cliff and independently validate all 39 existing surface anchors. Navigation baking is only necessary after relevant source changes. Runtime code loads web exports, shares textures/materials and disposes location-owned resources.
