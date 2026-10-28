# Real browser gameplay evidence

Chromium 153.0.8010.0 / ANGLE SwiftShader, 932×430 touch viewport, DPR 1, low quality. These are actual in-game WebGL captures; the viewport emulates iPhone landscape. Physical iPhone Safari is not certified. The harness uses trusted browser keyboard/touch input and the real Player, terrain, collisions and rig; fixed 60 Hz simulation runs between captures.

The development preview accepts `?devTravel=1&quality=low`. Continue the Survivor session, follow the existing camp path south to the wooden Jungle Trail sign, observe the invitation restriction, authorize the development journey, then activate Begin journey. On the trail, walk back to the Tribe Camp sign and activate Return to camp. Without the development flag, the menu has no Railay scene selector or invitation-grant control. No deployment was created for this PR.

| Order | Capture | What it shows |
| --- | --- | --- |
| 1 | [Camp before travel](01-camp-before.jpg) | Existing player, camp and NPCs, stable location identity |
| 2 | [Departure trail](02-departure-trail.jpg) | Real path-edge waymarker and unauthorized restriction |
| 3 | [Authorized interaction](03-authorized-interaction.jpg) | Invitation granted; Begin journey available |
| 4 | [Transition](04-transition.jpg) | Deliberate travel/loading presentation and safe-return control |
| 5 | [Tonsai arrival](05-trail-arrival.jpg) | Safe geographic entrance and third-person player |
| 6 | [Player on trail](06-player-trail-multitouch.jpg) | Landscape joystick, camera and Run during trusted multitouch |
| 7 | [Return connection](07-return-connection.jpg) | Corresponding trail-to-camp action |
| 8 | [Map correspondence](08-map-correspondence.jpg) | Existing coastline, authoritative location labels and live position |
| 9 | [Restored Camp](09-restored-camp.jpg) | Correct inward-facing path arrival after return |
| 10 | [Interrupted load](10-load-error.jpg) | Retry and safe-return recovery controls |
| 11 | [Camp dialogue](11-camp-conversation.jpg) | Existing NPC conversation after repeated journeys |
| 12 | [Tribal Council](12-tribal-council.jpg) | Existing sanctuary and exploration controls through adapter |
| 13 | [Voting regression](13-tribal-voting.jpg) | Existing voting pavilion and practice-ballot animation |
| 14 | [Actual failed request](14-network-load-failure.jpg) | Aborted destination-module request, followed by verified recovery |

[Full ordered browser results](browser-report.json) include transition timings, rendering/resource statistics, disposal counts, tracked global listener counts, resource requests/timings and trusted touch events. Only the conversation and voting regression fixtures use debug positioning; the Camp-to-trail walks and journeys use actual movement input. Failure scenarios are explicitly labeled injected or actual network aborts.

[PR #13 mobile regression](mobile-regression/report.json) and [run log](mobile-regression/run.txt) preserve the full control test suite. [Legacy Tonsai visual QA](legacy-tonsai/run.txt) verifies the revised meaningful texture-readiness assertion and existing environment behavior.
