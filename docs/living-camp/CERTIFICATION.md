# Living 3D camp certification

Review date: 2026-10-24 (client timezone).
Prototype base: `d4a1e6f5cfe1da16d55d58b84480027b0062ffc3`, current main at checkout.
Read-only simulation reference: `cf894e578d77fce1e588d793dfc8d14f61ec7628`.

## Result and scope

The existing island is populated by four original, individually modeled stylized
contestants. They move over real terrain, choose activities independently, form
and leave physical conversations, and occasionally walk up to the player. The
player can approach, talk, select contextual responses and return to exploration
using touch alone. The environment, terrain, props, foliage, shelter, joystick,
run input, camera drag and original player appearance are retained.

This is a working 3D social-camp foundation with **partial source reuse**, not the
complete original Survivor simulation. The actual production personality,
physical-presence and owner-scoped memory code runs here. Initial decisions and
limited dialogue are a replaceable demo provider. Cooperation discussion does
not create an alliance, change trust or promise a vote. No challenge, Tribal,
season progression, multiplayer, original-save access, merge or deployment is
included. Only the implementation repository receives commits.

## Actual implementation

- Sandra: broader/shorter silhouette, black bob, sculpted face, red sleeveless
  top and dark shorts; shadow-strategist observation bias from her real ratings.
- Parvati: slender silhouette, long layered hair, narrower face, teal top and
  purple shorts; social connection bias from her real character profile.
- Russell: broad build, shaped nose/jaw, facial hair, brimmed hat, sand/navy
  clothing; private-information and strategic-pressure preferences.
- Boston Rob: taller build, distinct face/stubble, navy monogram cap, red/khaki
  clothing; leadership, camp work and coordination preferences.
- Original merged vertex-color meshes, modeled hands/toes, articulated hips,
  spine, head, elbows/knees/ankles; distance-driven walk with planted stance foot
  and two-link terrain-adjusted leg IK. Idle, conversational, work and seated
  campfire poses blend. The player's run remains available; NPCs currently walk.
- A* over 7,554 traversable lattice nodes built from actual world collision and
  heights. Edges use player collision substeps and deck/ramp height rules. Trail
  cost discourages arbitrary jungle shortcuts. Short smoothing cannot cross
  structures. Nearby bodies block movement; bounded local replanning or cancel
  and reconsider recovers a blocked job without coordinate teleportation.
- Physical position, intended destination, departed/arrived status, activity,
  group, animation, facing, route and simulation identity remain separate. A
  traveler's semantic place is null; arrival receipts fire once after traversal.
- Independently staggered activity deadlines, weighted profile/opportunity
  decisions, recent-interaction dampening, brief social opportunity windows,
  public group joining, voluntary departure and private meetings. The initial
  Rob/Parvati conversation is a starting context and is never replayed as a loop.
- Talk is bounded by distance, height difference and accessible line of approach.
  The same collision-aware camera transitions to a two-shot above the dialogue
  panel. Topic choices read current activity, owned sightings and interaction
  history; authored style-specific speech is explicitly limited.
- NPC approaches require visibility and a valid route; stop outside the player,
  offer an optional interaction, time out or react to walking away, and cool down
  after acceptance/decline. No remote dialogue popup on intent creation.
- Spatial participants, observers and potential hearing candidates are separate.
  Travelers are excluded from location presence and observer/hearing lists.
  Production SocialMemory strips private detail from a visible meeting witness;
  conversation lines are written only to participants. Potential hearing is an
  integration interface, not automatic knowledge of private dialogue.
- Touch/keyboard interaction, 44px minimum dialogue controls, responsive scrolled
  choices, safe-area CSS, keyboard focus trap and Escape exit. A deliberate
  pointer-up completes touch activation after multitouch gestures; duplicate
  compatibility clicks are suppressed.

## Reused original systems and deferred dependencies

| Actual reference source | Treatment in this PR |
| --- | --- |
| `data/GameData.js` | Four exact numeric identities and rating fields projected into `contestants.json`; no avatar photographs |
| `CampBehaviorProfile.js` | Verbatim production trait interpretation used by real decisions |
| `ConversationCharacter.js` | Verbatim strategic/social/conversational style projection |
| `core/LocationKeys.js`, `locations/LocationUtils.js` | Verbatim semantic key/physical-location normalization |
| `locations/CampPresence.js` | Verbatim travel/follow presence gate called by the runtime |
| `SocialMemorySystem.js`, `CampKnowledge.js` | Verbatim owner-scoped observation/history storage and supporting evidence projections |
| `NpcLocationSystem.js`, `CampActivitySystem.js` | Audited choice/start/arrival/witness contracts; not bootstrapped with a fake GameManager |
| `NpcInitiative.js`, `StrategicObjectivePlanner.js` | Audited actor-owned sighting and intention dependencies; full planners deferred |
| `ConversationSystem.js`, `ConversationResolver.js`, `CampInteractionSystem.js` | Audited DOM/GameManager/negotiation/strategy dependencies; replaceable dialogue port, not a claimed full import |
| `RelationshipSystem.js`, `SocialEngine.js`, `AllianceSystem.js` | No duplicate store; optional read port for authoritative trust and asymmetric affinity; defaults remain unknown |
| `CampTime.js`, `SaveManager.js`, `SeasonEngine.js` | Audited; countdown clock, resources, full saves and season transitions remain owned by the original game |

Source snapshots have exact revision/path/SHA256 provenance and hash tests.
They are read-only snapshots, not a live two-repository connection. The original
repository's tracked sources were checked for changes and remain unmodified.
See [architecture and integration plan](ARCHITECTURE.md) for the bootstrap blocker.

## Automated and rendered verification

All eight deterministic tests pass:

1. Source hashes, numeric identities and real personality differentiation.
2. All **256 directed routes** between 16 activity spots, with every smoothed edge
   checked for collision and correct ramp access.
3. All four characters traverse all five landmarks: **22,978 actual movement
   frames**, grounded positions, bounded per-frame displacement, no early place
   presence, no premature/duplicate arrival event, and no indefinite route stall.
4. Remote talk rejected; proximity talk, response selection, exit and interrupted
   intent recovery preserve physical coordinates and avoid false arrival.
5. NPC approach walks to conversational distance; acceptance, decline and walk-away
   cancellation work with cooldowns.
6. Private observations are deduplicated/owner-scoped; a witness gets no private
   transcript; absent people do not receive a meeting; travelers do not witness
   destination activity or disclose remote intentions through dialogue.
7. Three seeded ten-minute autonomous runs, with asynchronous changes and all
   four contestants selecting varied activities. Final run: **13 new physical
   meeting receipts and 132 departures**, with each contestant selecting at least
   three activity kinds. Group participants are checked for real co-presence.
8. Planted stance foot stays fixed against body displacement at all four rig
   scales; independent forward-kinematic checks recover foot IK targets/level feet.

The existing world checker also passes six checks, including 120 solid collider
cases, shoreline containment, ramp ascent/descent, blocked deck side entry and
all original trail segments. Workspace library/project TypeScript checks and
the production Vite build pass. The existing Vite large-chunk warning remains.

The Playwright harness passes with **zero page exceptions**. It navigates the
actual player from spawn to Sandra, Rob/Parvati, the beach and shelter; validates
real dialogue topic changes; uses trusted touch events for Talk/choice/Leave;
then verifies concurrent joystick/run, input release and camera drag. A physically
walked Russell approach is declined through touch. The runtime unit test separately
covers acceptance. No coordinate teleports are used to reach captures.

There are **14 genuine WebGL captures**: all nine requested scenario categories,
one incoming-approach offer, and four close diagnostic character views. Scenario
setup holds decision deadlines and issues explicit route intents for repeatable
checks; autonomous behavior is tested separately and restored for 120 simulated
browser seconds. Intermediate frames execute real gameplay with GPU draws
suppressed. Portraits use manual diagnostic camera framing. These are openly
labeled in the [evidence index](evidence/README.md) and raw JSON.

The touch layout is checked at 844×390, with additional renderer profiles at
1280×800, 932×430 and 390×844. At 844×390 the panel begins at y=195.5, all dialogue
buttons are at least 44px high and there is no horizontal overflow. Actual physical
**iPhone Safari/WebKit testing was unavailable**; native touch feel, real safe-area
insets, sustained device FPS and thermal behavior remain unverified.

## Performance findings

| CSS viewport | Actual render buffer | Draw calls | Triangles | Short software frame-loop FPS |
| --- | --- | ---: | ---: | ---: |
| 1280×800 | 1280×800 | 150 | 238,507 | 2.86 |
| 844×390 | 844×390 | 150 | 238,507 | 5.29 |
| 932×430 | 932×430 | 150 | 238,507 | 4.81 |
| 390×844 | 390×844 | 148 | 229,532 | 5.12 |

Raw source: [browser-certification.json](evidence/browser-certification.json).
The renderer is ANGLE / SwiftShader Vulkan in headless Chromium 130. Counts depend
on camera, culling and who is visible. Short wall-clock FPS samples are software
renderer measurements; they are not iPhone performance or a claimed 60 FPS result.
`renderAndFinishMs` also records isolated render-call samples; command queuing makes
those unsuitable for deriving FPS. Use the actual frame-loop values above.

The four rigs total **39,914 triangles**, about **3.45 MB** unique uncompressed
geometry attribute arrays, one shared Lambert material, and zero new character
textures/model downloads. The last measured scene has 113 renderer geometries and
11 textures including the existing environment/shadow resources. No new lights or
postprocessing were added. Mesh culling and merged parts retain the existing
island's foliage instancing, LOD, draw distance, shadow map and 1.5 DPR cap.

Across 7,597 sampled camp updates, physical/decision work averaged **0.0280 ms/update**, with a measured maximum of **8.50 ms**. Rig animation averaged **0.0043 ms/character update** over 30,388 samples, with a measured maximum of **3.80 ms**. These are host CPU samples with timer quantization and include fixed-frame test execution; they exclude GPU raster cost. Cached static navigation edges are not revalidated against every prop during dynamic-body searches, which removed the early recovery spikes.

The production output remains a single main JS chunk (~1.27 MB / ~362 KB gzip)
and ~99.6 KB CSS / ~17 KB gzip. The report does not equate compressed network size
with GPU memory. Browser/test screenshots are documentation, not runtime downloads.

## Limitations and risks

- Activity weights and authored dialogue are temporary. Chores/collecting water
  are physical activities/poses, not authoritative resource production. No trust
  mutation, alliance formation, voting consequence or fully strategic goal solver
  is claimed. Dialogue choices are recorded in the actual memory history but do
  not yet execute the full semantic conversation resolver.
- Position/presence APIs are real; the original countdown clock and route-step
  completion need coordinated authority before live season integration. The
  prototype player ID is reserved as 0 and must map to the engine player identity.
- The spatial model uses conservative 2D collider/height visibility, not a full
  eye-level acoustic/occlusion model. Potential hearing is exposed; deliberate
  probabilistic overhearing and private-word leakage remain deferred.
- Shared meetings currently have two or three NPCs. Private speech can occur near
  camp, where witnesses may see the meeting; words remain participant-only. NPC
  approaches target a visible nearby player, not magically known remote positions.
- Stuck recovery can abandon and reconsider a destination when blocked too long;
  it never claims that canceled travel arrived. The finite current world is the
  tested navigation domain. Any geometry/layout change needs the route suite.
- Procedural representations are stylized interpretations requiring product-owner
  visual approval, not photographic likenesses. No lip sync/facial blendshapes,
  custom NPC sprint, authoritative needs, work resources, save/load or offline
  season replay is implemented. Characters and memory reset on reload.
- Software rendering is slow on this host. It validates WebGL output and controls,
  not a physical iPhone performance budget. Preserve environmental quality until
  actual device profiling identifies a concrete bottleneck.
- The CI workflow is supplied; local execution is certified here. Hosted GitHub
  workflow status must be checked on the draft PR, not assumed from local success.

## Reproduction

Use Node 24 and pnpm. In an environment enforcing dependency lifecycle approval,
install without lifecycle execution using:

```sh
pnpm install --frozen-lockfile --ignore-scripts --config.strict-dep-builds=false
pnpm exec tsc -b
pnpm --filter @workspace/survivor-camp-prototype typecheck
pnpm --filter @workspace/survivor-camp-prototype test
node artifacts/survivor-camp-prototype/scripts/world-check.mjs
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/survivor-camp-prototype build
pnpm --filter @workspace/survivor-camp-prototype exec playwright install chromium
pnpm --filter @workspace/survivor-camp-prototype qa:living-camp
```

The certification host used downloaded Chrome-for-Testing 130 headless-shell
because its default browser distribution was unavailable, with
`CAMP_CHROMIUM=/tmp/camp-browser/chrome-headless-shell-linux64/chrome-headless-shell`
and `CAMP_RESTRICTED_HOST=1`. The latter only bypasses unsupported host network
interface enumeration for local Vite. Both overrides are optional on normal hosts.
No generated mockups or external renderer images were used as evidence.

## File-by-file summary

Paths below use the implementation repository root.

| File | Change |
| --- | --- |
| `artifacts/survivor-camp-prototype/README.md` | Current controls, integration limits, verification and report links |
| `artifacts/survivor-camp-prototype/package.json` | Unit/browser QA scripts; test-only tsx and Playwright dependencies |
| `artifacts/survivor-camp-prototype/src/App.tsx` | Read-only camp/debug metrics alongside the existing controller debug API |
| `artifacts/survivor-camp-prototype/src/game/Scene.tsx` | Adds contestants to the existing environment |
| `artifacts/survivor-camp-prototype/src/game/Player.tsx` | Body avoidance, conversation facing, movement lock, two-shot composition and preserved camera envelope |
| `artifacts/survivor-camp-prototype/src/game/Survivor.tsx` | Small conversational gesture; existing appearance and walk/run unchanged |
| `artifacts/survivor-camp-prototype/src/game/Hud.tsx` | Contextual social HUD integration; preserves exploration controls |
| `artifacts/survivor-camp-prototype/src/game/ConversationHud.tsx` | Proximity/approach offer, dialogue topics, touch activation, focus/keyboard exit |
| `artifacts/survivor-camp-prototype/src/index.css` | Responsive social interaction and conversation styling |
| `artifacts/survivor-camp-prototype/src/game/CampRuntime.ts` | Authoritative physical bodies, intent execution, groups, arrivals, interruptions, witnesses and approaches |
| `artifacts/survivor-camp-prototype/src/game/navigation.ts` | Validated lattice A*, trail costs, smoothing and dynamic avoidance |
| `artifacts/survivor-camp-prototype/src/game/Contestants.tsx` | Articulated rigs, blended poses, terrain foot IK and animation measurements |
| `artifacts/survivor-camp-prototype/src/game/contestantArt.ts` | Four authored identities, face/hair/clothes/hand/foot geometry |
| `artifacts/survivor-camp-prototype/src/game/characterMotion.ts` | Displacement-driven planted foot sampling and two-link leg solver |
| `artifacts/survivor-camp-prototype/src/game/simulation/contracts.ts` | Replaceable decisions/dialogue/physical receipts/read-only social ports |
| `artifacts/survivor-camp-prototype/src/game/simulation/DemoProvider.ts` | Explicit temporary autonomous opportunity/dialogue provider; uses real profiles and memory |
| `artifacts/survivor-camp-prototype/src/game/simulation/contestants.json` | Exact source identity/rating projection of the four contestants |
| `artifacts/survivor-camp-prototype/src/game/simulation/reference.d.ts` | Narrow TypeScript view of unchanged JS modules |
| `artifacts/survivor-camp-prototype/src/game/simulation/reference-origin.json` | Source revision, paths and SHA256 provenance |
| `artifacts/survivor-camp-prototype/tests/living-camp.test.mjs` | Eight substantive deterministic route, activity, interaction, privacy and animation tests |
| `artifacts/survivor-camp-prototype/scripts/living-camp-qa.mjs` | Actual WebGL gameplay/touch captures and honest measurements |
| `artifacts/survivor-camp-prototype/src/game/simulation/reference/core/LocationKeys.js` | Verbatim source snapshot; provenance/hash checked |
| `artifacts/survivor-camp-prototype/src/game/simulation/reference/locations/CampPresence.js` | Verbatim source snapshot; provenance/hash checked |
| `artifacts/survivor-camp-prototype/src/game/simulation/reference/locations/LocationUtils.js` | Verbatim source snapshot; provenance/hash checked |
| `artifacts/survivor-camp-prototype/src/game/simulation/reference/systems/CampBehaviorProfile.js` | Verbatim source snapshot; provenance/hash checked |
| `artifacts/survivor-camp-prototype/src/game/simulation/reference/systems/ConversationCharacter.js` | Verbatim source snapshot; provenance/hash checked |
| `artifacts/survivor-camp-prototype/src/game/simulation/reference/systems/SocialMemorySystem.js` | Verbatim source snapshot; provenance/hash checked |
| `artifacts/survivor-camp-prototype/src/game/simulation/reference/systems/CampKnowledge.js` | Verbatim source snapshot; provenance/hash checked |
| `pnpm-lock.yaml` | Locks test-only dependency additions |
| `.github/workflows/living-camp.yml` | Typecheck, unit/world/build checks, WebGL QA and uploaded evidence; no deployment |
| `docs/living-camp/ARCHITECTURE.md` | Preimplementation audit, source reuse rationale and future authority plan |
| `docs/living-camp/ASSETS.md` | Original art provenance and geometry budgets |
| `docs/living-camp/CERTIFICATION.md` | This scope/verification/performance/limitations report |
| `docs/living-camp/evidence/README.md` | Capture index and staging disclosures |
| `docs/living-camp/evidence/browser-certification.json` | Raw successful browser checks and measurements |

Each of the 14 evidence JPG files is listed individually in the linked evidence index. Terrain, Flora, Shelter, Camp, world.ts and their environmental asset helpers are unchanged. No file in the original game is part of this change.

## Recommended next development phase

Extract/bootstrap a headless authoritative camp/conversation service from the
original GameManager dependency graph through a separately authorized change to
that repository. Replace DemoCampProvider while retaining this runtime's physical
positions, routes, witness envelope, rigs and HUD. Define elapsed-versus-countdown
clock reconciliation, original identity mapping and completion receipts first;
then connect real needs/resources, trust effects, alliance consent and original
semantic dialogue. Add versioned 3D travel checkpoints alongside original saves.
Do not start challenges or Tribal until that camp boundary is certified.

Run the current draft on a physical iPhone in landscape before declaring mobile
performance certified. Prioritize any measured camera/touch/readability issues
and product-owner likeness feedback over additional generic island scenery.
