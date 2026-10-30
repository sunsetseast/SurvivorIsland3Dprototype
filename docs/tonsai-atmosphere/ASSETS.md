# Assets and shaders

| Asset / code                                            | Source and rights                                                         | Use                                                                                                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tropical-clouds.png` and authoring script              | Original project work under the repository MIT license                    | Thirteen seeded, eroded density-volume formations; offline light extinction and front-to-back integration, composited into one wrapping RGBA atlas. No acquired/AI-generated/reference photograph. |
| Tropical sky shader / shared atmosphere / water changes | Original project work, using Three.js shader chunks under its MIT license | Gradient, solar halo/disc, atlas sampling, drift, output conversion and water Fresnel color. No copied Preetham implementation.                                                                    |
| Reconstruction low/high GLBs                            | Existing original project geometry and CC0-derived photographic foliage   | Far leaf section reduction only. Existing scan/atlas rights and checksums are retained; see [PR18 provenance](../tonsai-reconstruction/ASSETS.md).                                                 |
| Rock, sand, litter, palms and ferns                     | Existing licensed project kit                                             | Material refinement/reuse; no new external mesh download.                                                                                                                                          |
| Comparison images                                       | Actual Chromium production WebGL output                                   | Originals are retained in `evidence/before` and `evidence/after`; contact sheets only resize and label them.                                                                                       |

The cloud atlas manifest records PNG dimensions, bytes, SHA-256 and authoring-script SHA-256. Regenerate it with Python 3, NumPy, SciPy and Pillow:

```bash
python3 -m pip install -r tools/camp/atmosphere/requirements.txt
python3 tools/camp/atmosphere/clouds.py
```

Regenerate both foliage kits from the app directory with `node --import tsx ../../tools/camp/reconstruction/build.mts`. No authoring library is a game runtime dependency. The existing GLB generation and manifest/hash tests protect the rebuilt assets.

Primary technical references reviewed:

- [Three.js atmospheric Sky](https://threejs.org/docs/pages/Sky.html) and [official example](https://threejs.org/examples/?q=sky#webgl_shaders_sky): analytic daylight alternative, evaluated rather than copied.
- [Three.js Material](https://threejs.org/docs/pages/Material.html): alpha hashing adds noise; alpha-to-coverage smooths clipped edges when the context has MSAA.
- [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html): shader ownership, uniforms and color/output integration.
- The installed Three.js 0.186.1 shader chunks and renderer, and the project's own PR18 production evidence, were inspected directly.
