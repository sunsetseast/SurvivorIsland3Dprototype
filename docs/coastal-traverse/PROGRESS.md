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
| 11 · final evidence/docs | all seven required reports, final-source actual captures, CI/performance evidence and ref/tree verification | final documentation head recorded in PR body |

All bounded source checkpoints were committed, saved through authenticated Git-data operations, compared against the local tree and reread from the remote ref. Command-line push lacked credentials; no repeated push attempts or resets were used. Local shadow commits differ in metadata from GitHub commits, but file trees match.

## Final implementation source and validation

Gameplay/QA source: `fcbb8751de85a5c1aeea4561a7cd46b597f2d700`, tree `8e43c1fc3e345d5d4eb1d12d3c585e426b710c8b`. Final reports/captures are documentation-only additions; [source-manifest.json](evidence/source-manifest.json) verifies all implementation bytes. The final documentation SHA is in the PR body and delivery, since a commit cannot embed its own hash.

- **174/174 tests**, including fourteen Coastal tests, TypeScript, 294 collision/six world checks and production build pass.
- Actual WebGL **6/6 grouped checks** pass on this exact source in GitHub CI: touchscreen course, beam fall/recovery/net/collection, puzzle wrong/cancel/second-finger/reset, comeback win and slower losses, three completed races/Retry, Stillwater, both previews, High and exact original camp pose/social/clock preservation. No uncaught/shader errors.
- Final evidence is checksum-verified artifact `13556133657` from run `42328080018`, SHA-256 `983e4cae72ea0d0049c271a061e6470298fb48d650887f6eb73e44f3a206508e`. Seven actual screenshots and the raw report are checked in.
- Low active samples: 72 calls, 215,058 triangles, 80 geometries, 11 textures, 127 ownership entries, 34 relevant listeners, one scene. Hub: zero owned resources/geometries/canvases/scenes, destroyed old context, stable 27 menu listeners. High and the earlier clean-main baseline are documented in PERFORMANCE.md.
- **11/11 applicable GitHub workflows pass** on this implementation commit. The legacy hero-foot check passed on a single isolated failed-job rerun with unchanged code/assertions. Final workflow conclusions and URLs: [CI_RESULTS.json](evidence/CI_RESULTS.json). Physical iPhone Safari and live hosted preview remain unverified.

## Final bounded corrections

Image-budget regression measured the intended removal of one obsolete 1×1 fallback texture. The comparison now accounts for measured fallback bytes while retaining exact non-fallback accounting and the original zero-growth ceiling; a test rejects even one unaccounted byte. No geometry/camera/performance threshold was relaxed.

An older Tonsai readiness test counted only currently visible leaf materials and stalled when LOD hid ferns. It now inspects both actual decoded hook-owned 512×512 foliage textures plus geology, retaining the same count/resolution requirements. This workflow passes on the final source.

Backward movement is bounded to each current walking segment, preventing standing re-entry through completed crawl/net/beam equipment. Fourteen Coastal tests and 174 total tests pass. Forward gameplay/rendering are unchanged. No further feature changes followed this correction.

## Continuation and verification

The branch is complete; do not recreate the PR or modify runtime bytes unnecessarily. Verify the latest remote ref/PR head and draft/open/unmerged status. The final documentation commit records the source-CI snapshot rather than claiming a different source was tested. If reviewing later, compare source hashes before reusing results.

Reproduction: the prototype's `scripts/coastal-qa.mjs` runs local development and production-preview servers with Playwright Chromium. Normal CI installs its browser/dependencies; no hosted service or Replit tooling is used. The clean-main helper is `scripts/coastal-baseline-qa.mjs`. The local QA binary workaround used in an earlier session is temporary and is not a product dependency.

No merge, deployment, publishing, permanent season/social changes or reference-repository modifications. The iPhone guide starts at the existing development Challenge Testing hub and needs no desktop/console/URL editing to play once this branch is synced.
