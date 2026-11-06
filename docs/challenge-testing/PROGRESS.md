# Challenge Testing hub — recovery record

Branch: `feat/challenge-testing-hub`. Base: `afdeb363351f6db33123bcfa7e324d0aad2f6398` (latest main, merged PR #24). No existing PR #25/hub branch was found.

Keep DRAFT and unmerged. Do not deploy, publish, use Replit services/Agent/credits, or edit the reference repository. GitHub and local browser testing only, following the user's latest instruction.

## Bounded checkpoints

1. **Architecture/authorization — complete.** Inspected App welcome/resume, TravelManager/registry/lifecycle, development rehearsal gate, configuration registry, ChallengeScene/HUD and Stillwater session. New hub is Vite development-only with no URL flag; normal production (including URL flags) cannot enable it. Existing explicit rehearsal build/camp-travel authority stays unchanged.
2. **Welcome/hub UI — complete.** Development-only welcome action, registry-driven cards distinguishing one playable challenge from three environment previews, safe-area styling and public build/revision marker. Selection buttons remain disabled until checkpoint 3 connects the direct-entry API. Authorization/registry tests and TypeScript pass.
3. **Direct scene entry — complete.** Existing TravelManager owns a private, scoped testing WorldSession; original normal session/instance/participant/pose/permission objects stay intact. Only the selected setup is built, with validated spawn; existing lazy ChallengeScene/lifecycle reused. Production/default rejection, duplicate taps, all four spawns, three preserved-session cycles, stale cancellation, retry and revoked scope pass. 23 targeted/new-plus-travel regressions and TypeScript pass.
4. **One-tap Stillwater implementation — complete.** Scoped Play request starts the existing introduction once after scene-ready, at the validated first-station approach; existing engine/Ready/Retry unchanged. Touch Hub/Welcome exits appear in intro/active/pause/results and preview HUD; they cancel the session, clear teleport/input requests and drop temporary travel state. Testing is confined to the selected configuration; legacy selector/travel stays unchanged. TypeScript and 33 targeted tests pass. Browser verification follows in checkpoint 5; system Chromium launch was blocked by sandbox socket restrictions, so use a headless WebGL binary.
5. **Touch/resource verification — complete.** All 11 expanded browser/WebGL groups passed: real two-finger win, input-driven losses, real Retry, touch pause/resume, three full hub→challenge→results→hub cycles, all previews, portrait/landscape and exact non-default original camp restoration. No grant/URL flag/walking required. Active resource/listener counts plateau; Hub owns no scene/geometry/Canvas and destroys the old context. Raw browser report and seven inspected screenshots are in evidence/. Hub harness is included in existing Stillwater CI with its own artifact.
6. **Integration/evidence — complete.** Local full regression: 159/159 tests, TypeScript, 294 collision checks/six world checks and production build passed. Actual screenshot gallery, performance, final report, iPhone guide and limitations are written. GitHub results are recorded in evidence/CI_RESULTS.json. Final docs/evidence checkpoint retains the exact tested runtime bytes; final ref/tree verification and SHA are recorded in the draft PR body.

Each bounded milestone: targeted checks → commit → authenticated GitHub save → ref/tree verification → draft PR update. Command-line push lacked credentials in PR #24; use the authenticated Git-data operations directly, without resets or discarding local commits.

## Design boundaries

- The development hub never grants production admission or modifies normal camp permissions. Testing holds a separate minimal WorldSession on the same TravelManager; it reuses existing identities and the existing one-active-scene lifecycle.
- Menu/Hub/Welcome navigation disposes the testing scene and drops temporary session state. Normal Continue Camp Session resumes the original session/pose and existing singleton camp runtime.
- Production default remains closed even if `devTravel=1` or a rehearsal environment variable is present. The new hub does not provide a production opt-in shortcut.
- Configuration labels are sourced from the current registry: Stillwater playable, the other three environment previews. Build only the selected setup.
- No changes to Stillwater mechanics, scoring, opponents or permanent season/social state.

## Preview investigation and limits

Repository `.replit` names a `Project` Run workflow but contains no command defining that workflow; package scripts provide Vite `dev`, `build`, `serve`. This cannot prove what the running preview serves or whether it pulled GitHub. A read-only Replit app-title search before the user's prohibition did not identify an unambiguous 3D prototype; no Agent was called. Do not access Replit further. Inspect repository configuration only and document the live-preview/physical-iPhone limitation explicitly. Do not modify launch/deployment settings. The supported automatic hub is the existing Vite development server; a normal production-served preview must stay protected.

## Remote checkpoints and recovery

Draft PR: https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/25

| Checkpoint | Verified GitHub commit |
| --- | --- |
| 1 · recovery/design | `7cd9638be954d212e6f69e1ed4e67e36903abfc9` |
| 2 · welcome/hub | `d6fedc6647c62f5824316970dcf9fe24dc5eca35` |
| 3 · scoped direct entry | `d626b5240cca5dcacc9845b61ed49b764397c390` |
| 4 · one-tap real Stillwater/navigation | `fbc9a602e5a801705e1a4a97bbfeacdb265f9612` |
| 5 · touch/layout/resource harness and CI | `c1a940de627ebd8f349242066893063cab3081f7` |
| 6 · reports/evidence | final verified head in PR body (this commit cannot embed its own SHA) |

Runtime/harness bytes are frozen at checkpoint 5; its matching tree is `cca2f8a59a372bfcac8eece149b51b58334562b1`. Authenticated Git-data saves preserve exact trees but differ in commit metadata from local shadow commits. Do not reset/discard local work to reconcile metadata. The final source SHA-256 manifest permits checking that documentation/evidence-only commits retain the tested runtime.

If interrupted before final save, commit docs/challenge-testing/ (exclude any stale FAILURE.jpg), upload binary screenshot blobs and text via authenticated Git-data operations, compare the resulting tree with local HEAD^{tree}, update the branch with an expected-SHA lease and reread its ref. Update the existing draft PR, never create a duplicate. Verify six workflow conclusions using the recorded runtime SHA before claiming remote CI. No need to rerun passed suites when only documentation changes. Local browser reproduction uses scripts/challenge-testing-qa.mjs with CAMP_CHROMIUM=/tmp/challenge-testing-chromium/chromium and LD_LIBRARY_PATH=/tmp/challenge-testing-chromium; install normal Playwright Chromium in CI.
