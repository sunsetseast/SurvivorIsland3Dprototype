# Challenge Beach development checkpoint

## Recovery
- Branch: `feat/railay-challenge-beach`
- Base and last verified remote SHA before this checkpoint: `b9a0e3830a6c6e1ee620e1d12922e684a46eca47` (checkpoint 1 ref confirmed; base main is `62bb25b579b0d1faef0b52fb7e5ca6dc5ce0d468`).
- No existing Challenge Beach branch or PR found on 2026-11-05. Reference repository remains untouched.
- Publishing uses the authenticated GitHub connector because workspace Git clone has no credentials. Every checkpoint must be ref-confirmed before continuing. This document records the previously verified SHA; the commit containing this document cannot contain its own SHA.

## Checkpoint 1 — complete
Inspected registry, TravelManager, SceneLifecycle, App, Player/ExplorationWorld, spawn validation, existing journey tests, and the PR22 integration handoff.

Existing ownership: App mounts one SceneLifecycle at a time; source release completes before destination load. CampRuntime/provider own all contestant/social state. Player accepts terrain/movement/label adapters. `challenge_main` is an event-scoped, planned registry entry without a scene. Existing permission grants cover journeys only; no production season/event admission authority exists.

## Implementation plan
1. Research exactly 15 distinct challenge references and reuse repository Railay geographic sources. Document a compact four-zone blueprint.
2. Add a lazy ChallengeScene and a shared safe surface/movement adapter. Extend registry, App, readiness and travel together. Add explicitly development-only rehearsal grants, event instance identity, consumed permissions and exact source-instance return; no public event admission.
3. Build coast/staging, inland zones and paths in separate verified checkpoints, reusing existing visual conventions and scene ownership.
4. Add each original demonstration setup independently; configuration data owns equipment, spawns, finish and collision. Only selected equipment mounts.
5. Add minimal developer preview through the existing development tools; reuse Player and mobile input, prepare roster positions without autonomous NPC duplication.
6. Verify navigation, admission denial, cancellation/retry, round trips, inputs, cleanup and Low/High rendering. Save real WebGL evidence and measured resource comparisons, then final report.

## Completed checkpoints
- [x] 1. Secure branch and architecture
- [x] 2. Research and blueprint
- [x] 3. Basic scene/travel (targeted tests pass; remote build/browser verification pending)
- [x] 4. Coast/staging (targeted navigation/collision tests; visual QA pending)
- [x] 5. Secondary zones/paths (navigation passes; visual QA pending)
- [x] 6. Main demo (modeled/collidable; traversal/gameplay over equipment deferred)
- [x] 7. Ocean demo (model only; swimming deferred)
- [x] 8. Jungle demo (model/collision; gameplay deferred)
- [x] 9. Individual demo (eight modeled stations; interactions deferred)
- [x] 10. Configuration/preview (implemented; browser lifecycle verification pending)
- [ ] 11. Integration/regression
- [ ] 12. Evidence/report

## Verification
GitHub confirms PR22 merged, main at the SHA above, no matching Challenge Beach branch and no prior Challenge Beach PR. No runtime code changed in checkpoint 1; no runtime tests claimed.

## Checkpoint 2 — complete
Added REFERENCE_LIBRARY.md: 15 distinct designs, 4/4/4/3 zone coverage, source and original photo-page links, verified seasons/episodes where available, original spatial estimates and adaptation notes. Added LAYOUT.md with west-facing coast, four reserved footprints, continuous route network and explicit swimming dependency. No reference photographs are redistributed. Validated table entry count/category allocation and source-link presence. Runtime tests are not applicable to these documentation changes.

## Checkpoint 3 — implementation and targeted tests complete
Added lazy ChallengeScene, basic continuous terrain and shared Player adapter; registry, App, lifecycle readiness and HUD now support challenge_main. Added build-and-URL-gated development rehearsal grants, one-use participant/origin/scope validation, rehearsal event instances, preserved event identity on resume, exact camp instance/departure-pose return, and safe failure/retry. Normal builds cannot opt in with a URL alone. No production admission or second contestant simulation.

Six targeted Node tests pass (all blueprint route segments in both directions; body/camera/staging safety; water boundary; disabled/direct/missing/wrong-scope admission; wrong participant/origin and revoked grants; instance/tribe identity; exact return; retry/cancel/stale loads). A test caught and fixed event identity loss on menu resume. Local sparse workspace used Node 24 native TypeScript transforms and a temporary extension/JSON loader because tsx/dependencies are not installed here. git diff --check passes. Remote typecheck/build and real WebGL checks are still required; no visual/performance evidence is claimed yet.

## Checkpoint 4 — coastal/staging implementation
Curved sand/seabed and world-space animated opaque water; nine separately sculpted karst lobes with matching conservative body collision; existing botanical GLB and alpha-tested leaf atlas, with a procedural load-failure fallback; ten arrival pads, host mark, waiting benches and dry-shore safety markers. Geometry is merged/instanced and scene owned; late asset callbacks dispose after departure. Seven targeted tests pass, including bidirectional routes and visible trunk/cliff collision. Low and High use the same walkable trunk placement with different geometry. No screenshots or renderer budgets claimed yet. Checkpoint 3 GitHub connected-world workflow completed successfully: TypeScript, full units, production build and browser journey checks.

## Checkpoint 5 — secondary clearing and trail environment
Added worn ground transitions on the route network and two inland clearing floors; original botanical understory around the clearings, embedded roots, six outcrops with shared body collision, directional timber signs, host/waiting edges and a dry ocean staging strip. Kept the four competition footprints clear. Seven targeted tests still pass after the new permanent obstacles; bidirectional zone routes and all staged/view spawns remain valid. Browser art review is pending; no modeled challenge equipment yet.

## Checkpoint 6 — main beach demonstration
Built Coastal Traverse: two colored tribe lanes with planked start decks, rope-roof crawl frames, supported low beams, braced A-frame cargo nets with rear rungs and original geometric puzzle finish decks. Added plain equipment descriptors and merged rendering, configuration metadata, body exclusion boxes, safe start/contestant/host/finish/view positions and scene-owned cleanup. Eight targeted tests pass. Route testing found the original beach cross-path intersected the crawl frames; moved it behind the start decks and updated the blueprint. Equipment is a visual/collidable mockup, without climb/crawl/puzzle gameplay.

## Checkpoint 7 — ocean relay model
Built Tidebound Relay descriptors: dry planked shore deck with seaward safety rope, three offshore decks with partially submerged pontoons, subframes, anchored lines, retrieval tokens/crossbars and water ladders; lane buoys and beach finish. Nine targeted tests pass; dry staging/host/finish/view body/camera clearance is verified and all offshore platforms remain outside supported movement. Configuration selection comes in checkpoint 10; the ocean model is not active alongside the main course. Swimming, diving, platform climbing and relay gameplay are not implemented.

## Checkpoint 8 — jungle rope/net model
Built Canopy Passage descriptors: two lanes of planked starts, four-post braced rope towers with sloped cargo nets and rear rungs, anchored hanging-rope gates with ties, low timber crawl passages, supported diagonal beams and finish decks. Ten targeted tests pass, including safe starts/host/ten-person roster/view/finish, obstacle exclusion and physical movement around the west entrance and inland route. Only the main model remains mounted until selector checkpoint 10.

## Checkpoint 9 — individual balance/endurance model
Built Stillwater Balance: eight separated timber stations, supported narrow footboards, braced overhead rope/bucket counterweight frames, side stacking plinths, original block stacks and placement wands. Eleven targeted tests pass. Every individual start, roster position, host, view and finish passes shared body/camera validation with equipment collision; west-side circulation remains open. No timing, stacking interaction, endurance input, immunity or elimination is implemented.

## Checkpoint 10 — modular selection and rehearsal preview
Four typed configurations now carry equipment, starts, roster, host, finish, view, collision, dependencies and cleanup policy. Only one equipment subtree is mounted. Selection validates the next setup, locks inputs, removes/disposes the old subtree, then activates the next after cleanup and relocates to a safe view. The small selector and return-staging control require the explicit rehearsal build/URL and an already-admitted rehearsal; they cannot grant admission or alter season/rewards.

Reuses existing Contestant models for static, render-only staging of current camp identities. Added an optional scene-owned material override to Contestant so challenge departure does not dispose a camp-owned rendering material. CampRuntime/provider are neither recreated nor advanced here. Twelve targeted tests pass, including all configurations, malformed/unknown setup rejection and every route in both directions with each equipment collision set. Added developer-only scene inspection/renderer statistics for real WebGL QA. Browser material/resource/listener verification remains pending.

## Checkpoint 11 — verification started
Added a read-only GitHub CI workflow and real Chromium/SwiftShader rehearsal harness. It checks normal-build control hiding, URL/build admission gate, existing runtime/provider/NPC state retention, safe preview and one equipment subtree, all representative Player routes, three-touch run/look, repeated selection and camp-return resource/listener plateaus, and Low/High measurements. It captures twelve distinct High views plus four Low comparisons. Source script syntax and diff whitespace checks pass locally; remote results are pending. Build artifacts are review-only and are not deployed.

## Checkpoint 11 — first WebGL review and corrections
Remote TypeScript/full units/production build passed. The real browser successfully entered rehearsal, preserved camp ownership/state, rendered all four setups in Low/High and walked every six-route chain. Sixteen actual screenshots and resource samples were recovered from CI artifact 13432932268. The run then failed at the touch harness: it held Run without the pointer-up that intentionally activates the existing latched button. Corrected the harness to tap Run while retaining joystick ownership, then exercise three simultaneous touches. No product sprint logic changed.

Visual inspection found one panorama inside foliage, regular water striping and overly rounded/banded cliffs. Corrected the camera pose, used less regular world-space wave fields, changed karst shoulders/ribs/crowns and reused the existing mineral limestone material, added two efficient instanced fern/pandanus understory draws and three botanical variants. Made selector text contrast explicit. Targeted tests remain 12/12; remote browser cleanup/return checks and refreshed visual review are still pending. First-run image/resource samples are not final evidence or certified budgets.

## Known issues / next action
Workspace Git authentication and package availability must be resolved or use existing GitHub CI for verification. Next: checkpoint 11: compile/build/full regressions and actual Challenge Beach browser rehearsal/selection/navigation/resource checks, then inspect/correct WebGL screenshots and package final evidence. Final visual QA, shader checks, resource measurements and browser rehearsal integration are pending. One selected demonstration is mounted at a time. Intermediate art checkpoints use [skip ci] after local targeted tests; full CI runs again at integration instead of replaying every existing workflow for every small save.

DRAFT ONLY. Do not merge, deploy, publish, use Replit credits or alter the read-only reference repository.

