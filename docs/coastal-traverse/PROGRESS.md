# Coastal Traverse — checkpoint and recovery record

Base: main `9b20b6da29feb0f8d23e1170bb3ae9bb4149d9e3`, merged PR #25. Branch `feat/coastal-traverse`. [DRAFT PR #26](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/26). No pre-existing Coastal branch/PR was found. No Replit, deployment, publishing, merging or reference-repository changes.

## Design and completed work

Two existing lanes x=-27/-14 support sequential timed heats, not overlapping contestants. Start z=-50; crawl -37..-31; beam -24.5..-17.5; A-frame net -8.1..-1.9; finish deck z=18. Overall personal elapsed times determine places; exact ties share places, unfinished four-minute runs are DNF. Six authored geometric mosaic pieces tile a known valid solution. Existing roster/traits, controls, scene, lifecycle and DEV admission are reused. No permanent camp/social/season changes.

| Checkpoint | Implemented and targeted validation | Verified GitHub save |
| --- | --- | --- |
| 1 · recovery/design | latest main/PR #25, no prior #26, geometry/traits/control inspection and plan | `3ec6a269a341e54f1060b76e750ec5ae3adca0e3` |
| 2 · engine | fixed-step lifecycle, heats, splits, ties, pause/cancel/retry | `4737702eb5735e2d749c2c5d4a02621836f71f7f` |
| 3 · sprint/crawl | continuous lane movement, low-profile traversal; corrected double transition movement after test failure | `c7fb58388b3900fb2a1423c1f7fc9914d0c16b46` |
| 4 · beam | moving balance, stability, real fall and timed checkpoint recovery | `aac656e624caf59b5376ace6d18ea79ce8216b51` |
| 5 · net | alternating hands, repeat suppression, slips and real A-frame progress | `d97d7d4dff19362152386d20694e725f3616a541` |
| 6 · mosaic | actual spatial collection, solvable drag/snap/reset/cancel puzzle and matching 3D boards | `e06ae2d7d14b1e7e95189b0dca6d94557f9eaf5c` |
| 7 · contestants | independent trait-driven stage/puzzle attempts; ten seeds with variable winners and immutable source data | `712af6206eb51f0b46d7061985f9dda66ff814a5` |
| 8 · integration | same scene/hub, host/rules/Ready, owned touch/keyboard, camera, results and safe exits | `592bd914c4743f2f8b3ed77b448738d875307db5` |
| 9 · browser fixes | camera ownership, navigation/joystick separation, pointer-ID cleanup, correct contact test sequence, camp preservation and completed touch win/loss/retry cycles | `f23402cc9b53a53e17fca7739f6db981c5975da0`, `f78ca4c8870234bd938aef5efe15e55c8f3b7057` |
| 10 · performance/regression | release inactive avatar and obsolete fallback textures, clean-main WebGL baseline, strict repeat resources, full tests and final beam/net rule review | `ad9c9f6e329cb6a0bb0ac689b5ad37c8fc84263e`, `73ffb65916b72c0790c5a68ad24f01c61b73d3fb` |
| 11 · final evidence/docs | all required guides/reports and inspected actual captures prepared; await final CI conclusions/ref verification | final head recorded in PR body after save |

All bounded source checkpoints were committed, saved through authenticated Git-data operations, compared against the local tree and reread from the remote ref. Command-line push lacked credentials; no repeated push attempts or resets were used. Local shadow commits differ in metadata from GitHub commits, but file trees match.

## Current verified state

Final source/harness freeze: `73ffb65916b72c0790c5a68ad24f01c61b73d3fb`, tree `4ea9a97192e97b83df6d8321c032927ea3d7d9ac`.

- Final local **172/172 tests**, TypeScript, 294 collision/six world checks and production build pass.
- Final local actual WebGL **6/6 grouped checks**, real touch comeback win and slower losses, physical beam fall/recovery/net/collection, mosaic wrong/cancel/second-finger/reset, three complete races/Retry, Stillwater, both previews, High and exact original camp pose/social/clock preservation pass. Zero uncaught/shader errors.
- Active samples: 80 geometries, 11 textures, 127 ownership entries, 34 relevant listeners, one scene. Hub: zero owned resources/geometries/canvases/scenes, old context destroyed, stable 27 menu listeners. Clean main Low/High baseline and seven final captures are available.
- GitHub runs for the frozen source are being verified. Shared fallback cleanup correctly triggers additional environment checks, beyond the six original workflows. Record every applicable conclusion in evidence/CI_RESULTS.json; do not claim all CI until all relevant runs pass.

## Exact continuation if interrupted

Do not recreate the branch/PR or change runtime bytes unnecessarily. Read latest PR body/ref and compare source-manifest.json. Poll workflow runs for the frozen SHA, inspect any failed job logs and fix actual failures without lowering thresholds. The new Stillwater workflow contains both existing Stillwater/hub and separate Coastal jobs. Preserve their artifacts.

Local reproduction: prototype `scripts/coastal-qa.mjs`; this environment uses `CAMP_CHROMIUM=/tmp/coastal-chromium/chromium LD_LIBRARY_PATH=/tmp/coastal-chromium` (QA-only binary outside product dependencies). Clean baseline helper uses `BASELINE_ROOT=/tmp/coastal-baseline`. Do not use system Chromium here: its native sandbox socket initialization failed. Normal CI installs Playwright Chromium.

After final CI verification: save docs/coastal-traverse/ (exclude stale FAILURE.jpg or unlisted captures), verify local/remote tree and branch SHA, update existing draft PR with exact head and report/guide/gallery links, verify draft/open/unmerged. No merge/deployment/publishing. A documentation commit cannot embed its own SHA; put it in the PR body and final delivery. Physical iPhone/live hosted-preview checks remain explicitly unverified.

CI caught the intended five-and-one-third-byte removal of one 1×1 fallback in the historical art pair: its old equality assertion rejected reduced storage. The revised fixture measures 1×1 DataTexture bytes on both refs; comparison retains exact non-fallback accounting and the zero-growth total ceiling. A dedicated test rejects even one unaccounted added byte, added fallbacks and unrelated image removal. No performance ceiling or geometry/camera threshold is relaxed. Runtime/gameplay bytes remain unchanged from 73ffb659; revalidate the corrected comparison in CI.

## Recovery checkpoint after scratch replacement

Recovered source 629bb366 from GitHub, and all seven screenshots plus six-group passing report from verified artifact 13520065217 (SHA-256 b11a7d988f7472062460349fb0fb1f7409bfc50938e041293619e3facd657d8f). All seven final documents are now being saved with this checkpoint. Ten workflows passed on 629bb366; the remaining historical Railay readiness test only saw visible leaf maps and stalled when restored camera LOD hid ferns. It now verifies both real hook-owned decoded 512×512 foliage textures as well as geology, preserving count/resolution requirements. No gameplay mechanics changed. Local 173 tests and TypeScript pass; follow the new checkpoint CI before final completion.

Final collision guard: per-stage backward limits prevent standing backtracking through completed crawl/net/beam equipment. All 14 Coastal tests, 174 total tests and TypeScript pass. Forward-path frames/results do not change. This bounded correction is saved before final CI wait; no further gameplay additions are planned.
