# Hero characters and participant-aware Tribal Council

Base: `e97283f` (main, merged sanctuary/Blender PR #7). Scope is `SurvivorIsland3Dprototype` only. Reference simulation snapshots remain byte-identical; `SurvivorIsland2025` was not modified. Draft review only; nothing merged or deployed.

## Visible changes

Sandra has a fuller layered bob, warmer facial planes, a worn red short-sleeved top and a grounded listening posture. Parvati has longer swept hair, a narrower athletic silhouette, weathered teal clothing and purple leggings. Russell retains his compact build and fedora, with integrated beard shading instead of detached cheek discs. Rob retains his broad build, stitched navy cap, faded red shirt and cargo details. Jeff has swept short hair, a blue field shirt with collar/pockets, no contestant buff, and a restrained host posture.

The shared renderer now uses smaller inset eyes, shaped facial planes, continuous upper-arm/forearm contours, grouped opaque hair locks, fabric folds and vertex-painted wear. One native Three.js Standard material receives per-vertex skin/hair/fabric roughness and subtle fabric grain. Geometry remains original, deterministic and maintained in TypeScript. This targeted pass does **not** add a new Blender character pipeline or alter the existing sanctuary GLBs.

Breathing rates, listening glances, torso lean and arm spacing differ across the five heroes. Heading changes ease along the shortest arc. Seated pelvis height and two-link leg IK use the actual stool height and each rig's proportions; soles meet the ground while the pelvis meets the seat. The local player uses the same seating calculation with its own limb lengths.

## Seating contract

`councilAttendance.setParticipants(ids)` is the presentation roster boundary. It accepts 0–12 unique nonnegative integer contestant IDs; `0` identifies the local player. Duplicate IDs, Jeff's host ID and oversized/invalid rosters are rejected atomically. The current prototype supplies its four named contestants plus the local player by default. A future season adapter must supply its resolved attending IDs through this boundary; this PR does not implement a season engine.

Count-aware anchors are centred with 1.35 m horizontal spacing, an alternating stagger and a shallow arc. The same anchors drive actual stool geometry, personal torches, movement/camera collision, arrival routes, seated framing, elimination routes and return-to-seat. Changing the roster rebuilds the environment and resets the ceremony. No fixed twelve-seat furniture or collision placeholders remain. The player's seat follows ID `0`, including when it is reordered.

Jeff stays at his host mark and never consumes a contestant stool. The default five stools seat **four named contestants and the local player**; Jeff is visible separately in the host/context screenshot. Extra-count QA uses explicit prototype appearance fallbacks for additional IDs, not newly authored hero identities.

## Verification

- 42 automated tests: 0/1/4/5/7/8/10/12 attendance, invalid rosters, assignment uniqueness/completeness, arrival completion, return/elimination anchors, continuous routes, material/mesh attributes, distinct identities, bounded geometry, heading damping and seated ground contact.
- WebGL roster review counts the **actual 28-triangle stool-top discs** and camera proxies, verifies matching actor counts and projected framing, and checks rendered foot bounds relative to terrain. Cases: 4, 5, 8, 12; desktop and 844×390 landscape captures.
- Tribal interaction regression: natural intro and skip, arrival/voting/jury/exit traversal, stand/explore, writing/folding a ballot, movement lock, return-to-seat, snuff/last walk, touch joystick/drag camera/audio and menu/camp reentry. Portrait 375×812 and 430×932, landscape 844×390 and desktop 1280×800.
- Camp WebGL regression: physical approaches, dialogue choices/leave, autonomous NPC activities, mobile conversation layout and controls. No browser/shader errors in the successful reports.
- TypeScript, production Vite build and standalone build pass. Vite retains its existing large-chunk warning.

See [evidence index](evidence/README.md), [rendered roster checks/performance](evidence/review.json), [final Tribal flow report](evidence/flow/browser-certification.json), [full route traversal](evidence/flow/full-route-certification.json), and [camp report](evidence/camp/browser-certification.json). Browser captures use fixed simulation steps between genuine WebGL renders, not concept art or Blender screenshots.

## Performance and limits

Every hero retains 13 rigid moving meshes, one shared material, zero character textures and no skinning/alpha-hair pass or extra lights. The exact per-character triangles and unique buffer bytes, including the surface masks, are in [current budgets](evidence/hero-budgets.json) and [main budgets](evidence/before/hero-budgets.json). This deliberately spends additional geometry on hair and faces; it is not a claim that all costs decreased. Fewer actual stools/torches reduce static furniture for small Councils.

| Hero | Main triangles | PR triangles |
|---|---:|---:|
| Sandra | 9,494 | 13,672 |
| Parvati | 9,494 | 13,224 |
| Russell | 10,340 | 10,916 |
| Boston Rob | 10,586 | 11,426 |
| Jeff Probst | 9,568 | 11,832 |

The five named heroes total 61,070 triangles versus 49,482 on main. These counts include both copies of paired limbs; unique buffer memory is reported separately.

Render calls, triangles, memory counters, CPU animation samples and synchronous software-render samples are retained in JSON. **Chromium/SwiftShader is not physical iPhone Safari**; software timings are unsuitable for device FPS predictions. iPhone thermal behaviour, Safari shader compilation and sustained frame rate remain unverified. Existing low-quality DPR/shadow policy is preserved.

Likenesses remain stylized approximations. Hair is rigidly attached to the head; there is no facial blendshape, lip-sync, cloth simulation or eye rig. The screenshots are the review standard for the visible quality achieved in this pass.
