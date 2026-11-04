# Final Tonsai completion pass

## Recoverable checkpoints

- Initial state: PR #22 open and draft, `feat/tonsai-environment-art` at `ab5bb14d91cb35c3a09e6086aa50a7cd17721baa`. No uncommitted tracked implementation. Interrupted transfer fragments archived separately before editing.
- CI fixture correction: `1d64d6c3f5caaf9465b27c5dbc6accacd532e008`, GitHub branch ref and fetched remote confirmed. Six targeted tests and script syntax checks passed before saving. New paired WebGL CI run: [41935103227](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/41935103227).

## Cave collision and camera visibility

The vault's two cheeks start at z=96, ahead of the ground-level main cliff envelope. Added their narrow standing-body envelope to the existing shared `cliffSolid` solver, including body clearance at both ends. All seven inherited intersecting integer positions are blocked. The geometry, cave opening, shoreline and terrain were not edited. Twelve 1m grid positions are removed for wall/body clearance; 2,299 remaining southern samples now pass against BOTH shipped cliff LODs with **no intersection exemptions**.

Rebaked the existing navigation graph: 24,917 → 24,905 nodes, 273,955 packed bytes. Cave tests cover both walls, central and edge entry/exit lanes, side-to-side turning and actual NPC routes. All 12 trails, 39 hiding IDs and approaches, spring travel/return, NPC activity anchors and independently reconstructed bake edges passed the targeted expansion/refinement checks. TypeScript and the instrumented production build passed.

The existing alpha-tested leaf materials now cut a narrow, softly edged coverage corridor only between the camera and the player's torso. Leaves beyond the character and outside that corridor retain their coverage. This reuses existing MSAA/alpha-test coverage; it adds one shared focus vector and no blended materials, vegetation removals, geometry, textures, extra draws or postprocessing. Physical iPhone verification remains required; current CI captures are browser results.
