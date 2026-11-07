# Animation contract

`LocomotionMotion` describes speed, actual travelled distance, running, optional explicit state and traversal parameters. Idle/walk/run resolve from actual speed. Crawl, crouch, climb, balance and recover override joint rotations with `TraversalBlend`; weights damp on entry, interruption and exit. Turn/interact/cinematic are reserved contract values; existing facing/talking/staging continue to own those motions.

Both rigs already have pelvis, spine, head, shoulders, elbows, thighs, knees and ankles. Hands are integrated in forearms, feet in ankle geometry. Articulation preserves all authored proportions. No skeleton, physics, texture or animation dependency added. Procedural displacement drives cadence, so pauses stop stepping; weights still blend. Future models can consume the same motion state through a clip/mixer adapter.
