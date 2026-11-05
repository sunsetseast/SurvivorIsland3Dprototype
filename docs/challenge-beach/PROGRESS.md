# Challenge Beach development checkpoint

## Recovery
- Branch: `feat/railay-challenge-beach`
- Base and last verified remote SHA before this checkpoint: `62bb25b579b0d1faef0b52fb7e5ca6dc5ce0d468` (latest main, PR #22 merged).
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
- [ ] 2. Research and blueprint
- [ ] 3. Basic scene/travel
- [ ] 4. Coast/staging
- [ ] 5. Secondary zones/paths
- [ ] 6. Main demo
- [ ] 7. Ocean demo
- [ ] 8. Jungle demo
- [ ] 9. Individual demo
- [ ] 10. Configuration/preview
- [ ] 11. Integration/regression
- [ ] 12. Evidence/report

## Verification
GitHub confirms PR22 merged, main at the SHA above, no matching Challenge Beach branch and no prior Challenge Beach PR. No runtime code changed in checkpoint 1; no runtime tests claimed.

## Known issues / next action
Workspace Git authentication and package availability must be resolved or use existing GitHub CI for verification. No implementation exists yet. Next: bounded research and four-zone blueprint, then basic scene/travel.

DRAFT ONLY. Do not merge, deploy, publish, use Replit credits or alter the read-only reference repository.
