# Challenge Testing hub — recovery record

Branch: `feat/challenge-testing-hub`. Base: `afdeb363351f6db33123bcfa7e324d0aad2f6398` (latest main, merged PR #24). No existing PR #25/hub branch was found.

Keep DRAFT and unmerged. Do not deploy, publish, use Replit services/Agent/credits, or edit the reference repository. GitHub and local browser testing only, following the user's latest instruction.

## Bounded checkpoints

1. **Architecture/authorization — complete.** Inspected App welcome/resume, TravelManager/registry/lifecycle, development rehearsal gate, configuration registry, ChallengeScene/HUD and Stillwater session. New hub is Vite development-only with no URL flag; normal production (including URL flags) cannot enable it. Existing explicit rehearsal build/camp-travel authority stays unchanged.
2. **Welcome/hub UI — complete.** Development-only welcome action, registry-driven cards distinguishing one playable challenge from three environment previews, safe-area styling and public build/revision marker. Selection buttons remain disabled until checkpoint 3 connects the direct-entry API. Authorization/registry tests and TypeScript pass.
3. **Direct scene entry — complete.** Existing TravelManager owns a private, scoped testing WorldSession; original normal session/instance/participant/pose/permission objects stay intact. Only the selected setup is built, with validated spawn; existing lazy ChallengeScene/lifecycle reused. Production/default rejection, duplicate taps, all four spawns, three preserved-session cycles, stale cancellation, retry and revoked scope pass. 23 targeted/new-plus-travel regressions and TypeScript pass.
4. **One-tap Stillwater implementation — complete.** Scoped Play request starts the existing introduction once after scene-ready, at the validated first-station approach; existing engine/Ready/Retry unchanged. Touch Hub/Welcome exits appear in intro/active/pause/results and preview HUD; they cancel the session, clear teleport/input requests and drop temporary travel state. Testing is confined to the selected configuration; legacy selector/travel stays unchanged. TypeScript and 33 targeted tests pass. Browser verification follows in checkpoint 5; system Chromium launch was blocked by sandbox socket restrictions, so use a headless WebGL binary.
5. **Touch/resource verification in progress.** Expanded trusted touchscreen/CDP harness covers a real win/loss/Retry, three hub→results→hub cycles, all previews, portrait/landscape, cold-start and existing-camp restoration. First six WebGL groups pass (production rejection, no-flag/lazy welcome/hub, duplicate tap/one real scene/auto introduction, Ready/exits, cold camp continuation, 44px layout). After normal renderer disposal, scene ownership/geometry/canvas/active counts are zero and the old WebGL context is lost; its stale texture info counter is not live GPU memory. TypeScript and 27 focused gameplay/input/resource tests pass. Full cycles are still running; do not claim final acceptance yet. Hub harness is integrated into existing Stillwater CI with its own evidence artifact.
6. Relevant regressions/CI, inspected captures, final report, short iPhone-only guide, limitations and final remote verification. Save remotely.

Each bounded milestone: targeted checks → commit → authenticated GitHub save → ref/tree verification → draft PR update. Command-line push lacked credentials in PR #24; use the authenticated Git-data operations directly, without resets or discarding local commits.

## Design boundaries

- The development hub never grants production admission or modifies normal camp permissions. Testing holds a separate minimal WorldSession on the same TravelManager; it reuses existing identities and the existing one-active-scene lifecycle.
- Menu/Hub/Welcome navigation disposes the testing scene and drops temporary session state. Normal Continue Camp Session resumes the original session/pose and existing singleton camp runtime.
- Production default remains closed even if `devTravel=1` or a rehearsal environment variable is present. The new hub does not provide a production opt-in shortcut.
- Configuration labels are sourced from the current registry: Stillwater playable, the other three environment previews. Build only the selected setup.
- No changes to Stillwater mechanics, scoring, opponents or permanent season/social state.

## Preview investigation and limits

Repository `.replit` names a `Project` Run workflow but contains no command defining that workflow; package scripts provide Vite `dev`, `build`, `serve`. This cannot prove what the running preview serves or whether it pulled GitHub. A read-only Replit app-title search before the user's prohibition did not identify an unambiguous 3D prototype; no Agent was called. Do not access Replit further. Inspect repository configuration only and document the live-preview/physical-iPhone limitation explicitly. Do not modify launch/deployment settings. The supported automatic hub is the existing Vite development server; a normal production-served preview must stay protected.

## Next action

Finish the current expanded browser run; if interrupted, rerun scripts/challenge-testing-qa.mjs using CAMP_CHROMIUM=/tmp/challenge-testing-chromium/chromium and LD_LIBRARY_PATH=/tmp/challenge-testing-chromium. Verify win/loss/Retry, three cycles and exact existing camp pose. All runtime/harness changes are remotely saved at this checkpoint. Then final full regression/CI and documents (checkpoint 6).
