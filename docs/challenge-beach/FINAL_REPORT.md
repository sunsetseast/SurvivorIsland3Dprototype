# Challenge Beach — PR #23 final implementation report

**Continuation status:** a follow-up cleanup fix removes disposed, detached equipment from scene ownership tracking so repeated previews do not retain old CPU geometry arrays until departure. Local tests now pass **138/138**, plus TypeScript and production build. New WebGL ownership-plateau verification is pending in CI; the successful runs and image/performance evidence below describe the original completed runtime. See [PROGRESS.md](PROGRESS.md) for the current checkpoint.

PR: https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/23

Branch: `feat/railay-challenge-beach`. **DRAFT, unmerged; nothing deployed or published.** Reference repository unchanged; no Replit Agent/credits.

Runtime verified at `831e47400c06f120fa7d73791ba2eea4d8cfbe40`. Evidence committed and all 16 image hashes verified at `acf092025f450f8be1447662b1e32491f6315be6`. Last ref-confirmed checkpoint before this final documentation commit: `8eca687a1b17a579612bfb84750cd8bc87cbfab3`. The PR description and final handoff carry the final documentation head SHA; a commit cannot embed its own SHA.

## Delivered environment and four demonstrations

One continuous, artistically condensed west-facing Railay coastal location loads through the existing challenge_main registry entry. It reuses the existing Player, sky, characters, materials/assets and single-scene ownership. Limestone headlands frame a curved beach, continuous sand/forest ground, tropical vegetation, inland paths and four clearings/footprints.

| Zone | Implemented environment and equipment | Functional scope |
| --- | --- | --- |
| A Main Beach | Broad sandy strand, two tribe lanes, host/waiting edges. **Coastal Traverse** has planked starts, rope-roof crawl frames, supported beams, A-frame cargo nets, rear rungs and original puzzle finish decks. | Walking/running, safe circulation and static equipment collision; no obstacle or puzzle gameplay. |
| B Ocean | Shared coast, dry staging/finish and shore markers. **Tidebound Relay** has three retrieval platforms with pontoons, bracing, anchors, ladders, hanging tokens and buoy lanes. | Offshore models are visible; unsupported swimming/diving/raft states remain blocked. |
| C Jungle | Planted inland clearing, signs, outcrops, roots and trail access. **Canopy Passage** has braced rope towers, sloped cargo nets, hanging-rope gates, crawl passages, beams and finish decks. | Normal exploration around a collidable model; climbing/crawling interactions deferred. |
| D Individual | Smaller sheltered clearing, host/waiting edge. **Stillwater Balance** has eight separated footboards, overhead tether/bucket frames, stack plinths, blocks and placement wands. | Eight safe start/staging positions; no endurance, stacking, timing or elimination logic. |

Central arrival has a safe player/camera pose, ten reserved contestant marks, a host mark, benches and return positioning. Current camp contestant identities render at configuration staging marks without creating or advancing another camp simulation. CampRuntime/provider retain social and contestant ownership.

## Reusable configuration and travel behavior

Each small typed configuration defines identifier/zone, required pieces, starts, contestants, host, finish, view, collision, dependencies and disposal. Only the selected equipment subtree mounts. The developer selector validates the next setup, locks/releases input, removes/disposes the old equipment and then activates the next at a safe view. It neither grants admission nor changes season state/results.

Rehearsal requires an explicit development/test build, the developer URL flag, a participant/origin/scope-matched one-use grant and departure proximity. Normal release builds cannot enable it with a URL alone. The admitted rehearsal receives an event-scoped prototype instance; return restores the exact source camp instance and departure pose. Cancellation, stale loads, failed-load retry, denied admission and resume identity are tested. Production event authority is explicitly deferred.

Developer review: run the existing Vite development command with PORT/BASE_PATH, open `?devTravel=1`, continue the Survivor session, walk to the existing camp departure sign, authorize Challenge Beach rehearsal, then select Rehearse Challenge Beach. Use the small preview selector and Return staging control; the normal travel button returns to camp. These controls are disabled in normal gameplay.

## Verification and CI

All five implementation workflows pass at verification commit `a7491c4c2f45e3fef79f594d2c1da46caf8dd119`. GitHub comparison confirms byte-identical runtime/harness source to `831e474`; the only intervening change was the temporary evidence-saving workflow, which is now removed.

- **134/134 unit tests**, TypeScript, world checks and production build pass. Twelve added targeted groups cover all configuration spawns, collision/water safety, both directions of the route network, admission/instance/identity/return, revoked grants, retry and stale cancellation.
- **10/10 real WebGL groups** pass: build/URL gating, camp ownership/state retention, four previews in Low/High, all six real Player route chains using trusted keyboard input, actual three-touch Run/look/joystick behavior, repeated selection cleanup, three camp round trips and error/asset checks.
- One detailed scene maximum. Repeated selected state: **80 geometries / 11 textures / 33 listeners**; repeated camp returns: **148 / 26 / 48**. No uncaught page, shader/WebGL errors or failed asset requests in the final Challenge Beach run.
- [Exact CI snapshot](CI_RESULTS.json), [successful Challenge Beach run](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42068507831), [connected journeys](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42070827643), [mobile controls](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42070827562), [flagship camp](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42070827158), [full camp/heroes/Tribal/assets proof](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/runs/42070827150).

## Evidence and measured envelope

[Actual WebGL gallery: 12 High + four Low captures](GALLERY.md) · [Original report](evidence/browser-report.json) · [Hashes/provenance](evidence/PROVENANCE.json) · [Performance comparison and budgets](PERFORMANCE.md). Images were visually inspected and meaningful composition, ground, water and limestone issues corrected. Inspection-camera images are labeled; they are not proofs of unimplemented swimming/climbing.

Across the four fixed poses, Low measures **22–92 draws / 190,182–258,294 triangles**; High **22–92 / 567,714–640,482**. Active geometry-array sums are about **7.93–8.90 MiB Low / 9.59–10.87 MiB High**, separate from resident GPU counts. Initial review ceilings derive from these measured views plus headroom: 110 calls, 300k Low / 740k High triangles, 100 resident geometries and 13 textures. Larger future rosters must be remeasured. Chromium/SwiftShader data is **not physical iPhone FPS, thermal, battery or Safari certification**.

## Fifteen challenge references

[Reference library](REFERENCE_LIBRARY.md) contains verified occurrences, original source/photo-page links, formats, physical structures, estimated spatial needs and original adaptations. No television reference artwork is redistributed.

- Main Beach: [The Obstacle Course](https://survivor.fandom.com/wiki/The_Obstacle_Course), [Challenge Pitch](https://survivor.fandom.com/wiki/Challenge_Pitch), [The Maze](https://survivor.fandom.com/wiki/The_Maze), [A Crate Idea](https://survivor.fandom.com/wiki/A_Crate_Idea).
- Ocean: [Sea Legs](https://survivor.fandom.com/wiki/Sea_Legs), [Dive Masters](https://survivor.fandom.com/wiki/Dive_Masters), [Sea Salvage](https://survivor.fandom.com/wiki/Sea_Salvage), [Quest for Fire](https://survivor.fandom.com/wiki/Quest_for_Fire).
- Jungle: [Caught in the Web](https://survivor.fandom.com/wiki/Caught_in_the_Web), [Blind Leading the Blind](https://survivor.fandom.com/wiki/Blind_Leading_the_Blind), [Rock n' Roll](https://survivor.fandom.com/wiki/Rock_n%27_Roll), [Snake in the Grass](https://survivor.fandom.com/wiki/Snake_in_the_Grass).
- Individual: [Simmotion](https://survivor.fandom.com/wiki/Simmotion), [When It Rains, It Pours](https://survivor.fandom.com/wiki/When_It_Rains%2C_It_Pours), [Operation Balance Build](https://survivor.fandom.com/wiki/Operation_Balance_Build).

## Checkpoints and remaining work

Delivered checkpoints **1–12**: secured branch/architecture; bounded research/blueprint; basic scene/travel; coast/staging; inland zones/routes; main model; ocean model; jungle model; individual model; modular preview; integration/regressions; evidence/final documentation. Each implementation checkpoint was committed, attached to the branch and remotely ref-confirmed before the next. The unavailable local workspace caused no loss of implementation: a guarded GitHub job recovered the exact successful CI images/report into the branch; that temporary write workflow is removed in this final checkpoint.

[Known limitations](KNOWN_LIMITATIONS.md): models are not competitive minigames; swimming, climbing, puzzle/stack interactions, scoring/rewards, challenge AI and production event/season authority remain future work. Device acceptance is still needed. Existing chunk/import warnings remain.

Recommended next playable slice: **Stillwater Balance**, a short individual balance/placement trial using an existing station, with touch/keyboard interaction, deterministic temporary rehearsal results, retry/cancel and safe exit. It avoids introducing swimming/climbing or team AI. [Bounded next-PR plan](FIRST_PLAYABLE_CHALLENGE.md). Keep this PR draft; do not merge or deploy.
