# Real in-game evidence

All JPGs are Chromium WebGL captures of the actual game. Comparisons arrange those screenshots without generating replacement imagery. `before/` was captured from unchanged main `e97283f`, with the same per-actor camera offsets as this PR.

| Required view | Capture |
|---|---|
| Sandra | [hero-11.jpg](hero-11.jpg) |
| Parvati | [hero-13.jpg](hero-13.jpg) |
| Russell | [hero-18.jpg](hero-18.jpg) |
| Boston Rob | [hero-4.jpg](hero-4.jpg) |
| Jeff Probst | [hero-jeff.jpg](hero-jeff.jpg) |
| Hero contestants seated, host at his mark | [heroes-with-host.jpg](heroes-with-host.jpg) |
| Active Council and stools | [council.jpg](council.jpg) |
| Arrival/procession | [arrival-procession.jpg](arrival-procession.jpg) |
| Host-facing contestants | [host-facing-contestants.jpg](host-facing-contestants.jpg) |
| Side firelight | [side-firelight.jpg](side-firelight.jpg) |
| Voting departure, player walking away from Council | [voting-departure.jpg](voting-departure.jpg) |
| Character before/after | [heroes-before-after.jpg](heroes-before-after.jpg) |
| Five-attendee furniture before/after | [stools-before-after.jpg](stools-before-after.jpg) |
| Exactly 4 / 5 / 8 / 12 stools | [4](stools-4.jpg) · [5](stools-5.jpg) · [8](stools-8.jpg) · [12](stools-12.jpg) |
| Mobile landscape, 5 / 12 stools | [5](mobile-landscape-5.jpg) · [12](mobile-landscape-12.jpg) |
| Snuff and last walk | [snuff](flow/16-torch-snuff-rehearsal.jpg) · [exit](flow/17-side-exit-procession.jpg) |
| Actual camp gameplay | [camp evidence](camp/) |

Jeff remains the host, standing behind the podium. The local player is the fifth seated attendee. Screenshots for 8 and 12 attendees exercise generic appearance fallbacks beyond the four authored contestants.

## Reproduce

From `artifacts/survivor-camp-prototype`, after the repository's normal dependency installation:

```sh
pnpm test
pnpm typecheck
PORT=5174 BASE_PATH=/ pnpm build
pnpm exec playwright install chromium
pnpm qa:heroes
TRIBAL_EVIDENCE=../../docs/characters/evidence/flow pnpm qa:tribal
CAMP_EVIDENCE=../../docs/characters/evidence/camp pnpm qa:living-camp
node --import tsx scripts/hero-budgets.mjs
```

`CAMP_CHROMIUM` optionally selects an installed WebGL-capable executable. This environment used Chromium headless shell, Playwright's SwiftShader flags and accelerated fixed simulation steps. To capture main, check out `e97283f` in a separate worktree, copy only `hero-review.mjs` there, and run with `HERO_BASELINE=1 HERO_EVIDENCE=<absolute output>/before`; that mode omits the new attendance APIs. Before/after geometry budgets use the same `hero-budgets.mjs` executed **inside each checkout**.

The CI workflow runs the new `qa:heroes` check and retains this evidence directory as a workflow artifact. Local success does not imply a hosted CI result or physical iPhone certification.
