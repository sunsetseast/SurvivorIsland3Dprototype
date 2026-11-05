# Condensed Railay Challenge Beach blueprint

Original authored local space: **1 unit = 1 metre**, +X inland/east, +Z south, water to the west. Associated with the existing `challengeWest` geographic anchor; not a full-scale Railay reconstruction. All dimensions are design estimates.

| Area | Approximate center X/Z | Reserved footprint | Function |
| --- | --- | --- | --- |
| Arrival grove | 20 / -58 | 20 × 18 m | Player arrival, host, ten reserved staging positions and return sign |
| A Main Beach | -18 / -12 | 32 × 72 m | Two parallel tribe lanes; start, crawl, beam, cargo-net climb, puzzle finish; side circulation and host/spectator edge |
| B Ocean | -78 / -12 | 35 × 55 m | Beach assembly/viewing area and three anchored retrieval decks offshore; no walkable deep-water access before swimming |
| C Jungle | 61 / -23 | 32 × 40 m | Braced rope/net frames, low balance/crawl equipment, start and finish |
| D Individual | 49 / 61 | 34 × 26 m | Eight original balance/endurance/stack stations, host and spectator side |

The continuous authored ground extends approximately X -110…112 / Z -120…120. A curved shoreline and shallow seabed meet the same ocean plane. Northern/southern karsts enclose the strand; inland limestone and foliage frame the two clearings. Cliffs are separate sculpted lobes with foot clearance, not one smooth enclosing wall.

## Walking network

Arrival (20,-58) → beach access (10,-36) → main west bypass (-40,-12). Arrival → jungle trail (35,-43) → jungle west entrance (45,-23). Main east edge (8,20) → central fork (27,26) → individual entrance (34,51). Jungle south exit (60,3) → fork → individual. All paths target at least 3 m of unobstructed width; broader start/host circulation remains clear. These coordinates are a blueprint until tested with the shared movement adapter.

The ocean is viewed from dry beach on the same coastline. Wet sand is walkable only above the conservative movement waterline. Buoys and beach safety markers explain the boundary; there is no invisible wall across a promised walking path. Offshore decks have flotation, anchor lines and ladders but remain model-only. A new swimming controller is outside this PR.

## Configuration ownership

One stable environment; one selected equipment subtree. Each small typed configuration defines identifier, zone, equipment builder, start/staging/host/finish/view poses, collision shapes, asset dependencies and disposal behavior. No generic editor, physics simulation, scoring or season engine. Existing CampRuntime retains authoritative social/contestant state; staging positions do not create a second camp population.

## Verification gates

Before marking playable: validate body/camera spawns, test all route segments with actual movement, block unsupported water/cliffs and equipment bodies, preserve the exact originating camp instance, consume rehearsal grants once and exercise cancellation/retry. Scene resources must release before the next location mounts. Measure Low/High geometry, draws and resident resources in actual WebGL before claiming budgets. Physical iPhone performance requires device testing.
