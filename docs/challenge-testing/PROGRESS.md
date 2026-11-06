# Challenge Testing hub — recovery record

Branch: `feat/challenge-testing-hub`. Base: `afdeb363351f6db33123bcfa7e324d0aad2f6398` (latest main, merged PR #24). No existing PR #25/hub branch was found.

Keep DRAFT and unmerged. Do not deploy, publish, use Replit services/Agent/credits, or edit the reference repository. GitHub and local browser testing only, following the user's latest instruction.

## Bounded checkpoints

1. **Architecture/authorization — complete.** Inspected App welcome/resume, TravelManager/registry/lifecycle, development rehearsal gate, configuration registry, ChallengeScene/HUD and Stillwater session. New hub is Vite development-only with no URL flag; normal production (including URL flags) cannot enable it. Existing explicit rehearsal build/camp-travel authority stays unchanged.
2. **Welcome/hub UI — complete.** Development-only welcome action, registry-driven cards distinguishing one playable challenge from three environment previews, safe-area styling and public build/revision marker. Selection buttons remain disabled until checkpoint 3 connects the direct-entry API. Authorization/registry tests and TypeScript pass.
3. **Direct scene entry — complete.** Existing TravelManager owns a private, scoped testing WorldSession; original normal session/instance/participant/pose/permission objects stay intact. Only the selected setup is built, with validated spawn; existing lazy ChallengeScene/lifecycle reused. Production/default rejection, duplicate taps, all four spawns, three preserved-session cycles, stale cancellation, retry and revoked scope pass. 23 targeted/new-plus-travel regressions and TypeScript pass.
4. One-tap selection starts the actual Stillwater introduction after scene-ready; existing Ready/gameplay/Retry; Hub/Welcome exits cancel and clean inputs. Save remotely.
5. Actual touch/WebGL flows, three full cycles, original camp/pose/NPC/provider/memory preservation, production gates and resource retention. Save remotely.
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

Implement checkpoint 4: after scene-ready, start the actual Stillwater introduction once for the scoped Play request; add Hub and Welcome exits to the existing HUD/results, clear inputs/teleport requests and preserve legacy rehearsal travel.
