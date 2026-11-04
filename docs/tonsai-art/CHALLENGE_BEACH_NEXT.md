# Challenge Beach: next PR only

`challenge_main` is already registered as a planned event-scoped challenge at the West Beach map anchor. It has no scene, so current travel correctly refuses it. No challenge arena, gameplay engine or placeholder system is added in the Tonsai completion pass.

The smallest integration changes are:

1. Add a separately loaded compact Challenge Beach scene. Extend `SceneId`, the travel import switch and App's scene selection together. Mark the location playable only when its spawns, height/movement solver, asset readiness and mobile budgets exist. Extend SceneLifecycle readiness for its actual assets; retain release-before-arrival and one active scene.
2. Bind admission to the existing event/season participant authority. TravelPermission already carries an event ID, but current development travel grants a journey only. Add minimal challenge invitation and return connections; validate participant, origin instance and active event. Developer rehearsal entry must not become normal admission.
3. Build the destination instance from the actual season and event ID. Current `localInstance()` produces stable prototype IDs and does not implement event scope. All invited contestants must enter the same event instance, without being reassigned to a different tribe.
4. Retain the original camp location, exact instance and safe return pose. Consume the grant once and restore controls after readiness. CampRuntime/provider remain the owners of contestant and social state; do not recreate the provider or copy state into the arena.
5. Reuse Player's existing `ExplorationWorld` adapter (spawn, height, move, facing, control lock, label) and Survivor/Contestant rendering for the event roster. Camp simulation stays paused while absent. No second camp population or new camp simulation engine is needed.
6. Reuse sand, foliage, sky and water source assets where their local coordinate/terrain assumptions fit. Asset URLs can share HTTP caching, but decoded resources currently have one scene owner. Do not share objects that departing SceneLifecycle will dispose; do not import the whole Railay world to obtain a beach.

Next-PR tests: authorized/unauthorized admission; event instance shared by its roster; valid body and camera spawns; camp → challenge → original camp; cancellation, stale loads, failure/retry; unchanged tribe/provider/contestant state; released inputs; exactly one active scene; stable resource counts across repeated returns; both quality modes. Extend the existing connected-world and mobile checks.

No further integration scaffolding is necessary in this PR. Event admission, instance construction and exact return integration belong with the separate Challenge Beach scene.
