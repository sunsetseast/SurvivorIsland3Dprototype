# Sanctuary asset production

This pipeline runs entirely in the development/agent environment. The player needs only the browser game; no Blender, terminal, Mac or Xcode is required on their phone.

## Regenerate

Use **Blender 4.5.3 LTS**, Linux x64 official build, hash `67807e1800cc`. Download from https://download.blender.org/release/Blender4.5/blender-4.5.3-linux-x64.tar.xz. Its official SHA-256 is `975c58fcb244273838534bba771e64ad87739216b0f9b39a888531a49a72d845`; verify the archive before extracting. Blender's official checksum list is https://download.blender.org/release/Blender4.5/blender-4.5.3.sha256.

From repository root:

```sh
BLENDER=/path/to/blender-4.5.3-linux-x64/blender node tools/blender/regenerate.mjs
node tools/blender/validate.mjs
```

The runner verifies the Blender version, invokes `--background --factory-startup --python-exit-code 1 --python tools/blender/sanctuary.py`, then validates both exported GLBs. Blender's bundled Python/numpy perform all generation; no Python package installation, external add-on or interactive editor is required. Edit the named generator functions and palette to revise the assets. Regeneration overwrites only the generated kit, its two atlases, the source `.blend` and its manifest.

## Source and runtime boundary

- `sanctuary.py`: versioned seed, reusable mesh builders, nine module definitions, atlas generation, bevel/remesh/decimation, export settings and manifest.
- `source/sanctuary-kit.blend`: editable full quality authoring scene, with packed textures. Generated **before** fallback decimation.
- `source/sanctuary-albedo.png`, `sanctuary-normal.png`: full resolution source atlases.
- `artifacts/survivor-camp-prototype/src/assets/sanctuary/`: two self-contained, game-ready GLBs and SHA-256 manifest. Vite emits hashed files; the game requests only the selected quality.
- `assetPlacements.ts`: composition and conservative route exclusions. Placement does not mutate the source meshes.
- `AuthoredSanctuary.tsx`: GLTFLoader, spatial instance batches, quality selection, loading failure fallback and resource disposal. Existing procedural roof/guardians remain visible while loading or if loading fails.

All authored positions are metres in game axes: +X map right, +Y up, +Z map down. The generator writes Blender `(x,-z,y)` and glTF's Y-up export reverses that adapter. Asset origins are ground centre, except the roof's eave datum and vines' top attachment. Apply all transforms before exporting. No imported cameras, lights, rig or animation is exported.

## Materials and budgets

Two shared opaque PBR materials: stone/brick/timber/terracotta/bronze palette, plus double-sided foliage using the same atlas. Roughness is constant 0.94, metalness zero; albedo, tangent-space normal and per-vertex weather colors survive glTF export. Texture effects are generated into PNGs, rather than relying on unsupported procedural Blender nodes. Eight padded atlas cells prevent cross-material bleeding. These are original, generated textures and carvings, not scanned photogrammetry or hand-painted museum reproductions.

Full kit: 33,198 triangles, 6,883,360 bytes, two 1024² atlases. Fallback: 16,734 triangles, 2,460,072 bytes, two 512² atlases. The validator enforces complete binary buffers, finite attributes, normals/UV/weather colors, embedded textures, names, metres/Y-up bounds, SHA-256 and matching generator source, <=2 materials, <80k triangles, <8 MB full, <3 MB low and meaningful fallback savings. GPU texture storage including mipmaps is approximately 10.67 MiB full / 2.67 MiB low; these are atlas estimates, not whole-game GPU memory measurements.

`?quality=low` forces the fallback. Devices reporting <=4 logical processors select it automatically. Low quality also caps DPR at 1 and disables the scene's shadow map. Full quality preserves the existing DPR cap 1.5 and one 1024² directional shadow. Both retain controls, navigation, voting and ceremony staging. Spatial batches preserve frustum culling; no alpha-blended fern cards or additional shadow-casting point lights are introduced.

## Architectural references

The sanctuary is an original fictional environment with a coherent central Thai inspiration, not a reconstruction of a named temple. References informed shapes and materials; their imagery is not included in the assets.

- [UNESCO: Historic City of Ayutthaya](https://whc.unesco.org/en/list/576/) — ruined prang skyline and monumental monastery context.
- [UNESCO: Thailand's forgotten palace](https://www.unesco.org/en/articles/thailands-forgotten-palace) — tiered Thai roofs, gable ends and open pavilion composition.
- [Montreal Museum of Fine Arts: Architectural Finial, Naga](https://www.mbam.qc.ca/en/works/59645/) — Thai Ayutthaya-period ceramic roof ornament.
- [Smithsonian National Museum of Asian Art: scaly naga fragment](https://asia-archive.si.edu/object/FSC-P-5836/) — Sukhothai ware architectural ornament and scale language.

Elephants, naga, lotus reliefs and roof ornament are original stylized carvings. No sacred figure has been copied. This is a focused programmatic technical-art kit; scanned surfaces, production sculpting and photoreal character art remain separate future work.
