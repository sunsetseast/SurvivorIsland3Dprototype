# Performance and cleanup

Representative actual software-WebGL samples at 932×430 DPR1. Baseline was a clean main/PR #25 worktree (`9b20b6d`), Chromium 153. Active samples were independently reproduced locally and in Chromium 156 CI. [Raw active report](evidence/browser-report.json). No physical iPhone FPS/VRAM/thermal claim.

| Sample | Calls | Triangles | Renderer geometries | Textures | Active geometry bytes | Owned entries | Scenes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Main Low preview | 84 | 243,240 | 66 | 10 | 8,364,108 | 102 | 1 |
| Coastal Low active | 72 | 215,058 | 80 | 11 | 8,873,244 | 127 | 1 |
| Main High preview | 84 | 620,772 | 78 | 10 | 10,092,068 | 114 | 1 |
| Coastal High active | 72 | 592,590 | 80 | 11 | 10,601,204 | 127 | 1 |

Baseline used the same player-start camera framing but a staged preview roster; race entrants occupy their actual lane/waiting positions. Submitted call/triangle differences reflect visibility, not a general FPS improvement. Geometry grows about 0.51MB (6.1% Low, 5.0% High). The generated mosaic adds one texture. Baseline values were recovered from the recorded original measurement after the scratch workspace changed; the versioned `scripts/coastal-baseline-qa.mjs` can reproduce it against a clean worktree.

Three completed races, including Retry and fresh Hub entry, stayed at **80 geometries, 11 textures, 127 owned entries and 34 relevant listeners**, with one scene/peak one scene. Measured Hub returns had **0 owned resources/geometries/canvases/scenes**, a destroyed old WebGL context and stable **27** menu listeners. The old renderer's stale texture counter of 1 is not live GPU memory.

The inactive exploration avatar is unmounted while Coastal owns controls/camera and its departure pose restores on exit. Obsolete sky/ground/limestone fallback textures dispose on replacement. The historical art comparison measures removed 1×1 fallback bytes explicitly while preserving exact non-fallback accounting and a zero-growth total-image ceiling. Its guard rejects one unaccounted added byte. No geometry/camera/draw thresholds were relaxed.

Only the selected challenge scene/configuration loads. Existing meshes, authored routes, six shared mosaic geometries and one generated texture avoid new asset libraries/dependencies. Player QA advances at 60Hz, spectator waits at 100ms through fixed steps, with GPU draws suppressed between selected captures. Listener instrumentation covers relevant window/document input/focus/game events, not all browser/React listeners. Geometry accounting is not total GPU memory.
