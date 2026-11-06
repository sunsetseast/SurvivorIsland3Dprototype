# Resource measurements

Actual Chromium 153.0.8010.0 software WebGL, mobile landscape 932×430, DPR 1. Browser measurements only; no physical iPhone performance claim. [Raw local report](evidence/browser-report.json), [independent GitHub CI report](evidence/ci-browser-report.json) (Chromium 156.0.8078.4) and [harness](../../artifacts/survivor-camp-prototype/scripts/challenge-testing-qa.mjs). CI reproduced the same active-cycle resource counts and real touch win/loss.

| Sample | Calls | Submitted triangles | Geometries | Textures | Active geometry bytes | Programs | Tracked ownership | Relevant listeners | Active scenes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Low, active cycle 1 | 93 | 263,178 | 81 | 16 | 10,617,708 | 13 | 130 | 23 | 1 |
| Low, active cycle 2 | 93 | 263,178 | 81 | 16 | 10,617,708 | 13 | 130 | 23 | 1 |
| Low, active cycle 3 | 93 | 263,178 | 81 | 16 | 10,617,708 | 13 | 130 | 23 | 1 |
| High, introduction | 112 | 654,146 | 90 | 16 | 12,770,020 | 13 | 130 | 19 | 1 |

High is an introduction frame, not a paired active-play benchmark. Both existing quality settings were exercised and persisted across hub navigation. Geometry bytes are submitted active buffer accounting, not total resident GPU memory. Listener instrumentation counts relevant window/document input, focus, visibility and game-event listeners, not every React or browser listener.

Each complete results→Hub return, and each preview→Hub return, reached **0 canvases, 0 active scenes, 0 tracked owned resources and 0 geometries**, with the previous WebGL context lost. Menu relevant listeners remained **27**. The destroyed renderer's stale texture-info count was **1**; context destruction is verified independently. No live context or scene survives the Hub. The active scene peak was 1 throughout; repeat active samples stayed at 130 owned resources and 23 relevant listeners.

The hub requests no ChallengeScene chunk or Canvas before selecting a card. It builds only the chosen configuration, uses existing contestants/renderers and adds no asset library or dependency. The test completed three full real-result cycles, a real Retry, all three previews, quality change and restoration of a non-default camp pose without refreshing.

No FPS certification or comparison with physical Safari is inferred from manual 60Hz simulation advancement. Rendering is suppressed between selected captures to make software-WebGL integration tests practical; the actual selected frames, equipment and touch-controlled simulation are rendered by WebGL.
