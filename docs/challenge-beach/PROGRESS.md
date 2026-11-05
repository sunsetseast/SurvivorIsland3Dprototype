# Challenge Beach — recovery checkpoint

- PR: https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/23 — **DRAFT, unmerged**.
- Branch: `feat/railay-challenge-beach`.
- Last ref-confirmed remote SHA before this documentation commit: `8ff1b646913e4621915c7e8d029741cdad6035a9`.
- Final cleanup runtime: `7803dc698f9f531cb0d90f9d684407e6c8c277be`. Subsequent changes contain documentation/evidence only.
- Original gallery runtime: `831e47400c06f120fa7d73791ba2eea4d8cfbe40`; hash-verified image checkpoint `acf092025f450f8be1447662b1e32491f6315be6`.
- Base main: `62bb25b579b0d1faef0b52fb7e5ca6dc5ce0d468`. PR22 was merged; no earlier Challenge Beach branch/PR existed.

A commit cannot embed its own SHA. The PR description and final handoff carry the newest ref-confirmed documentation head.

## Completed checkpoints

All **1–12** are complete and remotely saved: branch/architecture; 15-reference research and layout; independent scene/rehearsal travel; coast/staging; inland zones/trails; main obstacle course; ocean relay model; jungle rope/net course; individual stations; modular preview/cleanup; integration regression; durable WebGL evidence, performance and final documentation.

## Completed continuation — bounded resource ownership

The focused review found that GPU-disposed, detached equipment remained strongly referenced by SceneLifecycle's ownership Map until departure. The collector now removes its listener/reference only after both disposal and detachment. Live/re-uploaded resources and pending asynchronous disposals remain eligible for the final sweep.

Four behavioral tests cover released geometry/material/texture listeners, live re-use, delayed disposal and 64 replacements. Real WebGL QA additionally checks the ownership Map after at least one collector interval. Three equivalent preview cycles each retain **114 ownership entries / 80 GPU geometries / 11 textures / 33 listeners**. Three camp returns retain **322 / 151 / 26 / 48**. Counts are not heap-byte or physical-device measurements.

## Verified results

**138/138 unit tests**, TypeScript, world checks, production build and **10/10 real WebGL groups** pass. All five workflows pass at the final cleanup runtime: Challenge Beach; connected journeys; Chromium/WebKit controls; flagship camp/expansion/refinement; full living-camp/heroes/Tribal/assets/standalone build. Exact IDs/results: [CI_RESULTS.json](CI_RESULTS.json).

The browser run traverses six route chains through the existing Player, exercises actual three-touch input, renders all configurations in Low/High, preserves camp/NPC/provider/tribe state, returns to the exact origin three times, checks ownership/GPU/listener plateaus, and reports no page/shader errors or failed assets. Fixed Low/High view measurements match the original table. Camp samples now wait 12 frames instead of three, so their different camera/settling measurements are not a matched before/after rendering comparison.

[Cleanup report](evidence/cleanup-browser-report.json) · [Artifact/report hashes](evidence/cleanup-provenance.json) · [Performance](PERFORMANCE.md) · [16-image original gallery](GALLERY.md) · [Final report](FINAL_REPORT.md) · [References](REFERENCE_LIBRARY.md).

## Changed systems and recovery

Implementation lives under `artifacts/survivor-camp-prototype/src/game/challenge/*`, with focused App/location/travel/lifecycle/HUD integration and scene-owned contestant materials. The continuation adds `locations/releasedResources.ts`, four ownership tests, the lifecycle collector fix and the QA plateau assertion. Existing Player, CampRuntime/provider, camp geometry/assets and state ownership are preserved. No dependency/lockfile change.

An earlier unavailable workspace lost no runtime work: a guarded job recovered the original CI images and was removed. During this continuation normal push authentication failed, so the authenticated GitHub API saved the exact tested local tree; its remote ref was confirmed. The local browser archive download failed, so browser verification ran successfully in read-only CI. No new write workflow was introduced.

## Next immediate action and limits

Hand off the draft for review and [physical iPhone/Safari acceptance](DEVICE_REVIEW.md). No implementation or CI task remains unfinished. Do not repeat completed research, installs or audits. The next feature work is the separate [Stillwater Balance playable slice](FIRST_PLAYABLE_CHALLENGE.md).

Courses are modeled/collidable demonstrations, without swimming, climbing/crawling, puzzle/stack interactions, scoring, rewards, elimination, challenge AI or production season/event authority. Staged contestants do not run a second simulation. Physical iPhone FPS/thermal/battery/Safari graphics acceptance remains untested.

**Do not merge, deploy, publish, use Replit Agent/credits, modify production/reference repository, rebuild Tonsai or start a season engine.**
