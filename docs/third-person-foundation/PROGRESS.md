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
| 7 Net | Pending |
| 8 Cross-scene | Pending |
| 9 Touch browser | Pending; emulated touch only, no physical iPhone access |
| 10 Performance/regression | Pending |
| 11 Evidence/reports | Pending |

Recovery: fetch origin, inspect draft PR head and this branch before editing. Do not reset or recreate completed work. Use existing pnpm dependencies, `node --import tsx --test tests/*.test.mjs` from prototype; local Playwright Chromium at `/usr/bin/chromium`. Push and verify each checkpoint before starting the next. Keep PR draft; no merge, deployment, Replit tools or reference repo writes. Record actual results and limitations here; never reuse earlier evidence as proof of changed source.
