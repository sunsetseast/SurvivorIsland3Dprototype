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
7. Dedicated smooth camera and immediate-clearing polish; actual WebGL captures.
8. Access/exit/retry/preview-switch rule and exact camp preservation; integration tests.
9. Full regression, Low/High real WebGL resource measurements and repeated retries.
10. Final report, gallery, performance, limitations, provenance and final remote verification.

Each numbered checkpoint gets targeted verification, a commit, push, remote SHA verification and PR update before the next milestone. If push fails, use authenticated GitHub Git-data operations. If all remote operations fail, stop implementation and save recovery material.

## Implementation decisions

- Rehearsal only; no season awards, permanent statistics, social mutations or duplicate CampRuntime.
- Eight existing stations; player plus actual available camp roster (capped to seven NPCs).
- Original short balance-and-stack endurance trial with explicit bounded victory rules; no physics dependency.
- A session owns input/camera until exit; preview replacement explicitly cancels it.
- Real browser WebGL evidence is not physical iPhone certification.

## Next action

Polish smooth camera and nearby composition, then capture real WebGL (checkpoint 7).
