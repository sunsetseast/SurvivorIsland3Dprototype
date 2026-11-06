# Challenge Testing hub — PR #25

[Draft pull request #25](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/25) · branch `feat/challenge-testing-hub` · based on latest main `afdeb363351f6db33123bcfa7e324d0aad2f6398`, including merged PR #24. Keep DRAFT and unmerged; nothing was deployed or published.

## Implemented flow

**Welcome → Challenge Testing → Play Stillwater Balance → existing host introduction → Show controls → Ready → real competition → Retry / Challenge Hub / Welcome screen.** No camp travel, developer grant, URL editing, interaction-marker search or console is needed in a Vite development preview. The original Continue Survivor Session action still resumes the normal camp.

The hub uses the existing four-configuration registry. Stillwater Balance is labelled **Playable**; Coastal Traverse, Tidebound Relay and Canopy Passage are **Environment Preview** entries. Only the selected equipment is built, and the existing ChallengeScene is lazy-loaded on selection. All previews provide touchscreen Hub/Welcome exits. Existing Low/High quality persists across navigation.

Stillwater is the real PR #24 engine, session, opponents, station animation, host, tutorial and results. This PR does not replace or simplify its mechanics. Balance correction is a horizontal drag; Place is a separate finger (keyboard A/D or arrows and Space remain available); sensitivity, Pause and explicit Resume remain. Last standing wins, or survivors rank at 90 seconds by objects then stability, with exact ties shared. Three placement misses or balance/stability failure eliminates a contestant. Testing neither awards immunity nor records permanent results.

## Authorization and state safety

The new hub requires `import.meta.env.DEV === true`. It appears automatically in Vite dev, without a query flag. Normal production builds do not expose or admit testing, including with URL flags or the legacy rehearsal variable. The existing legacy rehearsal gate and production event admission remain separate and unchanged; no new production testing opt-in was added.

TravelManager holds a private, validated temporary testing session/request, bound to its challenge instance, event and existing participant identities. It uses the existing loading/error/retry lifecycle and refuses duplicate entries and configuration changes inside the scoped request. Auto-introduction occurs once after the existing scene is ready, at the first validated station. Hub/Welcome exits cancel Stillwater, clear input/teleport requests, dispose the scene and drop the scope.

The original normal session, instance, participant, permissions and poses retain their object identities. The existing camp/social runtime is reused, with no second CampRuntime/database. Camp clock, NPCs, relationships, groups and memories do not advance or mutate during testing. Cold-start testing needs no camp visit. A real touch-joystick move established a non-default camp position; Continue restored that same camp instance and pose after repeated tests.

## Verification

- **159/159 automated tests**, 0 failures, 0 skipped; TypeScript; 294 collision checks and all six world checks; production build passed. [Full local regression log](evidence/regression.log).
- **11/11 new WebGL/browser groups locally and in GitHub CI** (Chromium 153 and 156 respectively), real trusted touchscreen taps and CDP simultaneous touch movement/placement. A complete feedback-controlled two-finger run earned a real shared win; sustained wrong correction produced real losses. No engine state was edited to produce these outcomes. Pause/resume, real Retry and three full Hub→challenge→results→Hub cycles passed without refreshing. The downloaded CI artifact's SHA-256 was verified; its [raw browser report](evidence/ci-browser-report.json) is preserved alongside local evidence.
- All three environment previews, rapid duplicate taps, one active scene, no preselection scene request/Canvas, portrait Play visibility, 44px landscape targets, safe-area spacing, cold camp continuation and exact existing camp/session/social restoration passed. Original scene ownership was fully released on every measured Hub return. No uncaught or shader/WebGL errors. [Raw browser results](evidence/browser-report.json).
- Existing Stillwater unit/integration coverage includes keyboard ownership, cancellation, focus/background freezing, pointer release and neutral-input restoration. The new hub reuses those controls; its actual touch pause, repeated transitions and neutral movement restoration also passed.
- **All six GitHub workflows succeeded** at the frozen runtime checkpoint. Results and links are recorded in [CI_RESULTS.json](evidence/CI_RESULTS.json). These cover existing Stillwater, Challenge Beach, connected journeys, Chromium/WebKit mobile controls, living camp/Tribal/assets/standalone and flagship/expansion/refinement checks. No thresholds were weakened.

See [actual screenshots](GALLERY.md), [resource measurements](PERFORMANCE.md), [iPhone-only guide](IPHONE_TEST_GUIDE.md) and [limitations](KNOWN_LIMITATIONS.md). Low active samples across three cycles stayed at 93 calls, 263,178 triangles, 81 geometries, 16 textures, 130 tracked owned resources and 23 relevant listeners. Hub teardown had zero canvases/active scenes/owned resources/geometries and a destroyed previous WebGL context. High introduction was also measured; these are browser samples, not physical iPhone FPS or VRAM certification.

## Preview provenance and completion

No Replit use occurred after the user's instruction not to use it; no Agent/credits were used at any time. Repository `.replit` does not define the named Run workflow command. We cannot verify the running project's checkout, build mode, route, entry point or synchronization from GitHub. The guide identifies this feature using the development/build footer and **Challenge Hub v1** marker. A production-served preview remains protected and must use its own existing development workflow; this PR changes no launch/deployment settings. Physical iPhone Safari and live Replit testing remain outstanding.

All six implementation checkpoints are complete in [PROGRESS.md](PROGRESS.md). Runtime/harness checkpoint: `c1a940de627ebd8f349242066893063cab3081f7`, exact matching local/remote file tree `cca2f8a59a372bfcac8eece149b51b58334562b1`. [Source manifest](evidence/source-manifest.json) freezes changed source/test/CI bytes and unchanged engine/session/controls. Captures show local parent build marker `8b6299ce`; the tested source bytes, not that pre-save metadata marker, identify the runtime checkpoint. Final evidence/docs saves do not alter runtime bytes. The final remotely verified head SHA is recorded in the draft PR body and delivery message because a document cannot contain its own Git commit SHA.

Next playable challenge recommendation: Coastal Traverse, using the same hub registry and existing beach equipment when its real gameplay is implemented. It remains a preview in this PR.
