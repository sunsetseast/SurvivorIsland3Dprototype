# The Forgotten Island Sanctuary

An original fictional ruin, not a reproduction of a specific cultural or sacred site. Repeated split rings and branching root reliefs give the gateway, sanctuary ribs, columns, furniture and voting chamber a common visual language. The set uses raised jungle banks, a descending winding approach, a stepped rear monument, a timber jury gallery, a low host terrace and an enclosed chamber. Three tiers of foliage (ferns, understory, branching broadleaf crowns/feathered palms) frame the architecture.

## Locked geography

One metre per world unit. +X is map right; +Z is map bottom. `src/game/tribal/layout.ts` is the discoverable authority for staging, circulation, surface height, collision, tree trunks, camera positions and named anchors.

| Area | World location / relationship |
| --- | --- |
| Contestant stumps | Across the top, Z approximately −10 to −13; all twelve alternate forward/back along the curve |
| Arrival | Upper left, (−38, −43), winding to the gateway (−17, −16) |
| Jury | Left-center, X −17 to −21.4, Z −6 to 0; immediately below the arrival; dedicated rear approach |
| Voting chamber | Farther outward at lower left, centered around (−34, 18); screened dogleg entrance |
| Fire | Center, (0, 0), 2.5m exclusion radius |
| Host | Right/front, seat (11.5, 4.8); Jeff stands at (12.5, 6.3) |
| Exit | Behind the host, through the right-hand gateway to (38, 25) |

The booth's high back wall, return walls and dogleg interrupt sightlines from Council to the parchment. Gallery benches face right into Council. Routes are tested both ways, with a 0.36m player radius and substeps to prevent tunnelling. The grade used by the player and terrain vertices is shared.

## Focused production references

Reference images are not redistributed. All geometry, surface maps, effects and audio in this PR are original procedural assets.

- [CBS/Paramount historic photo archive](https://www.paramountpressexpress.com/cbs-entertainment/shows/historic-photo-archive-collection-survivor-seasons-149/photos?limit=500&page=2): production imagery across the early and later seasons. Used to ground the intimate seating/host/fire relationships; these images are visual reference, not map authority.
- [Art department interview, Survivor at 20](https://parade.com/1043280/mikebloom/survivor-at-20-art/): production design interview and Edge of Extinction set image. Informed the use of an architectural story, layered wear and a coherent recurring motif rather than unrelated seasonal props.
- [Jeff Probst's Survivor 48 set tour](https://ew.com/survivor-48-tribal-council-set-exclusive-first-look-tour-jeff-probst-8992751): a fictional history and aged architectural fabric as a set-building method. This sanctuary uses a different invented motif and architecture.
- [Survivor 50 on-set preview](https://www.tvinsider.com/1239088/survivor-50-exclusive-jeff-probst-cast-interview/): modern monumental silhouettes, torchlight and elaborate production framing.
- [Society of Camera Operators, Survivor Part I](https://soc.org/project/survivor-part-i/): multiple camera angles and stand-in staging informed the named camera and seating metadata.
- [Tribal Council production history](https://www.theringer.com/2020/05/12/tv/survivor-tribal-council-evolution-behind-the-scenes): ritual, privacy and intimacy informed the reveal and chamber separation.

The focused research sampled early naturalism, monumental and modern set approaches. It is not an exhaustive, individually verified visual catalog of every requested season. Borneo/Outback/Pearl Islands/Palau, Guatemala/China, Heroes vs. Villains/Cambodia, Edge of Extinction/Winners at War and seasons 41–50 were research priorities, not separate themes to collage into this environment.

## Opening and exploration

Explore Tribal Council starts with a slow overhead drone shot, a ruin detail dolly, a standing Jeff Probst shot, the physical survivor entrance and seating. Boston Rob, Sandra, Parvati, Russell and the existing player rig walk the same upper-left route into five central staggered seats. The sequence is deterministic presentation, not a Council simulation. Skip intro advances to the seated handoff. Stand up and explore enables the unchanged joystick, run and orbit controls. RESET returns the explorer to the beginning of the arrival trail. MENU returns to the start screen.

`intro.ts` owns the shot schedule and arrival trajectories. `TribalIntro.tsx` stages existing rigs without stepping the camp runtime. Camp NPC intent, conversations, knowledge and progression remain paused while Council is active. The island remains a separate selectable environment.

## Future integration boundary

Read-only inspection of `SurvivorIsland2025` covered `TribalCouncilView.js` and `TribalSceneLayout.js`. The original view owns the beat runner, attending tribe, seat assignment, vote choices and completion callback. Its current stump IDs are `stump-1` through `stump-12`. This scene reserves those IDs plus arrival, jurors, host, vote, urn, snuff and exit anchors. A later adapter should stage those beats in 3D and retain the existing 2D event/ballot interface. No reference repository changes, gameplay migration, voting, elimination, juror decision or season engine are included.

## Rendering choices

Static meshes are merged by material; 512px seeded stone/bark/wood/ring/earth microtextures have roughness and bump response. Beveled masonry, contrasting mortar courses, trim, reliefs, twisted roots and fractured rubble carry the medium-scale detail. Organic stump silhouettes have separate end-grain tops, bark splinters, cracks and root remnants. No downloaded models or textures are required.

One cool directional shadow map at 1024², a central flickering bonfire light and five localized fill lights. Torch fire is merged animated 3D geometry, not flame billboards; embers, sparks and smoke have bounded particle counts. Shadow updates are capped around 6 Hz. Low-poly camera proxies follow the collision envelopes so fine carvings do not inflate camera ray costs. DPR remains capped at 1.5. No postprocessing chain. Reproducible browser measurements and real-device limits are in CERTIFICATION.md.

Optional SOUND ON creates synthesized filtered fire noise and a quiet insect bed from a user gesture. It makes no media requests. Gain responds to distance from the bonfire. All nodes are stopped/disconnected on exit, and audio failures leave exploration available.
