# Definitive Tribal Council reconstruction

Reviewable draft implementation, based on main `f65d816e14b6c4f32a39ebd6fb788472a3e655b1` (merged PR #4). No merge, deployment or original-game changes are included. This report describes the fictional sanctuary in the existing application, not a separate demo or a claim of archaeological reconstruction accuracy.

## Start here

Start screen → **Explore Tribal Council** → watch the opening or **Skip intro** → seated view → **Stand up and explore**. RESET returns to the jungle approach. MENU retains the original island camp. Near the player's seat, **Return to your seat** reverses exploration. Near the voting table, **Write a practice ballot** opens a touch-friendly form; folding it leaves a physical parchment on the table. That rehearsal has no season outcome. The jury gallery and rear ruins have contextual inspection actions. Sound remains opt-in.

## Audit of the merged baseline

PR #2 supplied the original sanctuary and browser certification. PRs #3–4 explicitly described their Thai art and torch changes as source-only, without fresh browser QA. The actual main branch retained the broad seating, old host coordinates, flanking host columns, tall split-ring backdrop, conical additions above the original voting roof, and approach overlays. [Before reconstruction](overhaul-evidence/before-overhaul.jpg) is a fresh WebGL capture of that main branch; it is not an old PR screenshot.

| Verified problem | Implemented correction |
| --- | --- |
| Jeff approximately 14m from the fire; contestants behind a wide vacant floor | Host actor is approximately 7.7m from the fire; seating depth is approximately 6–7m. The twelve-slot width decreases from 18.15m to 14.85m. Five attendees occupy consecutive central slots. |
| Two decorative host pillars and independent hard-coded prop coordinates | Both pillars are removed. `COUNCIL` supplies actor, podium, urn, snuff station, furniture collision and light coordinates. Jeff's feet sit on the ground behind the tabletop. |
| Towers obscured by the high ring backdrop and trees | Ring backdrop and overhanging giant roots removed. Low ruined cloister, 23m dominant prang, two supporting prangs and distinct 17m bell-shaped chedi form the skyline. Trees are excluded from the skyline envelope. |
| Generic cylinder/cone chedis, simplistic elephants | Recessed cruciform prang loft, tiered ribs, false-door surrounds, surviving stucco, chipped courses, bell-shaped lathe profile, square harmika, annulated spire. Guardians have scalloped ears, tapered curling trunks, tusks, toes and carved folds and face Council. |
| Voting canopy placed over the old roof | Old timber canopy and conical roof stack removed. A coherent post-and-beam pavilion now supports two curved pitched roof stages with flared eaves, ridge and bargeboard terminals. Original privacy walls are integrated into one chamber with a carved doorway and reachable writing surface. |
| Naga/stair/bridge overlays ignored by grounding | Shared approach profile supplies twelve 10cm risers, landings, a level bridge, actual drainage depression, parapets and movement/camera envelopes. A landing branch preserves the jury's existing location. |
| Personal torches not visually certified | All twelve physical stations retained, with flames only for the attending group. The row moves behind the deepest seats to avoid blocking the seated camera. |
| Animation and interaction gaps | Ceremony time continues after seating for breathing/idle motion. Player stands smoothly into exploration. Returning to the seat is reversible. Modal inspection locks joystick/keyboard movement; practice ballots remain local to the sanctuary session. |
| Rendering cost from detail and repeated transitions | Architectural buffers merge into three broad zones; foliage retains spatial batches. Flame geometry shares one shader. Major geometry uses low-poly camera proxies. Player mesh/material resources dispose on unmount. |

## Architectural reference and interpretation

Consulted primary sources:

- [UNESCO: Historic City of Ayutthaya](https://whc.unesco.org/en/list/576/) — monumental prang silhouettes and surviving brick/stucco ruin character.
- [Ayutthaya provincial tourism: Wat Chaiwatthanaram](https://go.ayutthaya.go.th/tourist-attraction/wat-chai-watthanaram-chai-watthanaram-temple/) — hierarchy of a principal tower and supporting structures.
- [UNESCO architectural field report](https://www.unesco.org/en/articles/unesco-field-report-demystifying-ancient-ayutthaya) — distinction between prangs, square buildings, galleries and bell-shaped stupas; layered construction and conservation history.
- [Sirindhorn Anthropology Centre: Wat Chaiwatthanaram](https://seaarts.sac.or.th/artwork/34?lang=en) — recessed profiles, brick chapels, layered foundations and architectural relationships.

The visible structures are original procedural mesh designs. They do not reproduce a functioning sacred site, transplant sacred figures into gameplay props, or reuse reference photography as textures. Thai-inspired pavilion roofs are distinguished from the prang and chedi forms. The ancient masonry plus usable timber pavilion are a fictional Survivor production setting, with deliberate stylization rather than photorealism.

The reference repository was read only: `src/modules/screens/TribalSceneLayout.js` informed seat identity and future roster support. No original game files, assets, voting logic or season state were changed or migrated.

## Verification and evidence

The evidence directory contains newly rendered WebGL screenshots, a machine-readable browser report, the full browser run log, automated test/build logs, source hashes and the camp regression report. Cinematic shots use named cameras in the real production scene; the introductory overlay is hidden only for unobstructed photographs. Third-person and viewport captures retain the actual HUD. Five staged attendees are present in seated cinematic views. Accelerated game frames are used for deterministic traversal; GPU draws and readback are real.

- TypeScript: pass. Production Vite build: pass, with the existing large-main-chunk warning.
- **23 automated tests**: pass. Coverage includes original source snapshots, 256 camp routes, autonomous NPC behavior, conversations/approaches, grounding, all twelve stump exits, continuous arrivals, compact staging, face separation, finite authored geometry, bridge/stair profile, practice ballot validation and reversible ceremony state.
- Legacy world check: pass, including 120 solid collision checks and six island topology assertions.
- Browser: actual Player controller traverses arrival, voting, jury and exit routes in both directions; grounding and camera safety checked. Natural intro, skip, seated handoff, stand/reseat, ballot writing and folded mesh, modal movement lock, mobile joystick, touch release, camera orbit/look-up, audio and menu/reentry are exercised.
- Camp regression: actual WebGL conversations, response/leave choices, approaches, travel, landmarks, portraits, mobile controls and software-render measurements; no page errors. Its report is retained as `camp-regression.json` with a landscape screenshot.
- Screenshots include eye-level contestant → host, host → attendees, wide establishing view, side fire angle, seated player, entrance/naga bridge, guardian, voting exterior/interior, jury, animated fire, skyline, intro stages and 375×812, 430×932, 844×390, 1280×800 viewports.

[Wide council](overhaul-evidence/03-full-council.jpg) · [Host's view](overhaul-evidence/composition-hostEye.jpg) · [Seated player](overhaul-evidence/intro-06-player-seated.jpg) · [Entrance](overhaul-evidence/composition-entrance.jpg) · [Voting pavilion](overhaul-evidence/07-voting-exterior.jpg) · [Voting interior](overhaul-evidence/08-voting-interior.jpg) · [Elephant guardian](overhaul-evidence/elephant-guardian.jpg) · [iPhone landscape emulation](overhaul-evidence/11-iphone-landscape.jpg)

Final browser run: **62 check records, 26 captures, 0 page/console errors**. [Raw report](overhaul-evidence/browser-certification.json) · [Complete run log](overhaul-evidence/browser-run.txt)

## Performance and limits

One 1024² directional shadow map updates at approximately 6Hz. Local point lights cast no shadows. Procedural surface textures are 512px, geometry is static and merged, particles are bounded, and DPR retains its existing 1.5 cap. `browser-certification.json` records actual draw calls, submitted triangles, texture/geometry counts and eight synchronous draw/readback samples per viewport.

| Viewport | Median draw + readback | Draw calls | Submitted triangles |
| --- | --- | --- | --- |
| 375 × 812 | 469.6ms | 122 | 267,564 |
| 430 × 932 | 586.9ms | 122 | 267,564 |
| 844 × 390 | 728.3ms | 191 | 359,332 |
| 1280 × 800 | 1165.6ms | 179 | 352,018 |

Measurements are Chromium ANGLE/Vulkan **SwiftShader software rendering**, DPR 1, not physical iPhone Safari FPS. They include shadow passes and deliberately synchronous GPU readback. Their timing cannot establish sustained mobile frame rate, thermal behavior, battery use, native touch feel, safe-area correctness or Safari GPU compatibility. Physical iPhone testing remains necessary. Portrait emulation verifies that controls remain usable; landscape is the intended play view.

This PR rebuilds the environment and ceremony presentation. It does not add season-engine integration, binding eliminations, live juror decisions, voiced Jeff dialogue, photoreal human assets or a new full-season simulator. Existing stylized cast art is retained; procedural pose/stand animation is improved. Twelve positions and juror anchors support a later real roster adapter.

## Reproduce

From the repository root, with Node 24 and the checked-in pnpm lockfile:

```sh
pnpm install --frozen-lockfile --ignore-scripts --config.strict-dep-builds=false
pnpm exec tsc -b lib/api-client-react
pnpm --filter @workspace/survivor-camp-prototype typecheck
pnpm --filter @workspace/survivor-camp-prototype test
node artifacts/survivor-camp-prototype/scripts/world-check.mjs
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/survivor-camp-prototype build
pnpm --filter @workspace/survivor-camp-prototype exec playwright install --with-deps chromium
pnpm --filter @workspace/survivor-camp-prototype qa:tribal
pnpm --filter @workspace/survivor-camp-prototype qa:living-camp
```

The Tribal harness disables file watching and hot reload so report/screenshot generation cannot reset the frozen browser session. `CAMP_CHROMIUM` can select a locally installed Chromium binary. CI runs the existing build, tests, both browser suites and standalone preview packaging, uploading the evidence without deploying.
