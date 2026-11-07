# Coastal Traverse — PR #26

[Draft PR #26](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/26), branch `feat/coastal-traverse`, based on main/merged PR #25 (`9b20b6da29feb0f8d23e1170bb3ae9bb4149d9e3`). Keep DRAFT and unmerged. No Replit, deployment, publishing or reference-repository changes.

## Implemented

Welcome → Challenge Testing → Play Coastal Traverse → original host/rules introduction → Ready/countdown → sprint → low crawl → moving balance beam → cargo net → collect three bundles → solve Karst Mosaic → real results → Retry / Hub / Welcome. Continue Survivor Session restores normal camp.

Two existing lanes support sequential two-person heats using the actual roster. Overall personal heat times, including mistakes, determine places; exact fixed-step ties share places. Four-minute unfinished runs are DNF. Opponents move through the same logical stages, use copied existing strength/endurance/dexterity/focus traits and independent seeded puzzle attempts. No predetermined winner or new permanent NPC/statistics are introduced.

The player moves continuously via the existing joystick/shared movement math, crawls beneath the actual frame, steers while moving across a beam that fails under neutral steering, recovers at an obstacle checkpoint with a two-second hold, actively alternates handholds across the A-frame, and collects three spatial bundles. Six authored irregular puzzle pieces require real dragging/snapping or tap/keyboard alternatives. Wrong drops reject; cancel/reset work; only the true solution finishes. The 3D boards reflect collection/placement.

Reuses the existing registry, lazy ChallengeScene, DEV-only rehearsal scope, character assets and lifecycle. Coastal has a small deterministic engine/session bridge; Stillwater's engine/session/controls are unchanged. Camera, compact stage HUD, visible roster, pause/focus handling, times/places/splits, Retry and safe exits are connected. The inactive exploration avatar is unmounted during the race, then restored.

Camp/session/participant identities, original non-default pose, NPC/provider/memory/group bytes and clock are preserved. No season/immunity/social records are written. Production access remains protected; URL flags do not unlock the hub.

## Verification

- Full local and CI tests: **173 tests** after the explicit image-budget guard; TypeScript, 294 collision/six world checks and production build were verified. Final workflow conclusions are recorded in evidence/CI_RESULTS.json.
- **Six grouped real WebGL/touch checks passed independently locally and in GitHub CI** at `629bb366bfdadb336e0bb772c10d517aaf9005a5`: actual course with beam fall/recovery, collection, puzzle wrong/cancel/second-finger/reset, comeback win, two slow-puzzle losses, Retry/three full races, stable resources, Stillwater, both previews, High mode and exact camp resume. No uncaught or shader errors. [Raw report](evidence/browser-report.json).
- Thirteen new Coastal tests cover lifecycle, movement, obstacle failures/recovery, puzzle solvability, pointer ownership, immutable traits, variable winners, ties and full-heat determinism. An image-storage guard preserves the zero-growth ceiling and rejects even one unaccounted byte.
- The remaining older scenery readiness test is being updated to inspect both real decoded 512×512 foliage textures independently of camera LOD; its resolution/count requirements remain intact. Mobile's cancelled browser installation was retried separately.

[Rules](GAMEPLAY_RULES.md) · [iPhone guide](IPHONE_TEST_GUIDE.md) · [actual screenshots](GALLERY.md) · [performance](PERFORMANCE.md) · [limits](KNOWN_LIMITATIONS.md).

Low repeats retain 72 calls / 215,058 triangles / 80 geometries / 11 textures / 127 owned entries / 34 relevant listeners. Hub returns clear scenes/resources and destroy the old context, with 27 menu listeners. High and an actual clean-main baseline were also measured. These are browser samples, not hardware certification.

## Recovery and remaining verification

All gameplay checkpoints are remotely saved. The original scratch was replaced, so screenshots/report were recovered from a checksum-verified CI archive rather than recreated as mockups. The final documentation commit and exact verified SHA are recorded in the PR body/delivery; a commit cannot embed its own SHA. [Progress](PROGRESS.md).

Physical iPhone Safari and live hosted preview were not tested or accessed. The guide requires no Mac/terminal/console/URL changes to play once the branch is synced in the existing development workflow. Full crawling rigs, IK, rigid-body rope simulation, a random puzzle library and authoritative season awards remain future work.
