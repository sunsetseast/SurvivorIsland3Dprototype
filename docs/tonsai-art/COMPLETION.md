# Final Tonsai completion pass

## Recoverable checkpoints

- Initial state: PR #22 open and draft, `feat/tonsai-environment-art` at `ab5bb14d91cb35c3a09e6086aa50a7cd17721baa`. No uncommitted tracked implementation. Interrupted transfer fragments archived separately before editing.
- CI fixture correction: `1d64d6c3f5caaf9465b27c5dbc6accacd532e008`, GitHub branch ref and fetched remote confirmed. Six targeted tests and script syntax checks passed before saving. New paired WebGL CI run: [41935103227](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/41935103227).

## Cave collision and camera visibility

The vault's two cheeks start at z=96, ahead of the ground-level main cliff envelope. Added their narrow standing-body envelope to the existing shared `cliffSolid` solver, including body clearance at both ends. All seven inherited intersecting integer positions are blocked. The geometry, cave opening, shoreline and terrain were not edited. Twelve 1m grid positions are removed for wall/body clearance; 2,299 remaining southern samples now pass against BOTH shipped cliff LODs with **no intersection exemptions**.

Rebaked the existing navigation graph: 24,917 → 24,905 nodes, 273,955 packed bytes. Cave tests cover both walls, central and edge entry/exit lanes, side-to-side turning and actual NPC routes. All 12 trails, 39 hiding IDs and approaches, spring travel/return, NPC activity anchors and independently reconstructed bake edges passed the targeted expansion/refinement checks. TypeScript and the instrumented production build passed.

The existing alpha-tested leaf materials now cut a narrow, softly edged coverage corridor only between the camera and the player's torso. Leaves beyond the character and outside that corridor retain their coverage. This reuses existing MSAA/alpha-test coverage; it adds one shared focus vector and no blended materials, vegetation removals, geometry, textures, extra draws or postprocessing. Physical iPhone verification remains required; current CI captures are browser results.


## Shelter finishing

The decoded, scene-owned shelter receives a one-time finishing pass: irregular drooping palm eaves, continuous weathering variation, crossed existing rope wraps and three woven sleeping mats plus a rolled spare. Mats are merged into the existing supplies mesh; the five shelter draws, original bamboo supports, physical deck, ramp and NPC anchors remain. This adds exactly **34,916 resident geometry bytes in each quality mode**, no downloads, textures or materials. Roof/deck clearance, unchanged deck coordinates, finite positions and idempotent processing pass for both actual shipped LODs. Source assets are reused intact; the loader disposes the replaced small supplies geometry and temporary construction buffers.

Budget comparison accounts for exactly that measured shelter storage delta; the separately measured cave-litter delta is described below. All unaccounted geometry bytes and all additional texture storage are rejected. Draw and triangle assertions are unchanged. Browser captures and lifecycle checks must confirm the final implementation; physical iPhone testing is not claimed.

## Regression checkpoint

The first paired-capture CI run passed [41935103227](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/41935103227): 28 matched poses, Chromium 156 on both refs, original draw/triangle/storage budgets. High shelter-ground is stable at 183 calls. Cave/foliage saved and ref-confirmed at `9f1f12001ec61590829951ea287213201bba8522`; shelter saved and ref-confirmed at `80c7ee9e132d4023a8b2420fd94af8ae7d19c3f8`.

All 120 local unit tests pass, including 361 directed spot routes and 44,769 physical NPC travel frames. Workspace-wide TypeScript, production build and six world-check groups / 294 solid sweeps pass. Existing large chunk/dynamic import warnings remain. Physical iPhone Safari is not certified.

A living-camp browser check on the CI-fixture-only checkpoint failed its beach arrival assertion. That harness left Three's clock running during nominal fixed-step captures. It now stops the wall clock like the other project harnesses and records the full arrival/route/clock state if the assertion fails. The pinned-clock diagnostics did not resolve the arrival failure; the subsequent social-button correction below addresses it. No NPC runtime behavior was changed.


The cave body-envelope correction also changes soft-plant eligibility near the vault. The existing deterministic litter generator emits one additional 32-triangle leaf-litter patch: **3,456 bytes** in each quality mode. CI at `9f1f120` exposed this legitimate resident-geometry delta, with unchanged spawn calls and triangles relative to the first recovered art checkpoint. The reporter now measures named ground-detail meshes separately; comparison permits at most that measured debris delta and exactly the shelter delta, while rejecting every unaccounted geometry byte. Combined completion storage increase is **38,372 bytes (37.5 KiB)**; texture storage and spawn draw calls retain exact equality. This is separate from the original nondeterministic draw-call failure, which already passed under unchanged limits.


## Mobile social-button correction

Pinned-clock diagnostics still showed a valid beach route, `traveling=true`, zero speed, zero replans and no accumulated obstruction. The conversation branch was holding the actor after the decline touch. The former per-button compatibility-click suppression disappeared when that button unmounted, allowing a replacement Talk control to receive the same touch's synthetic click. Social-button touch suppression now survives replacement, pointer-up requires the matching captured pointer and cancellation clears it; keyboard/assistive detail-zero clicks and deliberate subsequent touch activations remain valid. The browser check explicitly asserts that declining leaves no conversation, before attempting the physical beach route. This is a focused mobile interaction correction; no NPC pathfinding or simulation rules are changed. CI must verify the touch regression.

## Physical iPhone 17 Pro Max acceptance checks

These checks require the real phone and are not claimed by Chromium SwiftShader or WebKit automation:

- In Low and High, walk/run from camp around the southern cliff. Enter the cave along its centre and both sides, turn across the interior and walk back out. Press into both cheek walls and orbit the camera; neither body nor camera should pass through rock. Verify spring access and a few hiding approach routes.
- From normal third-person view, walk and rotate slowly near the cave and inland trail. The player/next steps should remain readable. Nearby leaves should clear gradually in the central sightline; surrounding jungle should stay dense without abrupt whole-plant popping.
- Walk the shelter ramp, deck and sides; inspect mats, palm eaves and crossed ties. Talk to an NPC, use dialogue choices, leave, then decline a new approach with Not now. The same tap must not open Talk. Resume joystick, camera and sprint, including portrait/landscape rotation and app-background/resume.
- Travel camp → Railay → the original camp, then use the existing Tribal Council rehearsal and return to camp. Confirm correct arrival, character controls and NPC state, without a second scene remaining resident.
- Play for at least 5–10 minutes in each quality. Record observed frame rate, heat and obvious stutters on the phone. Automated host software-render intervals are not physical-device FPS, thermal or battery measurements.


The mobile decline regression passed in the live browser job on `19c7385`; the physical beach route now completes. The four-round connected travel job separately observed return-HUD listener counts 43, 43, 47, 43. A touch owner uses four global listeners; TravelHud refreshes pose-dependent controls at 150ms. Sampling now waits for three equal observations across that refresh/effect boundary, retaining the original exact equality assertion and recording each listener identity for diagnosis. It does not add a listener tolerance or change travel/resource ownership. One existing reconstruction capture was added facing the shelter's sleeping area from the actual Player camera, so the mats can be reviewed directly.
