# Stillwater Balance — first playable immunity rehearsal

PR: https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/24

Branch: `feat/stillwater-balance`

Base: `bab3e4ab30075d991b98c0deed8901b96a18df7b` (merged PR #23).

Tested runtime: `35b89747b825a4c9eab9b330a89648cbe47804b0`. Final evidence/documentation commits preserve the runtime manifest. The exact final ref-confirmed head is recorded in the PR description after the final save.

## What is playable

Use the existing authorized Challenge Beach rehearsal (`?devTravel=1` in development, or the existing explicitly enabled rehearsal build). Travel from the camp departure with its scoped grant; select **Individual · Stillwater Balance** in the existing developer selector. Walk to the clearing viewpoint or one of the safe station approaches. The nearby **Enter challenge** action opens a host introduction, rules, tutorial and ready interaction. A three-second countdown transfers to a real balance/placement competition. Normal release admission remains closed.

The original eight station locations and collision footprints are retained. The available rehearsal currently has **you, Boston Rob, Sandra, Parvati and Russell**, leaving three stations unoccupied. Assignment supports player plus zero to seven distinct existing NPC identities and caps to the valid station count. No NPCs or persistent character statistics are fabricated.

## Rules and controls

- Drag the dedicated balance pad left/right, or use **A/D or Left/Right arrows**, to counter the predictable moving balance marker. Returning the input to neutral is deliberate; the platform still moves.
- **Place / Space** confirms the next object. The first object is ready at eight seconds, then one every ten seconds. Center the marker inside the gold precision band and slow its motion; a successful placement adds one object and restores stability.
- Each ready object has seven seconds of grace. A poor placement or expired deadline adds a miss; a poor attempt also disturbs the station and drains stability. Early placement inputs are ignored.
- Staying inside the balance band restores stability. Moving outside it drains stability according to distance and increasing difficulty. Zero stability, balance beyond the fall limit, or three misses eliminates a contestant.
- Last remaining contestant wins. At 90 seconds, survivors rank by objects placed, then stability. Exact ties share a place/win. A solo/all-out failure has **no winner**. Earlier eliminations rank behind later eliminations.
- Touch correction has a **0.5–1.5 sensitivity** adjustment and smoothing. Balance and placement fingers have separate owners. Pointer cancellation/lost capture releases correction. Keyboard repeat cannot duplicate placement.
- Pause/Escape, lost focus or backgrounding freezes the simulation. Resume is explicit. Results provide retry and return to exploration. A preview replacement explicitly cancels the active rehearsal; returning to staging/camp uses the original journey flow.

## Competition and presentation

A pure fixed-step 60 Hz engine owns temporary station state. Authored multi-frequency motion, balance velocity/control smoothing, stability, deadlines and placement checks are independent of render FPS. Opponents run independent seeded feedback controllers with lag/error/fatigue and temporary read-only blends of existing **focus, dexterity and endurance**. There is no predetermined elimination order. Retries reuse the same seed for comparable attempts; alternate seeds produce different NPC winners in tests.

The existing contestant assets are staged through the rehearsal renderer; a simple original stylized host uses the shipped avatar representation at the existing host area. Intro/rules, tutorial, countdown, stability/precision bands, placement feedback, remaining roster, elimination notices and a ranked rehearsal result are implemented. Five shared instanced groups animate boards, platform tilt, object stack/wobble/fall, counterweights and tethers. Timber braces/lashings and local ground wear improve the immediate clearing without rebuilding other zones or adding texture/model libraries.

The challenge camera runs after the existing exploration camera, blends through intro/active/spectator/results poses, frames the winner beside the results panel and restores the exploration camera. HUD ticks do not rerender the world scene. Player/contestant visuals read actual engine values; the hidden exploration player retains original movement/camera authority underneath the temporary session.

## Verification

**153/153 unit tests, 11/11 grouped real-WebGL checks, world checks, TypeScript and production build pass. All six CI workflows pass at evidence checkpoint `38b756e706d450a894b60163875655b8c0a38bc9`, whose runtime matches the tested source.**

| CI workflow | Result |
| --- | --- |
| [Challenge Beach rehearsal and WebGL](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42135666492) | Success |
| [Connected island journeys](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42135666598) | Success |
| [Stillwater Balance playable rehearsal](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42135666554) | Success |
| [Living camp checks](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42135666565) | Success |
| [Flagship camp visual and gameplay checks](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42135666690) | Success |
| [Mobile gameplay controls](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42135666524) | Success |

The mobile workflow passed Chromium and WebKit after retrying one dependency-download timeout; no tests or thresholds were changed. Final documentation commits preserve the source manifest; the PR description records the exact final remote head.

Final verification records are in [evidence/regression.log](evidence/regression.log), [evidence/browser-report.json](evidence/browser-report.json), [CI_RESULTS.json](CI_RESULTS.json), [PERFORMANCE.md](PERFORMANCE.md) and [GALLERY.md](GALLERY.md).

The new 15 focused tests cover transitions/countdown; fixed-step determinism; stability/placement/recovery; increasing difficulty; pause/resume; failure, last-standing, timed/exact-tie/all-out outcomes; retry/cancel; unique/capped rosters of different sizes; independent opponents; source immutability; pointer ownership/cancellation, sensitivity and repeat suppression; session lifecycle and station visual mapping. They run alongside the unchanged existing regressions. No existing thresholds are weakened.

The real WebGL harness uses trusted keyboard and Chromium CDP touch events, including simultaneous balance/placement fingers. A successful 90-second touch attempt places nine objects with no duplicate actions and earns a shared player win; a deliberate keyboard mistake eliminates the player and lets an NPC win. It also exercises duplicate/nearby gates, touch cancellation, blur/background/manual resume, four complete retries, preview replacement, subsequent challenge entry/exit and exact camp return. Camp clock/NPC/social-memory bytes are unchanged during competitions, original runtime/provider/NPC/memory objects are retained, and normal camp movement resumes after return.

Browser evidence is **Chromium software WebGL, emulated landscape 932×430 DPR1**, not physical iPhone 17 Pro Max certification. Existing automated WebKit mobile-control checks are additional regression coverage, not a physical Safari playability claim.

## Checkpoints and scope

**All ten checkpoints are complete and saved through remotely verified GitHub commits.** Final regression/performance and all six CI workflows pass, and the final reports, provenance and inspected captures are committed. See [PROGRESS.md](PROGRESS.md) for the recovery record.

Rehearsal results never award immunity, permanently eliminate contestants, mutate social trust, create another CampRuntime, or advance the season. The existing four-zone/single-active-configuration architecture and exact originating camp instance/pose remain intact. No merge, deployment, public preview publication, Replit Agent/credits or reference-repository modification occurs.

## Recommended next challenge

**A small playable puzzle finish for Coastal Traverse.** Reuse the existing Main Beach finish decks and build a deterministic touch/keyboard arrangement puzzle with independent timed opponents and the same session/results contract. Add the obstacle race only after authored traversal is available; swimming and team relay locomotion would require larger unrelated systems.

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) before production integration.
