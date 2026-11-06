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
9. **Local final regression/performance — complete; GitHub CI pending.** Final runtime 35b89747b825a4c9eab9b330a89648cbe47804b0 passes 153/153 unit tests, world checks, TypeScript and production build. Final WebGL harness passes 11/11 grouped checks and all 10 final captures are inspected. Active Low/High: 93 calls, 263178/647222 triangles. Four High retries retain 102 GPU geometries / 11 textures / 142 ownership entries / 15 listeners / one active scene. Six latest CI workflows are still running; verify them before declaring final completion.
10. Final report, gallery, performance, limitations, provenance and final remote verification.

Each numbered checkpoint gets targeted verification, a commit, push, remote SHA verification and PR update before the next milestone. If push fails, use authenticated GitHub Git-data operations. If all remote operations fail, stop implementation and save recovery material.

## Implementation decisions

- Rehearsal only; no season awards, permanent statistics, social mutations or duplicate CampRuntime.
- Eight existing stations; player plus actual available camp roster (capped to seven NPCs).
- Original short balance-and-stack endurance trial with explicit bounded victory rules; no physics dependency.
- A session owns input/camera until exit; preview replacement explicitly cancels it.
- Real browser WebGL evidence is not physical iPhone certification.

## Next action

Check the six GitHub workflows at runtime 35b89747b825a4c9eab9b330a89648cbe47804b0. All local final verification has passed and final evidence is saved. Finish CI_RESULTS.json, FINAL_REPORT.md and checkpoint 10 after CI completes; no runtime changes are pending.
