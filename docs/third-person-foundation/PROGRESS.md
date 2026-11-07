# Third-person foundation — recovery record

Branch: `feat/third-person-foundation`; base: `af9c61cda4b998a775af6e91fc009f2d393ca785` (merged #26). No existing #27 or matching branch found. Worktree: `/workspace/scratch/8edda6ae5a52/SurvivorIsland3Dprototype`.

| Checkpoint | Status / validation |
| --- | --- |
| 1 Root causes | Complete; actual Player, Hud, rigs, Coastal engine/roster/camera, terrain and scene ownership inspected. `git diff --check`. |
| 2 Shared movement | Complete: shared continuous radial deadzone, normalized analog, actual release deceleration, bounded turning, gesture basis and course adapter; 4 targeted tests pass. Focus/epoch clear cancels velocity. |
| 3 Camera | Complete: shared cached local camera envelope, behind follow, 1.6s free-look grace, pitch recenter, explicit race modes and staged-owner suppression. 6 targeted tests + TypeScript pass. |
| 4 Animation architecture | Complete: common typed locomotion contract and reusable interruptible joint blend in both existing articulated rigs. 7 targeted tests + TypeScript pass. |
| 5 Crawl | Complete: removed root scaling; articulated hips/spine/head/shoulders/elbows/thighs/knees/ankles with alternating displacement cadence in player and rivals. Facing derives from travel. 8 targeted tests + TypeScript pass; rendered clearance check scheduled. |
| 6 Beam | Complete: displacement-driven supported legs, spread arms, torso instability without tipping the feet; visible fall/drop, checkpoint return and rise over the existing two-second penalty. Deterministic rules unchanged. 9 targeted tests + TypeScript pass. |
| 7 Net | Complete: authored slope-aware two-link arm/leg poses, alternating hands/feet, blended crest orientation and original grip timing/continuous progress. No course rebuild. 10 targeted tests + TypeScript pass. |
| 8 Cross-scene | Complete: all Player worlds share analog/camera changes; displacement-based planted gait and sampled slope contact added to player. Stillwater/inspection camera ownership preserved. Legacy crawl assertion now rejects scaling. 25 targeted tests and TypeScript pass (11 foundation +14 Coastal). |
| 9 Touch browser | Test implementation saved: trusted CDP simultaneous joystick/orbit; rendered crawl envelope and consecutive captures; beam/net contact; puzzle restoration and full race/retry/results/camp preservation. Local Chromium blocked by socket policy; GitHub CI execution pending. |
| 10 Performance/regression | 187/187 local tests, TypeScript and production build pass. First CI confirmed camp/race simultaneous touch and behind recenter; caught orbit intercepting Pause. Fixed stacking ownership. Additional correction: instanced tree collision envelopes, intelligent default-run challenge state and screen-correct beam steering. Awaiting full CI validation. |
| 11 Evidence/reports | Pending |

Recovery: fetch origin, inspect draft PR head and this branch before editing. Do not reset or recreate completed work. Use existing pnpm dependencies, `node --import tsx --test tests/*.test.mjs` from prototype; local Playwright Chromium at `/usr/bin/chromium`. Push and verify each checkpoint before starting the next. Keep PR draft; no merge, deployment, Replit tools or reference repo writes. Record actual results and limitations here; never reuse earlier evidence as proof of changed source.

Browser correction: Pause test caught smoothed facing written into deterministic Runner state by presentation. Facing and rendered recovery position now live in a WeakMap outside engine state; paused simulation remains byte-identical. Added fresh-main touch-driven before captures to CI.

Regression fixture adjustments: planted-foot IK is tested for stationary joint stability rather than a zero-angle knee; conversation touch fixture holds authored look grace and uses full analog travel, then allows physical deceleration. These preserve speed/displacement, collision and stop requirements. Crawl inspection uses live geometry constructors rather than an unresolved bare browser module import.

Rendered verification now passed consecutive full-size crawl aperture checks, net hand contact, beam fall/recovery, puzzle restoration, win/loss/retry and three completed touch-driven races. Remaining check found one fewer GPU-submitted geometry on repeat (66→65), with strict owned-resource/listener stability. Repeat checks now additionally compare the complete scene geometry set exactly and require non-growing GPU residency (visibility-dependent upload count). Stillwater debug lock is recorded before yielding camera ownership.

Visual review of actual CI frames: crawl height ~0.996m clears 1.05m without changing any authored scale. Net hand error measured 0.20m ascending/crest and 0.10m descending. Beam framing/arms/feet are readable. Crawl and descending-net camera booms crowded the avatar after collision; default crawl pitch is now low, and net follow is higher with a lower body target. Added side crawl sequence. Merged distant karsts now use conservative per-mass camera envelopes, eliminating their broad triangle casts.

Integration correction: rapid release/reapply between frames retained an obsolete camera basis, exposed by crawl free-look followed by a new input gesture. Added physical joystick gesture epochs and a regression for this exact sequence. Net targets now sample the actual support profile over the crest; a new forward-kinematic test verifies contact at five positions without relaxing the browser contact limit. Mobile fixture now explicitly holds its authored starting view during placement.

Final clearance correction: the low-frame action now allows .25 seconds for articulated lowering before advancing (same rule for rivals). The transition buffer before the roof remains intact; a deterministic test proves no premature entry. Collision caches release immediately when race ownership ends. No further scope expansion is planned; remaining work is final CI, evidence inspection and documentation.
