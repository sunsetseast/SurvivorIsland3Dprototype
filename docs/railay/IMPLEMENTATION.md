# Railay peninsula world

This draft adds a separate **Explore Island** entry on top of main `90bb37a`. Camp and Tribal Council keep their scenes, coordinates, simulation, assets, and menu entries. No Survivor structures, tourist buildings, docks, roads, railings or stairs were added to the new world. No changes were made to `SurvivorIsland2025`.

## Geographic foundation

The runtime coastline comes from joined OpenStreetMap coastline ways, not beach circles or the concept illustration. The source register, versions, license, download bounds, extraction script and metre conversion are in [data/railay](../../data/railay/README.md). The concept supplied in chat informed the tropical palette and limestone/forest emphasis only. Its invented offshore features were not copied.

The world uses one local coordinate system: 98.838° E / 8.011° N origin, X east, Z south, Y up, one metre per unit. The 3.6 km square gameplay extraction includes the complete four named coastal areas, southern rock formations, lagoon, interior and northern continuation. Only land near the coastline is meshed below water; a coarse far mainland context continues beyond the gameplay boundary. That distant backdrop is authored context, not certified topography.

The 6 m terrain lattice is baked offline into a lazy-loaded world asset. Elevation values are numerically quantized to 1 cm and shore distances to 10 cm; this **does not imply centimetre geographic accuracy**. Movement uses triangle interpolation from this same lattice. Terrain chunks are 300 m, with 6/12 m rendering LOD and skirts. Nearby collision always uses the 6 m terrain. Far rendering simplification can differ from the detailed lattice between samples.

No suitable high-resolution, openly usable cliff DEM was acquired. Coarse DEMs were not represented as reliable vertical wall or cave data. Southern and Thaiwand maximum-height parameters use nearby mapped OSM elevations of 95 m and 58 m (nodes 6121081661 / 6121083938). The 155/185/210 m inland massif parameters, ledges, erosion, closure edges and smaller rock heights are authored estimates. They need further photogrammetric/topographic refinement for stronger vertical fidelity. OSM cliff polylines inform footprints; only the southern long wall uses a full mapped outline directly. Other hero footprints combine mapped wall locations with authored inland closures.

| Required geographic relationship | Evidence / qualification |
| --- | --- |
| Tonsai northwest of Railay West | Projected destination coordinates and automated test |
| Curved Railay West bay | Original coastline vertices; overhead comparison |
| Railay East on eastern shore | Original east coast and contrasting mud/mangrove mask |
| Phra Nang at southern end | Original southern coast and mapped nearby islets |
| Coherent headlands and cliffs | Mapped promontories / cliff references, authored missing volume |
| Irregular shorelines | Over 600 joined coastal vertices; 6 m terrain rasterization |
| Mainland connection | Coastal way chain remains open north/east; artificial extraction closure is beyond gameplay |
| Plausible interior elevation | Mapped 58/95 m references and clearly identified authored massifs; no DEM fidelity claim |
| Lagoon / caves | Actual OSM lagoon outline and mapped cave vicinity; authored shelter interior |
| Rendered ground vs movement | Actual mesh vertex tests, triangle sampling, slope/water barriers, browser movement |

The lagoon is a small enclosed depression, not an inland lake. Its rim has independent inward-facing limestone walls. Its steep descent remains unavailable to ordinary walking; the Explore selector can start exploration on its rim. Future climbing is deliberately outside this PR.

## Environment architecture

All paths below are under `artifacts/survivor-camp-prototype/src/game/railay` unless indicated.

| System | Responsibility |
| --- | --- |
| `geography.json` / `geography.ts` | OSM-derived coast, lagoon, projection, authored karst footprints, natural-route plan, planning anchors |
| `terrain.ts` / `height-grid.json` | Offline height synthesis, shared height / slope sampling, substepped movement, water and cliff barriers |
| `Terrain.tsx` | Terrain chunks, LOD skirts, irregular cliff lofts, lower-cost camera envelopes, far mainland context |
| `vegetation.ts` | Seeded ecological placement, branching trunks / roots, palms, pandanus, mangroves, fern geometry |
| `Vegetation.tsx` | Spatial instancing, local understory, near/far canopy detail, wind, async leaf textures and generated texture fallback |
| `materials.ts` | World-space ground grain, mineral bands, fissures, staining and biome colour transitions |
| `Ocean.tsx` | Shared depth-field water, turquoise/deep blue transition, eastern sediment tint, lagoon tint, wet-edge foam and mild waves |
| `Geology.tsx` | Async Blender shelter/talus/stalactites, procedural fallback, late-load protection and disposal |
| `IslandScene.tsx` | Lighting, dedicated scene lifecycle, existing third-person player adapter, overview camera, debug measurements |
| `IslandHud.tsx` / `IslandMap.tsx` | Safe-area controls, region starts, live minimap / expanded map, overview, quality, reset and attribution |
| `tools/blender/railay.py` | Reproducible original geology kit and editable source scene |
| `tools/railay/foliage.py` | Original broadleaf / fern alpha-cutout art |

Full-size trees are excluded from steep faces, deep water and open beach; coastal palms and pandanus use shore/elevation masks; mangroves use the sheltered eastern tidal zone. Broadleaf forest has larger variation and exposed roots; fern understory is loaded only in nearby patches. These are plausible regional plant forms, not a species inventory or ecological survey. Natural routes are clearings through existing lowland corridors, not infrastructure cut through cliffs.

The public botanical references used were [Thai DNP Flora: Ficus](https://botany.dnp.go.th/eflora/floraGenus.html?factsheet=Ficus), [Royal plant conservation project: Pandanus](https://www.rspg.or.th/plants_data/plantdat/pandanac/ptecto_1.htm), and the [ONEP Krabi wetland register](https://chm-thai.onep.go.th/wp-content/uploads/2023/03/02%E0%B8%97%E0%B8%B0%E0%B9%80%E0%B8%9A%E0%B8%B5%E0%B8%A2%E0%B8%99%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%99%E0%B8%B2%E0%B8%A1%E0%B8%9E%E0%B8%B7%E0%B9%89%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%8A%E0%B8%B8%E0%B9%88%E0%B8%A1%E0%B8%99%E0%B9%89%E0%B8%B3Eng-3.pdf). Coastal context was checked against the Thai Ministry of Tourism's [Railay](https://www.thailandtourismdirectory.go.th/en/attraction/1805) and [Tonsai](https://www.thailandtourismdirectory.go.th/en/attraction/99177) entries. Reference pages are not embedded as textures.

The water uses a small RGBA depth/mud/lagoon texture derived from terrain. Shallow transparency reveals the seabed, with inexpensive procedural caustic shading. There are no reflection probes, FFT simulation, dynamic tide model, swimming, volumetric underwater rendering or wave physics. Water boundaries are safe walking limits.

## Traversal and future locations

The shared player keeps movement, orbit controls, camera boom obstruction checks and animation. Large visual karsts have lighter camera envelopes; terrain sampling handles hills along the entire camera boom. Walking is substepped to 35 cm to prevent tunnelling into slopes or water. Reset returns safely to Railay West. A live north-up minimap shows the same coastline, cliffs, four beaches, lagoon, player position and facing; tapping expands it with a 200 m scale bar. Overview retains the same player position; Explore provides region start points for convenient testing of the kilometre-scale landscape.

A breadth-first search over the 6 m lattice validates each connection through the actual movement solver, including substeps. [Reachability evidence](evidence/reachability.json) contains full routes. Tonsai, Railay East and Phra Nang are connected to Railay West. The lagoon rim is a separate steep region, intentionally identified as such. Vegetation is decorative; individual tree trunks do not yet have physical player colliders. Walking clamps at the far extraction bounds; the distant mainland context is not traversable. Future expansion should replace those bounds with region handoff.

Planning anchors provide possible Tonsai and southern camps, a 20 × 52 m natural Railay West equipment footprint, inland Council access and a journey location. They are data only and produce no normal-play markers or structures. This PR neither moves existing scenes into those locations nor implements persistent cross-scene game state.

## Mobile architecture and limits

World code/data is lazy-loaded only on entry. Geography calculations are baked, not rerun in the phone browser. Terrain and vegetation share fixed geographic coordinates across detail changes. Near foliage / understory and far crowns use regional instancing and frustum culling. Expensive detail is distance-selected; far mainland is coarse. Low quality reduces vegetation density, near-detail radius and terrain detail radius and caps DPR at 1. High quality caps DPR at 1.5. The world uses daylight without shadow maps; camp / Council shadow settings are preserved. Overview requests periodic renders rather than a continuous high-rate loop.

Late asset results are disposed if the scene has closed. Generated leaves and a procedural cave remain available during failed downloads. Geometry, materials, textures, timers, debug references and terrain caches are released on exit. This is a bounded foundation, not an asset-server streaming implementation: the baked height field and simple cliff silhouettes load together; high-cost foliage detail is selected spatially. Persistent region streaming can extend this architecture later.

The visual target is a cohesive stylized browser environment. It does not reproduce the reference image's photoreal detail. Limitations include 6 m shoreline/lagoon rasterization, authored cliff heights and recesses, simplified rock undercuts, no climate/tide simulation, and limited botanical species/ground debris diversity. Cliff surfaces and northern terrain should receive further art direction before calling this a final photoreal reconstruction.

## Verification

See [CERTIFICATION.md](CERTIFICATION.md), [WebGL measurements](evidence/webgl-report.json), automated test / typecheck / build logs, route evidence and the actual game screenshots in `evidence/`. Device viewport emulation is clearly distinguished from physical iPhone testing. No physical iPhone FPS, Safari memory budget or thermal endurance is certified here.

Reproduce from the application directory with installed workspace dependencies:

```sh
node --import tsx --test tests/*.test.mjs
node --import tsx scripts/railay-reachability.mjs
CAMP_CHROMIUM=/path/to/chromium node scripts/railay-qa.mjs
CAMP_CHROMIUM=/path/to/chromium node scripts/railay-loading-qa.mjs
PORT=5194 BASE_PATH=/ node node_modules/vite/bin/vite.js build --config vite.config.ts
```
