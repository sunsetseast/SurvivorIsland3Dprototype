# Animation contract

`LocomotionMotion` describes speed, actual travelled distance, running, optional explicit state and traversal parameters. Idle/walk/run resolve from actual speed. Crawl, crouch, climb, balance and recover override joint rotations with `TraversalBlend`; weights damp on entry, interruption and exit. Turn/interact/cinematic are reserved contract values; existing facing/talking/staging continue to own those motions.

Both rigs already have pelvis, spine, head, shoulders, elbows, thighs, knees and ankles. Hands are integrated in forearms, feet in ankle geometry. Articulation preserves all authored proportions. No skeleton, physics, texture or animation dependency added. Procedural displacement drives cadence, so pauses stop stepping; weights still blend. Future models can consume the same motion state through a clip/mixer adapter.

Challenge open segments automatically request run even while accelerating; crawl/balance/climb/interact override that default. Stopping resolves idle. Exploration keeps its existing optional Run toggle. Both contestants and player adapt gait and lean to actual speed.

| Gameplay | Motion | Transition |
| --- | --- | --- |
| Camp stationary / moving | Idle / walk / run | Actual displacement and Run toggle |
| Race open lane | Run, idle on stop | Analog pressure accelerates; run is automatic |
| Low frame | Crawl | Lower hips, rotate spine/head, alternating bent limbs |
| Beam | Balance | Terrain-supported legs, spread arms, body-only lean |
| Failed beam | Recover / return stride / rise | Original two-second deterministic penalty |
| Net ascending / crest / descending | Climb | Continuous slope blend, alternating limb targets |
| Mosaic | Interact | Existing work gestures; inspection owns camera |
| Stillwater / Tribal / dialogue | Existing staged motions | Shared exploration camera yields ownership |
