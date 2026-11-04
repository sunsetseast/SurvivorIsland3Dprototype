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

Budget comparison accounts for exactly that measured storage delta; every other resident geometry byte and all texture storage remain under the previous strict checks. Draw and triangle assertions are unchanged. Browser captures and lifecycle checks must confirm the final implementation; physical iPhone testing is not claimed.

## Regression checkpoint

The first paired-capture CI run passed [41935103227](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/41935103227): 28 matched poses, Chromium 156 on both refs, original draw/triangle/storage budgets. High shelter-ground is stable at 183 calls. Cave/foliage saved and ref-confirmed at `9f1f12001ec61590829951ea287213201bba8522`; shelter saved and ref-confirmed at `80c7ee9e132d4023a8b2420fd94af8ae7d19c3f8`.

All 120 local unit tests pass, including 361 directed spot routes and 44,769 physical NPC travel frames. Workspace-wide TypeScript, production build and six world-check groups / 294 solid sweeps pass. Existing large chunk/dynamic import warnings remain. Physical iPhone Safari is not certified.

A living-camp browser check on the CI-fixture-only checkpoint failed its beach arrival assertion. That harness left Three's clock running during nominal fixed-step captures. It now stops the wall clock like the other project harnesses and records the full arrival/route/clock state if the assertion fails. No NPC runtime behavior is changed by this follow-up; final CI must establish the outcome.
