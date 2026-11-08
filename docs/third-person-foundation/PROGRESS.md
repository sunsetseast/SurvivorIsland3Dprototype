# Third-person foundation — recovery record

Branch: `feat/third-person-foundation`; base: `af9c61cda4b998a775af6e91fc009f2d393ca785` (merged #26). No existing #27 or matching branch found. Worktree: `/workspace/scratch/8edda6ae5a52/SurvivorIsland3Dprototype`.

| Checkpoint | Status / validation |
| --- | --- |
| 1 Root causes | Complete; actual Player, Hud, rigs, Coastal engine/roster/camera, terrain and scene ownership inspected. `git diff --check`. |
| 2 Shared movement | Complete: shared continuous radial deadzone, normalized analog, actual release deceleration, bounded turning, gesture basis and course adapter; 4 targeted tests pass. Focus/epoch clear cancels velocity. |
| 3 Camera | Complete: shared cached local camera envelope, behind follow, 1.6s free-look grace, pitch recenter, explicit race modes and staged-owner suppression. 6 targeted tests + TypeScript pass. |
| 4 Animation architecture | Complete: common typed locomotion contract and reusable interruptible joint blend in both existing articulated rigs. 7 targeted tests + TypeScript pass. |
| 5 Crawl | Complete: removed root scaling; articulated hips/spine/head/shoulders/elbows/thighs/knees/ankles with alternating displacement cadence in player and rivals. Facing derives from travel. targeted tests + TypeScript pass; final WebGL sequence measures 0.997–1.019m below the 1.05m opening without scaling. |
| 6 Beam | Complete: displacement-driven supported legs, spread arms, torso instability without tipping the feet; visible fall/drop, checkpoint return and rise over the existing two-second penalty. Deterministic rules unchanged. 9 targeted tests + TypeScript pass. |
| 7 Net | Complete: authored slope-aware two-link arm/leg poses, alternating hands/feet, blended crest orientation and original grip timing/continuous progress. No course rebuild. 10 targeted tests + TypeScript pass. |
| 8 Cross-scene | Complete: all Player worlds share analog/camera changes; displacement-based planted gait and sampled slope contact added to player. Stillwater/inspection camera ownership preserved. Legacy crawl assertion now rejects scaling. 25 targeted tests and TypeScript pass (11 foundation +14 Coastal). |
| 9 Touch browser | Complete on `bfb1416c`: trusted simultaneous joystick/orbit, both pitch limits, behind recenter, crawl frames, net contact, three complete races, puzzle restoration and camp preservation all pass. Existing mobile controls pass Chromium and WebKit. |
| 10 Performance/regression | 192/192 tests, TypeScript/build and 294 collision/six world checks pass. Foundation, mobile, journeys, Challenge Beach and Stillwater workflows pass. Final camp route/resource workflows are finishing. CPU camera mean .057ms Low / .029ms High; exact ownership/scene geometry/listener stability. |
| 11 Evidence/reports | Final actual WebGL artifact `13592638459` downloaded and SHA-256 verified; reviewed side crawl, net/beam and original-main before images. All eight documents prepared; final remote documentation/evidence save follows completed CI. |

Recovery: fetch origin, inspect draft PR head and this branch before editing. Do not reset or recreate completed work. Use existing pnpm dependencies, `node --import tsx --test tests/*.test.mjs` from prototype; local Playwright Chromium at `/usr/bin/chromium`. Push and verify each checkpoint before starting the next. Keep PR draft; no merge, deployment, Replit tools or reference repo writes. Record actual results and limitations here; never reuse earlier evidence as proof of changed source.

Browser correction: Pause test caught smoothed facing written into deterministic Runner state by presentation. Facing and rendered recovery position now live in a WeakMap outside engine state; paused simulation remains byte-identical. Added fresh-main touch-driven before captures to CI.

Regression fixture adjustments: planted-foot IK is tested for stationary joint stability rather than a zero-angle knee; conversation touch fixture holds authored look grace and uses full analog travel, then allows physical deceleration. These preserve speed/displacement, collision and stop requirements. Crawl inspection uses live geometry constructors rather than an unresolved bare browser module import.

Rendered verification now passed consecutive full-size crawl aperture checks, net hand contact, beam fall/recovery, puzzle restoration, win/loss/retry and three completed touch-driven races. Remaining check found one fewer GPU-submitted geometry on repeat (66→65), with strict owned-resource/listener stability. Repeat checks now additionally compare the complete scene geometry set exactly and require non-growing GPU residency (visibility-dependent upload count). Stillwater debug lock is recorded before yielding camera ownership.

Visual review of actual CI frames: crawl height ~0.996m clears 1.05m without changing any authored scale. Net hand error measured 0.20m ascending/crest and 0.10m descending. Beam framing/arms/feet are readable. Crawl and descending-net camera booms crowded the avatar after collision; default crawl pitch is now low, and net follow is higher with a lower body target. Added side crawl sequence. Merged distant karsts now use conservative per-mass camera envelopes, eliminating their broad triangle casts.

Integration correction: rapid release/reapply between frames retained an obsolete camera basis, exposed by crawl free-look followed by a new input gesture. Added physical joystick gesture epochs and a regression for this exact sequence. Net targets now sample the actual support profile over the crest; a new forward-kinematic test verifies contact at five positions without relaxing the browser contact limit. Mobile fixture now explicitly holds its authored starting view during placement.

Final clearance correction: the low-frame action now allows .25 seconds for articulated lowering before advancing (same rule for rivals). The transition buffer before the roof remains intact; a deterministic test proves no premature entry. Collision caches release immediately when race ownership ends. No further scope expansion is planned; remaining work is final CI, evidence inspection and documentation.

The course test robot now converts requested world travel using the controller's actual held camera basis, exposed read-only through the existing development QA bridge. Assuming the current camera yaw during a frozen gesture produced slow lateral travel after a side-look and invalidated the expected winning-time fixture. The independent simultaneous-touch check now also asserts that the actual held basis is unchanged by orbit. Inputs remain trusted touch events; no race state is advanced by stage assignment.

Resume from remotely verified head `7800dbae`: fresh checkout restored all saved work after the transient worktree was cleared. CI confirms Living Camp (including social/Tribal), Connected Journeys, Challenge Beach and Stillwater succeed. Remaining fixture corrections: use the actual per-scene pitch minimum (.12 camp / -.25 race) and keep trusted drag coordinates inside the viewport; route robot brakes before sampling/aiming at close waypoints; mobile repeat-scene failure now records HUD/readiness diagnostics. No runtime thresholds or collision assertions were relaxed.

## Verified remote implementation checkpoints

| Checkpoint | GitHub commit |
| --- | --- |
| Root causes | `2bb1173` |
| Shared movement | `3e2244d` |
| Shared camera | `6b818ac` |
| Animation contract | `b3ce3ca` |
| Proportional crawl | `f9519a2` |
| Beam/recovery | `b70786b` |
| Cargo net | `f924aba` |
| Cross-scene integration | `fdb52c1` |
| Touch/WebGL harness | `c9ffeda` |
| Automatic challenge running | `d1e2a28` |
| Camera CPU envelopes | `06b9d41`, `797a68a` |
| Pause/state and crest corrections | `a55e775`, `3554e24`, `6b62ea1` |
| Crawl clearance / test robot / final fixtures | `fe51e87`, `a96d3f8`, `bfb1416` |

The tested source is `bfb1416c8b8d2bb3db9c62efff698777c1c67861`; subsequent final evidence/report changes must not alter the implementation hashes in `evidence/source-manifest.json`. Draft PR: https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/27. Final documentation SHA belongs in the PR description/delivery, as a commit cannot contain its own hash.

The final extended sweep physically completed every route and hiding-site approach. Its last NPC-follow fixture used a fixed x+1.8/z+2.5 offset, which landed outside reachable trail ground after the longer expedition. It now finds a nearby walkable, NPC-clear, pathfinder-reachable approach and still follows it through real keyboard movement. Actor positions are never assigned; collision, distance and route assertions remain intact. All six other workflows already passed on the unchanged gameplay source.

The corrected extended sweep passed in run `42420790839`, including every camp/hiding approach, physical water-chore NPC following and refinement checks. The last Challenge Beach test counts lazily GPU-uploaded geometry: camera-dependent uploads differed by one while owned scene resources remained stable. Its fixture now waits for asset-network idle and initializes the complete owned scene before strict repeat GPU comparisons, restoring all visibility/culling flags and the original view afterward. Equality assertions are unchanged. This is a test-only correction; no gameplay or asset bytes changed.
