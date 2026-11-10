# Playable character benchmarks

Cirie Fields · Heroes vs. Villains · ID 10
Carolyn Wiger · Survivor 44 · ID 17

## Open the private preview

On a computer running this branch, install the workspace dependencies, then start the existing Vite game on the private network.

```sh
pnpm install --frozen-lockfile
cd artifacts/survivor-camp-prototype
PORT=5173 BASE_PATH=/ node node_modules/vite/bin/vite.js --host 0.0.0.0
```

On an iPhone connected to the same private network, open `http://<computer-LAN-IP>:5173/?cast-preview=benchmarks` in Safari and turn the phone to landscape. Tap **New survivor**, select **Cirie Fields** or **Carolyn Wiger**, then tap **Start with …**. Use the normal joystick and **Run** toggle in camp. The query parameter selects the two candidate GLBs in Vite development. A URL without it uses the shipping cast. The production build excludes the candidate route and payloads. Selections and saves continue to use the original IDs.

## Visual review

| Candidate | Matched Blender views | Real Three.js captures |
| --- | --- | --- |
| Cirie | [Face angles](evidence/cirie-face.jpg) · [Full-body angles](evidence/cirie-body.jpg) | [Picker and camp](evidence/cirie-game.jpg) |
| Carolyn | [Face angles](evidence/carolyn-face.jpg) · [Full-body angles](evidence/carolyn-body.jpg) | [Picker and camp](evidence/carolyn-game.jpg) |

[Blender motion poses](evidence/motion-poses.jpg) · [Asset report](evidence/asset-report.json) · [Browser report](evidence/webgl-report.json)

Cirie has a fuller torso and legs, a fitted turquoise tank with visible ties and trim, a low braid gather and a blue Buff. The dark shorts are a practical interpretation of the obscured lower layer. Carolyn has separate blonde locks with darker roots, a plum button-front top, a white-and-navy grid shirt tied at the waist, a purple Buff and asymmetric arm ink. The sleeve is a study of the visible color and petal shapes. The hidden wrap, small lettering and thigh placement still need evidence.

The candidates make the selected outfits and silhouettes easier to identify at game distance. Close-up likeness is still below the release target, particularly around the eyes and mouth. Carolyn’s long locks can separate and her tied shirt can intersect the body in deep poses. Cirie’s tank hem still needs a seated-pose polish pass. The hands use wrist-driven weights, and the Buff prints are stylized. A further likeness pass needs direct sculpt and paint work against the existing front, three-quarter and profile references.

## Verification

| Asset | GLB bytes | Triangles | Material primitives |
| --- | ---: | ---: | ---: |
| Cirie | 328,164 | 16,927 | 9 |
| Carolyn | 367,716 | 20,341 | 11 |

- Both GLBs preserve the same 66 joint names and 13 clip names, channels and sample times. The asset report records normalized animation and weight error, size, triangles and material primitives. The decoded Khronos validator reported zero errors and warnings.
- A landscape touch Chromium run loaded the exact candidate bytes in the normal picker, entered camp, and played walk and run for both characters. It checked the shipping payloads with the preview flag removed. The close camp frames use a tighter review camera in the running game. The standing and moving frames use the regular game camera.
- Blender evaluated and rendered idle, walk, run, sit and climb. TypeScript, the Vite production build, the shipping cast validator and 200 regression tests passed. The Chromium render used software WebGL. Physical iPhone Safari performance and deformation remain open. Desktop WebKit launch was blocked by missing system libraries.

## Rebuild

The basis is the [Blender Studio Human Base Meshes v1.4.1](https://www.blender.org/download/demo-files/#assets) CC0 bundle, ZIP SHA-256 `811f43accbb31a88266d932f8f5563b2d13586fca0ba2693aad1f5fe582b3515`. The studio mesh is the starting topology. The two landmark sculpts, body shaping, fitted garments, hair geometry and paint are authored in [author.py](../../tools/character/benchmarks/author.py). Photography is used as reference for the art. Rig and clip provenance is recorded in the [original cast work](../character-renaissance/FINAL_REPORT.md).

Use Blender 4.3.2, glTF Transform 4.5.1 and Python 3 with NumPy.

```sh
tools/character/benchmarks/build.sh /path/to/human_base_meshes_bundle.blend /tmp/survivor-benchmarks
gltf-transform dequantize /tmp/survivor-benchmarks/survivor-10.glb /tmp/cirie-review.glb
blender -b -t 2 --python-exit-code 1 --python tools/character/benchmarks/review.py \
  -- /tmp/cirie-review.glb /tmp/cirie-render
```

Run the browser check from `artifacts/survivor-camp-prototype` using `node scripts/cast-benchmarks-qa.mjs`. Set `CAMP_CHROMIUM` for a local Chromium executable and `CAST_EVIDENCE` for a separate output directory.
