# Survivor authenticity pass — implementation and verification

## Implemented in this branch
- Twelve individual torch stations behind the existing alternating contestant seats. Each station has a physical post, metal basket, and a flame source that participates in the existing animated flame renderer.
- Dedicated low stone snuffing receiver beside the host area, visually separating the elimination ritual from the voting urn.
- Three low braziers along the secluded voting route, supplementing the existing path torches.
- Host actor position now derives from the canonical Tribal Council host anchor instead of an unrelated literal.

## What is NOT implemented
- These torch props are static set dressing; contestants do not yet carry or place torches.
- No vote-writing interaction, vote reveal, spoken host dialogue, snuff animation, jury reactions, or integration with the original season engine.
- The existing geometry, layout, pathfinding and current Thai architectural pass are retained, not fully rebuilt.
- No new screenshots, WebGL playthrough, automated test run, or physical iPhone Safari verification was possible from the GitHub editing connector.

## Required review before merging
1. Build and typecheck the app; run `pnpm --filter @workspace/survivor-camp-prototype test`.
2. Run `pnpm --filter @workspace/survivor-camp-prototype qa:tribal` with a working Chromium/WebGL environment.
3. Inspect torch placement against all twelve staggered stumps, and verify none obscure faces or sightlines.
4. Verify the host stands behind—not inside—the dais and can be seen from the contestant cameras.
5. Walk the full voting route and elimination exit on iPhone Safari, especially near the new braziers and receiver.
6. Measure additional flame geometry cost and thermal stability on device.

## Follow-up priorities
- Merge the actual 2D season engine's Tribal ceremony events through a presentation adapter, without duplicating voting rules.
- Replace generic contestant pose changes with eyeline reactions, voting procession, ballot writing, torch snuff and exit choreography.
- Rework the voting pagoda interior as an integrated room and fix decorative step elevation/collision.
- Refine historical Thai relief detail, silhouette depth, visibility of the jury, and physically believable lighting.
