# Challenge Beach — recovery checkpoint

- PR: https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/23 — **DRAFT, unmerged**.
- Branch: `feat/railay-challenge-beach`.
- Last ref-confirmed remote SHA before the follow-up cleanup commit: `af64d9980664ed1a7bf5bfc0326f73e89f11aad0`.
- Original completed runtime source: `831e47400c06f120fa7d73791ba2eea4d8cfbe40`; follow-up runtime verification is recorded below.
- Hash-verified evidence checkpoint: `acf092025f450f8be1447662b1e32491f6315be6` (16 actual WebGL JPEGs, raw browser report and provenance).
- Base main: `62bb25b579b0d1faef0b52fb7e5ca6dc5ce0d468`; PR22 was verified merged. No earlier Challenge Beach branch/PR existed.

A commit cannot contain its own SHA. The final handoff and PR description record the newest ref-confirmed documentation head.

## Follow-up checkpoint — bounded resource ownership

A focused continuation review found that SceneLifecycle retained disposed, detached equipment in its ownership Map until scene departure. GPU counts plateaued, but those strong references could retain old CPU geometry arrays during a long preview session.

The collector now removes tracking listeners/references only after an asset is both disposed and absent from the live scene. Live/re-uploaded assets and assets awaiting asynchronous disposal remain eligible for the final scene sweep. Four new behavioral tests cover geometry/material/texture removal, live reuse, asynchronous disposal and 64 replacements. WebGL QA now also asserts that the ownership Map plateaus for equivalent selected setups.

Local verification: **138/138 unit tests**, TypeScript and production build pass; existing bundle/import warnings only. No dependency or lockfile changes. Local Chromium installation failed because the downloaded archive was truncated; the browser assertion will run in the existing read-only GitHub QA workflow. GitHub confirms runtime `7803dc698f9f531cb0d90f9d684407e6c8c277be`. Its ten WebGL groups, connected journeys and Chromium/WebKit controls pass; broader camp jobs are still running. All three equivalent preview cycles retain 114 ownership entries / 80 GPU geometries / 11 textures / 33 listeners. Keep the PR draft.

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
- [x] 11. Unit/build/world, real WebGL, navigation, travel, mobile and resource verification; exact CI results below.
- [x] 12. Durable screenshots, provenance, final report, reference/layout documents, measured budgets, limitations and next playable plan.

## Changed systems

`src/game/challenge/*`; focused App/location registry/travel/lifecycle/HUD integration; optional scene-owned material override in Contestant; targeted tests and read-only Challenge Beach CI. Existing Player, CampRuntime/provider, camp geometry/assets, tribe/contestant ownership and the reference repository were preserved.

## Verified results

134 unit tests, TypeScript, world checks and production build pass. Ten real WebGL groups pass: all four demos in Low/High, six Player route chains, actual three-touch input, three exact camp round trips, one detailed scene and stable selection/return resource/listener plateaus. Connected journeys, mobile controls and flagship camp CI pass at the final runtime SHA. See [CI_RESULTS.json](CI_RESULTS.json), [gallery](GALLERY.md), [performance](PERFORMANCE.md), [report](FINAL_REPORT.md) and [source comparison](evidence/camp-source-compare.json).

All five workflows pass at verification commit `a7491c4c2f45e3fef79f594d2c1da46caf8dd119`: Challenge Beach WebGL, connected journeys, Chromium/WebKit mobile controls, flagship camp, and full living-camp/heroes/Tribal/assets/standalone build. Runtime and harness source are byte-identical to the final runtime commit; only the temporary evidence-saving workflow differed, and it is now removed. An initial duplicate mobile run hit its existing eight-second Run-control wait after a scene change; targeted retry passed without changing gameplay or assertions. See CI_RESULTS.json and evidence/verification-source-compare.json.

## Recovery and immediate action

The local workspace became unavailable after runtime work was saved. A guarded branch-only GitHub job recovered the exact successful CI artifact; every repository image SHA matches the inspected image. Its temporary write workflow has been removed; the normal read-only QA workflow remains.

Next immediate action: verify the cleanup commit's remote SHA, run the existing CI checks, and record the new ownership plateau. Then hand off for physical iPhone/Safari acceptance. Do not repeat completed research or broad audits. The next feature work remains the separate Stillwater Balance playable slice.

## Known limits

Equipment is modeled/collidable, without scoring, rewards, puzzle/stack interactions, climbing/crawling or swimming. Admission is local development rehearsal, not production season/event authority. Static staged contestants do not run challenge AI/crowd simulation. Physical iPhone/Safari acceptance remains untested. See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).

**Do not merge, deploy, publish, use Replit Agent/credits, modify production or the reference repository, rebuild Tonsai, or start a season engine.**
