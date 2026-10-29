# Asset provenance and production

## Sources evaluated and selected

The existing Poly Haven **Boulder 01** scan is a substantially better starting point for the passage, alcove and strangler stone than another synthetic block. Its current official page and license were checked during this work: [model](https://polyhaven.com/a/boulder_01), [CC0 license](https://polyhaven.com/license). Creator: Rico Cilliers. The retained [source manifest](../../artifacts/survivor-camp-prototype/src/assets/camp/provenance.json) records original acquisition metadata and file hashes. This is a rock analogue, not a geological scan collected at Tonsai.

The existing **Island Tree 02** bark/foliage and **Fern 02** scan materials remain CC0; existing original coconut palms remain MIT. Their credits and image processing are in [the established asset record](../flagship-camp/ASSETS.md). No third-party runtime service, external asset dependency, paid pack or new texture is introduced.

ambientCG materials would not repair silhouettes. Quaternius' stylized foliage would not match the existing scanned foliage. Neither source was downloaded or redistributed. Reusing the already licensed and optimized scan avoids adding indiscriminate full-resolution photogrammetry. No unrelated library's licensing is assumed.

## Original authored work

`tools/camp/refinement/model.mts` is the editable offline source for the replacement trees, roots, hollow wood and rock arrangements. It uses hand-controlled trunk sections and branch paths, asymmetric cambium ridges, irregular open broken rims, transported cross sections and ground-following buttress surfaces. The strangler roots are ray-fitted against the actual stone. These are original MIT **section-authored meshes**, not professional hand-sculpted or photogrammetric tree scans. Blender was not installed in this executor, and no Blender sculpting is claimed.

The southern face and asymmetric cave vault are authored in `environment/limestone.ts`. Shared vertices smooth the coherent erosion surface, mineral coloration is separate from localized basal damp staining, and the cave mouth is genuinely open. Small scanned talus fragments sit at the cave shoulders/back below the required walking envelope.

The export is standard glTF 2 binary and can be imported into Blender for manual editing. The editable scripts, source profiles and existing source scan are sufficient to regenerate it. There is no dependency on Blender, a decoder or an asset CDN at runtime. A bespoke sculpted tree/limestone kit remains a possible future art upgrade; this report does not label the current result AAA or photorealistic.

## Runtime budgets and ownership

- `landmarks-low.glb`: only reduced meshes, no near geometry and no embedded textures.
- `landmarks.glb`: near/far meshes; foreground detail is selected by distance. Its images come from the existing shared materials rather than duplicated textures.
- Low uses reduced landmarks throughout. High switches each site to near detail within 42 m; the southern face has an 85 m near range measured from the face.
- Rock footprints are generated from the scan, rather than preserving the old rectangular boxes. Small cave fragments are nonblocking ground detail.
- Materials and geometries have scene ownership; late loader callbacks dispose their results, and the existing scene-release lifecycle observes uploaded geometry and cloned materials.

Exact bytes, triangle counts, bounds, source hashes and output SHA-256 are in [high manifest](../../artifacts/survivor-camp-prototype/src/assets/camp/landmark-manifest.json) and [low manifest](../../artifacts/survivor-camp-prototype/src/assets/camp/landmark-low-manifest.json). Test coverage enforces these budgets and independently verifies hiding surfaces and baked navigation.
