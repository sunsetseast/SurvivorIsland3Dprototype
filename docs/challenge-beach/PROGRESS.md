# Challenge Beach — recovery checkpoint

- PR: https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/23 — **DRAFT, unmerged**.
- Branch: `feat/railay-challenge-beach`.
- Last ref-confirmed remote SHA before this documentation commit: `896be02086876a923db89eb69a253b222d42a2b8`.
- Final runtime source: `831e47400c06f120fa7d73791ba2eea4d8cfbe40`.
- Hash-verified evidence checkpoint: `acf092025f450f8be1447662b1e32491f6315be6` (16 actual WebGL JPEGs, raw browser report and provenance).
- Base main: `62bb25b579b0d1faef0b52fb7e5ca6dc5ce0d468`; PR22 was verified merged. No earlier Challenge Beach branch/PR existed.

A commit cannot contain its own SHA. The final handoff and PR description record the newest ref-confirmed documentation head.

## Completed checkpoints

- [x] 1. Secure branch and existing architecture.
- [x] 2. Fifteen verified challenge references and condensed four-zone blueprint.
- [x] 3. Independently loaded scene, shared Player/surface and scoped rehearsal round trip.
- [x] 4. Curved coast, limestone, water, tropical forest and arrival/staging.
- [x] 5. Inland clearings, trails, outcrops, roots, signs and waiting edges.
- [x] 6. Coastal Traverse two-lane obstacle model.
- [x] 7. Tidebound Relay anchored-platform model with unsupported water blocked.
- [x] 8. Canopy Passage rope/net model.
- [x] 9. Eight Stillwater Balance stations.
- [x] 10. One selected equipment subtree, validated preview, cleanup and existing-identity staging.
- [x] 11. Unit/build/world, real WebGL, navigation, travel, mobile and resource verification; broader camp retry status below.
- [x] 12. Durable screenshots, provenance, final report, reference/layout documents, measured budgets, limitations and next playable plan.

## Changed systems

`src/game/challenge/*`; focused App/location registry/travel/lifecycle/HUD integration; optional scene-owned material override in Contestant; targeted tests and read-only Challenge Beach CI. Existing Player, CampRuntime/provider, camp geometry/assets, tribe/contestant ownership and the reference repository were preserved.

## Verified results

134 unit tests, TypeScript, world checks and production build pass. Ten real WebGL groups pass: all four demos in Low/High, six Player route chains, actual three-touch input, three exact camp round trips, one detailed scene and stable selection/return resource/listener plateaus. Connected journeys, mobile controls and flagship camp CI pass at the final runtime SHA. See [CI_RESULTS.json](CI_RESULTS.json), [gallery](GALLERY.md), [performance](PERFORMANCE.md), [report](FINAL_REPORT.md) and [source comparison](evidence/camp-source-compare.json).

The full living-camp/heroes/Tribal/assets suite passed at ca2d278 with identical camp/Tribal source. Its 831e474 replay was cancelled during Chromium installation; only that job was retried and is currently running. All runtime code and evidence are already remotely saved.

## Recovery and immediate action

The local workspace became unavailable after runtime work was saved. A guarded branch-only GitHub job recovered the exact successful CI artifact; every repository image SHA matches the inspected image. Remove its temporary write workflow in this documentation checkpoint; retain the normal read-only QA workflow.

Next immediate action: finish checking only the targeted living-camp retry, refresh final CI/report status, ref-confirm the head and hand off. Do not repeat implementation, research, asset installs or broad audits. Then the next development work is the separate [Stillwater Balance playable slice](FIRST_PLAYABLE_CHALLENGE.md).

## Known limits

Equipment is modeled/collidable, without scoring, rewards, puzzle/stack interactions, climbing/crawling or swimming. Admission is local development rehearsal, not production season/event authority. Static staged contestants do not run challenge AI/crowd simulation. Physical iPhone/Safari acceptance remains untested. See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).

**Do not merge, deploy, publish, use Replit Agent/credits, modify production or the reference repository, rebuild Tonsai, or start a season engine.**
