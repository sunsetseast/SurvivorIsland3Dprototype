# Expanded Tonsai tribe territory

The former 94 × 94 m camp now connects a coastal camp, a deep inland spring, an interior loop, a southern beach approach and an accessible limestone roof/cave. This is one independently loaded tribe location. There is no cliff climbing, idol spawning, multiplayer implementation or peninsula rebuild.

[Gameplay gallery](GALLERY.md) · [Measured performance](PERFORMANCE.md) · [Future hiding registry](HIDING_REGISTRY.md) · [Raw evidence](evidence)

## Geography and authored reconstruction

The feature being approached is the **Tonsai Wall & Roof / southern headland toward Railay West**, not a new arbitrary northern cliff. Water remains west; the shoreline bends inland toward the southern rock. The inland rise supports a forest route rather than a walk up sheer limestone.

Sources consulted:

| Reference | What it establishes | Limit |
|---|---|---|
| [theCrag: Ton Sai Wall & Roof](https://www.thecrag.com/en/climbing/thailand/krabi/area/15687961) | Beach-adjacent roof; mapped reference at 8.016883 N, 98.834453 E | Crag point, not a survey of the whole formation. Search indexing was available; direct page access was restricted. |
| [TheTopo: Tonsai description](https://thetopo.com/crags/ton-sai/description) | Limestone pockets/tufas, the beach roof and its relationship to Dum's Kitchen and continuing walls | Climbing reference; no exact cave or terrain reconstruction inferred. |
| [Wikivoyage: Ton Sai access](https://en.wikivoyage.org/wiki/Ton_Sai) | Southern forest/headland connection to northern Railay West and a longer inland alternative | Travel description, not elevation data. No tourism structures copied. |
| [SummitPost photographic viewpoint](https://www.summitpost.org/hat-railay-west-right-and-tonsai-beach-left/291726/c-291706) | Identifies the neighboring bays viewed from Thaiwand | Photo metadata retrieved; full-resolution image retrieval was blocked. No image copied into the game. |
| [Existing source-derived peninsula geography](../railay/IMPLEMENTATION.md), [OSM data register](../../data/railay/README.md) | Existing coastline, mapped cliff polylines, geographic axes and known elevation limitations | No new high-resolution DEM or photogrammetric capture was acquired. |
| [PR #14 location registry](../../artifacts/survivor-camp-prototype/src/game/locations/registry.ts) | Tonsai identity, connection endpoints, tribe instance and return contract | The local camp remains a compressed artistic space. |

The spring, small accessible southern cave, specific trees, hollows, boulder passages and secret meeting spaces are **fictional Survivor level design**. The wall's approximately 60–75 m crown, erosion, overhang, exact beach width and local elevations are authored. They are not claimed as measured Tonsai features. In particular this cave is not Diamond Cave, Resort Cave or Phra Nang Cave.

The reference repository `sunsetseast/SurvivorIsland2025` was consulted read-only, including its location graph and water/social location semantics. Its files are unchanged. The prototype retains `waterWell` as its compatibility key, with a new physical spring and relocated activity anchors.

## Playable layout

- A 201 × 191 m broad-phase envelope contains an irregular territory. A coastline, continuous southern limestone, rooted slopes and a dense inland thicket define the actual edge. The ocean edge is tested against the same shoreline used by terrain and map.
- Twelve authored trail branches total roughly 838 m of centreline, including the camp spine, freshwater route, forest loop, southern forest route, southern beach route, root crossing, boulder loop, cave approach and secluded spurs. Some shared routes deliberately reconnect; this total is not unique traversable area.
- The spring at `(108, 36)` is roughly 149 m away by the NPC pathfinder from spawn. Three collection/social positions surround the same rendered pool. The previous stone well, roof, trough collider and old gravel props are removed.
- The southern wall is one continuous, fluted, undercut mass with eroded edges, crown vegetation and closed upper volume. It reuses PR #15's scanned mineral material. Its cave mouth is an actual geometric opening, with side walls, a vault, back wall and terrain floor.
- Player and NPC bodies use the same ground and solid footprints. Limestone blocks at body height, allowing the high roof to extend overhead. Trees, raised root ridges, pool, logs, boulders and camp structures have shared collision data. Decorative understory remains passable.

The terrain uses thirty independently culled chunks and one shared scanned ground material. Its mask samples the expanded coordinates and variable trail widths. The former finite terrain rectangle is no longer used as the playable boundary.

## Distinct landmarks and future idol preparation

Twelve deliberately constructed landmarks are distributed across the camp: ancient buttress fig, intertwined root crown, storm-fallen giant with hollow trunk/root plate, moss gates, southern cave, limestone roof, hollow storm stump, leaning tamarind, strangler fig around a stone, fern bowl, bowed root bridge over a shallow wash, and a secluded stone alcove. The spring is a thirteenth candidate-hiding site.

The ancient fig has its own fluted trunk, thick buttresses, branch scaffold and grounded canopy assembly. It is not a uniformly enlarged ordinary tree. The storm log and bowed, stripped bridge have different geometry. Hollows use open shells; the cave uses actual interior geometry. Moss gates and the alcove have separate footprints and walkable passages.

`HIDING_CANDIDATES` contains **39 stable future candidates**, three at each of thirteen sites. Each records position, grounded interaction position, category, landmark ID, collision clearance/range, visibility/approach information and idol/clue eligibility. It is separate from spawning, finding, ownership and save-state logic. No idol or obvious search marker is placed. See the full [registry table](HIDING_REGISTRY.md).

## Gameplay and connected-world integration

The five existing semantic activity places are preserved. Water positions move with the spring; jungle activity positions now include inland forest, southern roof, fern clearing and secluded alcove. NPC intention duration still begins at arrival, allowing the longer journey to finish before the work/social dwell period.

The navigation graph uses a spatial collider index, a cached metre-scale boundary distance field, bounded nearest-node lookups, a reusable static graph and heap-based A*. Edges validate the player's axis-split substeps. Dynamic avoidance can retreat out of a newly overlapping NPC exclusion ring, instead of making a close actor invalidate the route start.

All existing location IDs, tribe identity, travel authorization, persistent provider/NPC state, scene cleanup and return instance remain. The local coordinate transform now keeps west-facing water and southern cliffs aligned with the peninsula's axes, while preserving the **exact existing camp departure ↔ Railay arrival point**. Metadata anchors do not become a claim that this local environment is a literal peninsula cutout.

The map samples real terrain/coastline and draws the same `TRAILS` used by navigation, vegetation clearance and ground wear. It shows camp, shelter, spring, limestone, fern bowl, departure and player heading. Expanding it clears inputs and locks movement; closing it restores exploration. Mobile joystick/camera/Run ownership remains unchanged.

## Validation

See the committed raw reports and gallery for exact observations and repeat commands. The unit suite validates every authored trail centreline with the actual movement solver; all activity and hiding approaches; NPC collection/return; and actual cliff-triangle raycasts through both cave edges at both quality levels. Browser routes use real Player input and collision rather than teleporting between destinations. Screenshot staging is distinguished from continuous route evidence, and the overhead diagnostic is explicitly labeled.

Rendering and load observations are from desktop Chromium/ANGLE SwiftShader at 932 × 430, DPR 1. **Physical iPhone Safari is not certified.** Full-quality art is still stylized and parametric: cave sections, boulder profiles, root textures and foliage repetition can benefit from a future dedicated art pass. The ocean remains the existing inexpensive water; Ultra-Water is not integrated.

## Repeat locally

From `artifacts/survivor-camp-prototype`, with dependencies installed:

```sh
node --import tsx --test tests/*.test.mjs
node --import tsx scripts/expansion-metrics.mjs
CAMP_CHROMIUM=/path/to/chromium node scripts/expansion-qa.mjs
WORLD_EVIDENCE=../../docs/tonsai-expansion/evidence/connected-world CAMP_CHROMIUM=/path/to/chromium node scripts/connected-world-qa.mjs
SPRINT_EVIDENCE=../../docs/tonsai-expansion/evidence/mobile CAMP_CHROMIUM=/path/to/chromium node scripts/mobile-sprint-qa.mjs
PORT=5194 BASE_PATH=/ npx vite build --config vite.config.ts
```

`PROFILE_ONLY=1 VISUAL_ONLY=1` isolates the matching-camera profile. `VISUAL_ONLY=1` captures profiles/gallery without repeating the expedition. `EXPEDITION_ONLY=1` runs the continuous route portion with fewer staged captures. Every mode uses the running WebGL game. No deployment is part of these commands.

The existing flagship CI workflow now also runs `qa:expansion` and uploads its evidence, with read-only repository permissions. Its older anchor probe derives water and activity destinations from `SPOTS`, so it cannot silently validate the retired coastal well.
