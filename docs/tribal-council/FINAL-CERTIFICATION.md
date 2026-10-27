# Final Tribal Council pass

Based on main `93fd6468686cfaa3c3c128fc0b6ec5395ab271d9`. PRs #6, #7 and #8 were verified merged before implementation; main was checked again before delivery. SurvivorIsland2025 was not modified. Draft only; no merge or deployment.

## Implemented

The sanctuary gains recessed ruined galleries, damaged cornices, partially concealed animal reliefs, exposed brick/plaster, heavy roots and hanging vegetation. Warm practicals frame the Council and voting station against cooler jungle silhouettes. One additional **non-shadow-casting** point light makes the front entrance readable; the original single directional shadow remains. The opt-in synthesized jungle/fire sound gains a subtle wind bed and distance attenuation around the voting fire.

The voting route now goes around the east wall and **through the centred front gable**. The former side opening is closed. Front wings, doorway and table share movement/camera envelopes; a separate overhead lintel proxy preserves walking clearance. The interior has a thick planked writing table, carved apron, stretchers, relief panels, bronze details and a framed jungle backdrop.

`votingAnchors.ts` owns entrance, writing, table, parchment, marker, urn, bag and camera datums. Original Blender-authored close-up meshes are integrated: a dark carved marker with exposed black tip and resting cap, a hollow handled urn with a removable lid leaning beside it, gathered charcoal cloth bag with seams/drawstrings and rolled scrolls, and thick irregular curled parchment. The new GLB contains **16,622 triangles, one material, one 512² atlas and 1,819,868 bytes**; editable packed `.blend`, generator, atlas and hash manifest are included.

There is **one ballot urn, inside the booth**. The permanent host urn was removed. This prototype has no tally-transfer phase to preserve. The practice ballot folds, lifts over the opening and lowers into the urn; its diagonal fits the 0.53 m mouth. A single state authority rejects repeated folds/deposits. Practice voting and the bag do not change season outcomes or advantage odds. The animation is presentation staging, without hand-to-prop IK.

## Camera and controls

Exploration has one active camera writer in `Player`; ceremony owns the camera while that player is unmounted. Camp dialogue retains its existing framing. Explicit debug ownership distinguishes follow, manual look, voting transition/portrait, dialogue and ceremony.

Portrait entry requires the writing side, facing within 0.8 radians and distance below 0.86 m. Exit uses 1.55 m hysteresis. Approaching never opens the form or submits a ballot. Exponential position/look/FOV blending reverses when leaving and returns toward the player's **current** follow target; no saved world position is restored. Cancel releases portrait ownership until the player leaves the zone. Existing obstruction rays and terrain sampling remain active, with corrected table height and booth/urn/lintel proxies.

Right-thumb yaw/pitch works during walking and running. Manual orbit wins over recentering; after release there is a 0.85 s grace period. Moving then recentres behind the character; stationary inspection stays put. Each continuous stick/key gesture captures its movement basis, preventing automatic camera turns from steering diagonal/backward travel into a feedback loop. Release and begin a new gesture to move relative to the inspected view. Run is a toggle; joystick release/cancel stops sprinting, and Shift remains available. Pointer ownership, focus loss, scene exits and dialog input clear the relevant state. A writing-only visual-viewport resize keeps the canvas and compact form above a software keyboard.

## Verification

- **48 automated tests pass**, including reachable routes, privacy, voting thresholds/reversal, bounded real Blender geometry/UVs/hashes, duplicate deposits, shared controls, and existing camp/seating regressions.
- App TypeScript and Vite production build pass. The existing large-bundle warning remains.
- Real Chromium/SwiftShader application rendering: all four routes traversed both ways with the actual controller; automatic portrait/hold/exit/revisit/cancel; modal movement lock; visible fold/deposit; two simultaneous CDP touch pointers for walk/run plus orbit in **both** scenes; independent releases; focus loss; obstruction recovery; and 4/5/8/12 matching unique stools pass, with zero recorded application errors.
- A simulated keyboard visual viewport of 220 px produced a 220 px canvas and a form entirely within y=12–208. This is not a native keyboard/device test.
- The existing camp browser suite also passes desktop/mobile conversations, response/leave/camera return, NPC approach/decline, latched sprint and autonomous updates.

See [evidence and ordered sequences](final-evidence/README.md), [raw review](final-evidence/review.json), [camp regression](final-evidence/camp-regression.json), and saved test/build logs. Physical iPhone Safari, sustained FPS and thermal testing were **unavailable**.

## Performance findings

Matched 1280×800 cameras, full quality; actual WebGL counters:

| View | Calls before → after | Submitted triangles before → after |
|---|---:|---:|
| Council wide | 253 → 253 | 443,039 → 455,119 (+2.7%) |
| Guardian / gallery | 88 → 88 | 237,232 → 250,035 |
| Voting exterior | 131 → 134 | 286,595 → 324,380 (+13.2%) |

Unique scene vertex/index arrays increase from **61.4 to 66.1 MiB**; these are buffer-array estimates, not whole-device GPU memory. The props add approximately **1.33 MiB** of RGBA atlas/mipmap storage. Texture upload counters are view-dependent: 11 in the wide view, 11→12 at the voting exterior. Total scene lights are 8→9, with one shadow caster throughout. Repeated environment detail remains batched/instanced; the existing low-quality sanctuary/shadow path remains available.

Host whole-scene update callbacks measured median/p95 **0.2/4.9 ms before**, **0.4/2.9 ms after**. Isolated exploration camera updates measured **0.1/0.3 ms** median/p95 in the interaction run. These short, quantized host samples do not establish a speed improvement. Warm wide-view software draw/readback samples were roughly 1.09–1.18 s before and 1.31–1.64 s after; initial cold samples were much slower. These are **not iPhone FPS**. The additional entrance light and close-up geometry have a real cost requiring device review. Raw [before](final-evidence/before-performance.json) / [after](final-evidence/after-performance.json) results are retained.

## References and reproduction

The [official Paramount pen](https://www.paramountshop.com/products/survivor-voting-pen) informed the wood-like carved marker, grip, cap and black nib. Probst's accounts informed [privacy](https://ew.com/survivor-48-host-jeff-probst-explains-why-moved-voting-booth-11712400), [urn collection/tally staging](https://ew.com/survivor-jeff-probst-reveals-how-he-secretly-tallies-votes-8737079), and the [scroll draw bag](https://ew.com/survivor-jeff-probst-more-than-6-shots-in-the-dark-11720962). [Kaleb's firsthand description](https://ew.com/tv/survivor-45-kaleb-gebrewold-interview/) informed rolled scrolls inside a cloth bag. The urn ornament is an original fictional sanctuary design, not an exact season replica. Reference imagery is not embedded in the assets.

From repository root:

```sh
pnpm --filter @workspace/survivor-camp-prototype test
pnpm --filter @workspace/survivor-camp-prototype typecheck
PORT=5190 BASE_PATH=/ pnpm --filter @workspace/survivor-camp-prototype build
CAMP_CHROMIUM=/path/to/chromium node artifacts/survivor-camp-prototype/scripts/final-tribal-qa.mjs
CAMP_CHROMIUM=/path/to/chromium CAMP_EVIDENCE=/tmp/camp-review node artifacts/survivor-camp-prototype/scripts/living-camp-qa.mjs
```

For matched measurements use `scripts/sanctuary-review.mjs` with `SANCTUARY_ROOT` pointing to a main checkout and `SANCTUARY_BASELINE=1`; use `SANCTUARY_METRICS_ONLY=1` for the current checkout. Set separate `SANCTUARY_OUTPUT` directories. Blender regeneration is documented in [the pipeline README](../../tools/blender/README.md).
