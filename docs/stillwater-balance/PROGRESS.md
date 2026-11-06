# Stillwater Balance — recovery checkpoint

Base: `bab3e4ab30075d991b98c0deed8901b96a18df7b` (main, merged PR #23). No existing PR #24 or Stillwater branch was found at startup.
Branch: `feat/stillwater-balance`. Keep the PR DRAFT; do not merge, deploy, publish, use Replit or change SurvivorIsland2025.

## Bounded implementation plan

1. **Recovery/planning — complete.** Inspected the existing ChallengeScene, eight-station individualCourse, configurations, equipment/Assembly, staged roster, travel/input ownership, first-playable plan and current tests. Reuse one active scene and camp-owned identities.
2. **Engine — complete.** Pure 60 Hz state machine, smooth disturbance/difficulty, balance recovery, timed precise placements, missed-placement strikes, last-standing/90s results, pause/retry/cancel. Eight targeted tests pass; reference feedback control survives 90 seconds with seven or more placements. Opponent controller follows at checkpoint 5.
3. **Controls — complete.** Separate pointer owners for balance/placement, pointer capture/release, cancellation, keyboard repeat suppression, sensitivity slider, blur/background pause and cleanup. Ten pure engine/input tests pass; actual browser touch sequences follow during integration.
4. **Interactive station art — complete.** Five shared instanced groups animate footboards, stack platforms, objects, counterweights and tethers from actual competitor values. Existing eight coordinates, solids and safe starts are preserved; static timber has extra lashings/braces. 23 targeted/new-plus-existing tests and TypeScript pass.
5. **Opponents — complete.** Independent deterministic feedback controllers with phase/lag/error and temporary focus/dexterity/endurance blend. Original roster/player assets are reused at station/spectator marks. Thirteen targeted tests and TypeScript pass, including all available roster sizes, no source mutation, player win/loss and multiple seeded NPC winners.
6. **Playable presentation — complete.** Single session bridge, gated station entry, original stylized host at existing mark, introduction/rules/tutorial/countdown, compact stability/placement/roster HUD, elimination notices, pause, results, retry and exploration return. Fourteen targeted tests and TypeScript pass. Browser verification and camera polish follow.
7. **Camera/WebGL — complete.** Smooth challenge camera takes over after the existing exploration camera and blends back to its safe pose. Separate active/intro/spectator/results framing, local ground scuff detail, title overlap fixed. Actual Chromium 153 SwiftShader smoke run passes, four WebGL captures inspected; 26 combined targeted tests and TypeScript pass. Full touch/repeated-session evidence follows.
8. **Full rehearsal integration — complete.** Actual CDP multitouch completes 90 seconds and nine placements with a player shared win; deliberate keyboard loss produces an independent NPC winner. Entry/duplicate gates, pointer cancellation, focus/background pause, preview replacement cancellation, four complete retries and exact source camp instance/pose restoration pass. Competitions retain byte-identical camp clock/NPC/social state. Fifteen targeted tests cover result edge cases and session ownership. Final UI/camera fixes and owner-only scene subscriptions are saved for final regression/performance verification.
9. **Regression/performance — complete.** Final runtime 35b89747b825a4c9eab9b330a89648cbe47804b0 passes 153/153 unit tests, world checks, TypeScript and production build; final WebGL harness passes 11/11 groups and ten captures are inspected. All six workflows pass at byte-identical evidence checkpoint 38b756e706d450a894b60163875655b8c0a38bc9 (mobile rerun after dependency-download timeout; no threshold changes). Active Low/High: 93 calls, 263178/647222 triangles. Four High retries retain 102 GPU geometries / 11 textures / 142 ownership entries / 15 listeners / one scene.
10. **Final reports/evidence — complete.** FINAL_REPORT.md, GALLERY.md, PERFORMANCE.md, KNOWN_LIMITATIONS.md, PROGRESS.md, CI_RESULTS.json, raw reports, regression log, source manifest, hashes and ten final captures are saved. The final remote ref/tree verification and exact final SHA are recorded in the draft PR description. No runtime edits follow the tested checkpoint.

Each numbered checkpoint gets targeted verification, a commit, push, remote SHA verification and PR update before the next milestone. If push fails, use authenticated GitHub Git-data operations. If all remote operations fail, stop implementation and save recovery material.

## Implementation decisions

- Rehearsal only; no season awards, permanent statistics, social mutations or duplicate CampRuntime.
- Eight existing stations; player plus actual available camp roster (capped to seven NPCs).
- Original short balance-and-stack endurance trial with explicit bounded victory rules; no physics dependency.
- A session owns input/camera until exit; preview replacement explicitly cancels it.
- Real browser WebGL evidence is not physical iPhone certification.

## Final status and recovery

All implementation and review deliverables are complete. Keep the PR DRAFT and unmerged. No deployment, publishing, Replit or reference-repository changes. No further implementation is pending; physical iPhone landscape acceptance and authoritative season integration remain future work.

Remote checkpoint heads (GitHub commits are the recovery authority):

| Checkpoint | Verified remote SHA |
| --- | --- |
| 1 — recovery/plan | 878d6c42146e8bcecf5255a3a91867485c09ce42 |
| 2 — engine | 912941670b05be14604140f5ade7dddb7a9ff683 |
| 3 — controls | f819cd10d394f533db01ba9bdcbf92bcf42b838b |
| 4 — stations | 28e5c8e091dbf7bb581c499bc3e0994de4d78035 |
| 5 — opponents | 8d6fc2972337b955b78fc9b7c890254419a31609 |
| 6 — playable presentation | 2a96b9f409fceb364eb9aac899c27d5565a4f591 |
| 7 — camera/WebGL | 1cc23cdfa1b77d50cfb236d8afe6f05ad6268ec7 |
| 8 — lifecycle/final runtime | 35b89747b825a4c9eab9b330a89648cbe47804b0 |
| 9 — final evidence/all six green CI | 38b756e706d450a894b60163875655b8c0a38bc9 |
| 10 — final review documents | Exact final ref-confirmed head in PR description |

If continuing later, fetch the PR head, verify evidence/runtime-manifest.json, and read FINAL_REPORT.md and KNOWN_LIMITATIONS.md. Do not reimplement or restart the completed feature. Local shadow commit metadata can differ from GitHub because authenticated Git-data API operations saved checkpoints after command-line push lacked credentials; equivalent file-tree hashes were verified without discarding local commits.
