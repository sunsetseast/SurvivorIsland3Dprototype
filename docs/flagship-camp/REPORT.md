# Tonsai tribe camp reconstruction

This PR reconstructs the **playable compact Camp**, preserving PR #14's independently loaded Camp ↔ Railay journey and persistent camp simulation. It replaces the Camp's original primitive flora/rocks and flat baked ground with a selected scan-based kit, authored coconut palms, continuous scanned ground materials and an asymmetric coastal composition.

[Actual render-path audit](AUDIT.md) · [Asset provenance and pipeline](ASSETS.md) · [Measured performance](PERFORMANCE.md) · [WebGL gallery](GALLERY.md)

## Visual transformation

The baseline had faceted crown clusters, angular stones, green painted ground, little convincing rock enclosure, and no visible Camp-specific quality difference. The new composition gives the camp a north headland, eastern buttresses, distant western rock silhouettes and layered coastal forest. Rock placements use uniform scaling and photographed relief; no procedural cliff noise was added. Backdrop tree roots remain outside the walkable boundary while their crowns visually extend the jungle.

The ground is one terrain skin with smoothly varying sand, wet sand, foot-worn clearing and forest-litter weights. Photographic albedo and normal maps supply small-scale detail. Its shoreline and height field remain aligned with the existing movement model. Ferns, low coastal shrubs, rubble, existing driftwood, cooking props and roots break up the ground at normal camera distance.

Lighting shifts from the original orange wash toward warm tropical daylight, blue sky fill, restrained ground bounce and pale atmospheric depth. Low/high share the same art identity; high extends nearby foliage detail and uses 2048² rather than 1024² sun shadows. Water retains inexpensive ripple/foam animation with a revised coastal palette. It is still an approximation, not an ocean simulation.

### Iteration and limits

The first scan pass was rejected after real gameplay review: the open rock-face scan read as slabs, reduced canopy looked bare, and model origins did not line up with collision. [Two rejected frames](GALLERY.md#rejected-first-pass) are retained. The final pass uses a solid boulder scan, complete-leaf cards, corrected root origins, a wider tree collision footprint, horizontal buried talus and much lower submissions/texture memory than the rejected pass.

The result is a substantial, cohesive improvement in the real Camp, but **this is not certified as photorealistic or AAA quality**. Remaining limits include repeated underlying rock/tree forms, visible cutout/LOD simplification, enlarged boulder relief rather than a bespoke monolithic Thai cliff sculpt, simple camp props/characters and approximate water. Some scan root skirts and material repetition remain inspectable. The historical iPhone diagonal's root cause remains unconfirmed; [the audit](AUDIT.md#black-line-investigation) explains the evidence boundary.

## Gameplay and architecture

- Fire, seating, cooking props, shelter deck/ramp, sleeping space, beach, well and jungle activity anchors retain their existing coordinates and functions. Camp navigation is rebuilt against the updated physical tree footprint.
- Three tested private spaces are defined in `environment/composition.ts`: quiet beach, jungle edge and water path. The existing conversation system can use these reachable areas; no parallel social simulation was introduced.
- The environment supports the existing beach work, jungle and shelter activities. This PR does **not** invent new inventory, idol ownership or fishing-resolution mechanics that were absent from the prototype. Their surrounding spaces remain usable for later gameplay integration.
- Main rock masses and added backdrop roots are outside Camp's player bounds. Small rocks retain conservative existing collision; source trunks and hero masses participate in the camera boom's occlusion checks.
- The location registry, travel manager, authorization contract, season/instance identity, return spawn, persistent NPC/provider/social-memory owners and Tribal Council adapter remain in place. Camps B/C remain metadata-only.

## Loading, ownership and optimization

The reusable `environment/assets.ts` loader gives each mounted location its own parsed geometry/materials/maps. HTTP caching reuses transferred bytes. Timeout/error paths settle to playable degraded art; late callbacks are disposed after timeout/unmount and cannot attach assets to another location. `SceneLifecycle` waits for full or degraded Camp readiness and still releases source-owned resources before destination mounting. The existing Tribal temple fallback also releases the readiness gate after a failed asset request, verified by its loading/reentry regression.

Foliage uses instancing, periodic distance/frustum compaction, distinct mesh LODs and alpha testing with depth writes. Large ground-zone overlays, transparent foliage sorting, postprocessing and full-world shadow techniques are avoided. Map sizes were reduced after measuring an approximately 100 MB scene texture estimate in an earlier pass. Final measurements and the remaining loading/memory costs are recorded separately; no physical phone FPS is inferred from software WebGL.

## Verification

The repository contains automated geometry/provenance/navigation checks, a new real-WebGL visual/failure harness, the existing connected-world regression and the existing multitouch suite. Exact results, measurements and retained limitations are in [PERFORMANCE.md](PERFORMANCE.md). Captures include the weakest exposed ground, close rock view, canopy, water, departure trail, running and degraded fallback, as well as the main camp/fire/shelter views.

The new read-only GitHub Actions workflow runs typecheck, tests, production build and the visual/failure harness, then uploads its screenshots. Existing journey/mobile workflows remain applicable. Local results are distinguished from any later CI run; no unobserved CI success is claimed.

## Reuse for future camps

The loader/ownership rules, complete-leaf production step, web packing, terrain material blending and instanced LOD batching are reusable. Camp-specific massing, backdrop placement, private spaces and retained gameplay anchors are separate from the asset kit. A future camp can supply different coastline/material weights, species mix, silhouettes and composition without duplicating this implementation or cloning Tonsai's layout. No second or third camp environment is built here.

**Draft delivery only. Do not merge, deploy or publish.** Physical iPhone Safari performance and the historical device-only seam remain uncertified.
