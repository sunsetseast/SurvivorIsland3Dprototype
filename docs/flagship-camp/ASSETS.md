# Camp asset provenance and production

All newly imported third-party assets are CC0. [Poly Haven's license](https://polyhaven.com/license) explicitly permits modification, redistribution and commercial use without attribution. Credit is retained here. Source API metadata, per-file MD5 values and creators are recorded in [`provenance.json`](../../artifacts/survivor-camp-prototype/src/assets/camp/provenance.json); final GLB SHA-256 and transfer sizes are in [`transfer-manifest.json`](../../artifacts/survivor-camp-prototype/src/assets/camp/transfer-manifest.json).

| Shipped asset | Source and creator | License | Production |
| --- | --- | --- | --- |
| `camp/limestone.glb` | [Boulder 01](https://polyhaven.com/a/boulder_01), Rico Cilliers / Poly Haven | CC0 1.0 | Welded scan, preserved relief and UVs, upright uniform-scale cliff orientation; 8,000 / 2,200 triangle meshes. Runtime talus restores the scan's broad horizontal base and buries its contact edge |
| `camp/coastal-tree.glb` | [Island Tree 02](https://polyhaven.com/a/island_tree_02), Rob Tuytel and Rico Cilliers | CC0 1.0 | Root-centered scanned trunk/branches. Complete source leaf islands fitted to UV planes: 3,200 leaf cards near and 520 far, with restored separate alpha. Near foliage is no longer reduced into slivers |
| `camp/sand_02-*` | [Sand 02](https://polyhaven.com/a/sand_02), Charlotte Baglioni | CC0 1.0 | Photographic fine grain; albedo graded toward warm pale coastal sand in the shader; wet edge uses the same mesh |
| `camp/brown_mud_leaves_01-*` | [Brown Mud Leaves 01](https://polyhaven.com/a/brown_mud_leaves_01), Rob Tuytel | CC0 1.0 | Forest litter/moss/soil detail, continuously blended with sand and worn paths |
| Existing `tonsai/fern_02.glb` | [Fern 02](https://polyhaven.com/a/fern_02), Rob Tuytel and Rico Cilliers | CC0 1.0 | Existing repaired RGBA scan, four 699–700 triangle silhouettes, normalized per-variant origins; unchanged source file |
| `camp/palms.glb` | Original `tools/blender/botanical-hero.py` palm modules from PR #12 | Original MIT work | Extracted three coconut-palm forms and their near/far meshes; curved trunks, rachises and individual pinnae. No imported commercial palm asset |

The source boulder is a visual rock analogue, **not a verified scan of Krabi limestone**. The coastal tree is likewise a branching/foliage analogue, not a verified Thai species specimen. The report does not mislabel these scans as field measurements from Tonsai.

## Pipeline

Powered by Poly Haven for offline acquisition. The running game never calls the public asset API or a third-party asset CDN.

```bash
python tools/camp/acquire.py /tmp/camp-sources
blender -b --python tools/camp/build.py -- /tmp/camp-sources
python tools/camp/pack.py /tmp/camp-sources
```

`acquire.py` downloads only the selected models and two materials, checks source MD5 values, records creators, and combines the tree's separate leaf alpha with its albedo. `build.py` uses Blender 4.5 LTS for welding, reduction, root correction, complete-leaf retopology and GLB export. It extracts only the required original palm modules. `pack.py` retains geometry/UVs and repacks web images: 1024px leaf cutouts and rock albedo, 512px other model maps, 1024px ground albedo and 512px ground normals. It is idempotent after packing and records final hashes.

[`tools/camp/source/camp-kit.blend`](../../tools/camp/source/camp-kit.blend) is an editable production scene, outside the web build. The shipped GLBs contain their images and require no Blender installation, Draco decoder or additional runtime package. `build-manifest.json` records Blender version, exported mesh bounds and triangle counts. `flagship-camp.test.mjs` checks hashes, finite geometry, part names, root alignment and budgets.

## Alternatives evaluated

- [ambientCG](https://docs.ambientcg.com/license/): a useful material source; another ground/rock texture would not by itself solve cliff massing or tree architecture, so no files were imported.
- [Kenney Nature Kit](https://kenney.nl/assets/nature-kit): its official page identifies CC0 assets, but the simple stylized forms do not match this PBR direction.
- [Quaternius nature packs](https://quaternius.com/packs/ultimatestylizednature.html): evaluated stylistically, not imported. No assumption about redistribution rights is needed for this PR.
- Rock Face 02 / Coast Rocks 02 were actually downloaded and inspected, then rejected for this use. Only selected exports are shipped; neither unused scan is in the runtime or source scene.

## Visual references → implementation choices

References were viewed for art direction only; photographs are linked, not redistributed or used as textures.

| Reference | Observed characteristic used in Camp |
| --- | --- |
| [Tonsai cove](https://viakrabi.com/places/tonsai-beach/) and [Railay/Tonsai photographs](https://thecragjournal.com/2023/02/01/climbing-in-thailand-a-journey-through-south-east-asia/) | Unequal headlands, open water to the west, compact sand strip against forest; no circular enclosing wall |
| [Railay climbing reference](https://www.railay.com/railay/climbing/climbing_intro.shtml) and [SouthClimb photographs](https://www.southclimb.com/en/activity/thailand) | Gray/warm mineral faces, shaded overhangs, fractured crests, vegetation on ledges; scanned relief and overlapping solid masses replace the noise field |
| [Flora of Thailand coastal survey](https://thesiamsociety.org/wp-content/uploads/2020/04/NHBSS_021_3-4l_Larsen_ReportOnTheFlora.pdf) | Beach vegetation differs from inland forest. Palms sit on the coastal margin, broadleaf cover rises inland, and ferns concentrate in the understory rather than covering the tide line |

This remains an interpreted fictional competition cove. No hotels, roads, restaurants, tourist signs or resort equipment were introduced.
