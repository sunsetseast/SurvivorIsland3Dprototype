# Coastal Traverse — recovery record

Base main: 9b20b6da29feb0f8d23e1170bb3ae9bb4149d9e3 (merged PR #25). Branch: feat/coastal-traverse. No existing PR #26 or coastal branch found. No Replit, deployment, publishing, merging or reference repository changes authorized.

## Design

Reuse the existing two lanes x=-27/-14, starts z=-50, crawl -37..-31, beam -24.5..-17.5, net -8.1..-1.9 and puzzle decks z=18. Two-person sequential timed heats prevent physical overlap; player races heat one with one actual contestant, remaining identities race subsequent visible heats. Overall ranking uses personal elapsed time; exact fixed-step ties share places. Idle/finished entrants wait outside lanes. No permanent roster/stat mutations.

Shared joystick/movement-vector math drives continuous, bounded course movement. Low crawl has a low body pose and explicit entry; moving beam adds balance correction and checkpoint fall penalties; alternating net handholds move the body up/down the actual A-frame. Only a fall uses an explicit obstacle checkpoint reset. Six collected pieces unlock a six-piece authored geometric Karst Mosaic: actual dragging, incorrect rejection, correct snap, reset/cancel, true completion; visible 3D station reflects placements. Keyboard equivalents. Fixed-step engine separate from rendering; one scoped session bridge follows Stillwater patterns without coupling its singleton. DEV hub admission stays unchanged.

## Checkpoints

1. Architecture/design — complete: inspected mainCourse, Stillwater bridge, existing character assets/traits, camera/control math and hub/travel admission. Save plan remotely, then draft PR.
2. Race engine — complete: fixed-step lifecycle, continuous bounded sprint, stage/split/checkpoint primitives, timed heats, DNF ceiling, deterministic ranking/ties and immutable trait mapping. Three targeted tests passed. Obstacle mechanics and opponents follow in their checkpoints.
3. Sprint/crawl — complete: continuous joystick/movementVector lane traversal, explicit crouch entry, held crawl progress, safe center corridor and terrain/deck-aware visual pose. Four engine tests pass; render integration follows checkpoint 8.
4. Beam — complete: moving-forward balance with predictable sway, recoverable stability, actual lean, obstacle-only checkpoint reset and two seconds held penalty. Five tests pass including fall/recovery and successful correction.
5. Net — complete: alternating handholds with repeat suppression, smooth fixed-step ascent/descent along the existing A-frame and recoverable grip slips. Six targeted tests pass.
6. Mosaic — complete modules: six authored trapezoids tile the board; spatial collection unlocks genuine slot validation, dragging/tap/keyboard alternatives, reset and cancellation ownership. Generated matching mosaic texture/geometry drives both 3D finish boards; old decorative fake tiles removed. Eight targeted tests pass. Mounting/actual browser verification follows integration.
7. Contestants — complete modules: actual identities use copied strength/endurance/dexterity/focus only; independent course actions, net progress and puzzle attempts. Sequential two-lane heats and overall times. Nine tests pass including ten seeds with variable winners and untouched frozen trait records; TypeScript passes. Existing character renderer follows stage positions/poses; mounted in checkpoint 8.
8. Presentation/hub integration — complete: existing lazy scene, DEV hub selection, intro/tutorial/Ready/countdown, owned joystick/keyboard/net/puzzle input, pause/focus/background cleanup, camera, actual identities/3D boards, results/splits/Retry/Hub/Welcome connected. TypeScript and targeted logic checks pass. Actual WebGL journey verification next.
9. Actual touch/WebGL wins/losses/retries/camp preservation — pending.
10. Full regression/performance and screenshots — pending.
11. Final rules/guide/gallery/performance/limitations/report — pending.

Every milestone: targeted checks, commit, authenticated GitHub save, verify remote ref/tree, update existing draft. Stop implementing if all remote saves fail. Final documents must distinguish actual WebGL emulation from physical iPhone testing. Preserve source when interrupted; resume this branch/PR, do not duplicate.
