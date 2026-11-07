# Known limitations

- Actual iPhone Safari, FPS, thermal behavior and the live hosted preview were not tested. Evidence uses trusted browser touch/CDP events and software WebGL. No Replit tools/Agent/credits, deployments or publishing were used.
- Two physical lanes require sequential timed heats. Other heats must finish before overall results. Waiting entrants stage outside the course; there is no crowd overtaking or simultaneous five-lane race.
- Existing rigs use authored crouch/work/movement poses. There is no full crawling rig, skeletal IK, rigid-body net or rope physics. Normal traversal is continuous; falls alone use explicit obstacle checkpoints.
- The mosaic is one authored solvable six-piece layout, with irregular trapezoids and a shuffled tray. It has no rotation mechanic or random puzzle generator. A reliable DOM interaction layer sits at the real 3D finish station; collection and placements update its boards.
- Traits/results are temporary. No authoritative immunity/season integration or permanent statistics are added. Stillwater remains available and Ocean/Jungle remain previews.
- Landscape is recommended. Safe-area styling and touch targets were exercised in browser emulation; hardware review remains necessary.
- Player QA uses manual 60Hz advancement, spectator waits use 100ms updates through the same fixed-step engine, and rendering is suppressed between selected captures. Resource counts are not VRAM-byte or device-FPS measurements.
- A destroyed renderer may retain a stale texture counter of 1; teardown separately verifies lost context and zero owned resources/geometries/canvases/scenes.
- The original scratch workspace was replaced between sessions. Final screenshots/raw gameplay report were recovered from checksum-verified GitHub CI artifacts. Baseline numbers are retained from the earlier actual clean-main WebGL measurement; no fresh baseline run is claimed for the recovery session.
- Existing Vite large-chunk/static-dynamic-import warnings remain. No performance ceiling was raised.
