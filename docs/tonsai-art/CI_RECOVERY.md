# CI follow-up after recovery

The complete recovered implementation and 115 evidence/report files were first secured on GitHub at `f3a28e886f26e4908bf30b88a17bc837f0e34954`. Follow-up changes affect verification scripts and a workflow only; no runtime art, gameplay or input behavior is changed.

- The first environment-art job ran before the incremental evidence commit and could not open the baseline report. The baseline is now committed. Its log also showed identical low/high submissions on the two-core runner: the app's automatic low setting overrode the high URL request. The capture fixture now declares eight logical cores to ensure the existing low/high requests select their intended profiles on every runner.
- Living-camp CI invoked the TypeScript-importing world check with plain Node. It failed to resolve the extensionless `environment/profile` import. The workflow now invokes the already-installed `tsx` loader from the application workspace. The exact corrected command passes locally: six world-check groups and 294 solid-collision sweeps.
- The first mobile run sampled camera yaw before a coalesced trusted pointermove reached the page. The failure snapshot subsequently contained the expected yaw, active look and trusted orbit event; an unchanged subsequent run passed Chromium and WebKit. The harness now records pointer coordinates and waits for the newly delivered trusted pointermove before the active orbit measurement. An initial broad synchronization attempt passed all Chromium groups but timed out in WebKit's intentionally stale post-modal gesture test, where no pointermove is required. The wait is scoped to the active orbit measurement; stale-contact assertions and real touch input remain intact.

Script syntax checks pass. Fresh workspace-wide TypeScript checks, 112 unit tests, the production build, the 28-pair saved comparison and all four GLB integrity hashes passed during recovery. GitHub-hosted results for the follow-up commit are recorded in the PR; these local checks do not imply physical iPhone certification.

The original interrupted implementation remains preserved on local backup branch `recovery/original-interrupted-implementation`, and the working branch's recovered history was synchronized to GitHub with verified Git object hashes. Temporary transfer files remain in the pre-edit recovery archive and are excluded from the PR.

## Final completion pass: paired capture correction

Confirmed PR #22 open/draft at `ab5bb14d91cb35c3a09e6086aa50a7cd17721baa`; no unsaved tracked implementation remained. Preserved six interrupted transfer fragments in a separate local recovery archive before edits.

Run 41922556999/job 126898490542 captured successfully but compared Chromium 156 against a stored Chromium 153 report. High shelter-ground changed 183 → 196 calls (+13); low changed 175 → 162 (-13). Other native poses changed by at most one call. The startup-dependent live NPC simulation can move a thirteen-part character across this pose's frustum. This is not evidence of thirteen new environment draws.

The art-only Vite fixture now freezes the camp runtime before its first step (normal gameplay remains untouched). CI captures PR #21/base `7b93d54` and the current branch with the identical harness, browser, renderer settings and initial NPC staging. Comparison rejects mismatched capture contracts, browser/settings/staging and retains the original +2 native draw / +5% triangle / unchanged spawn and resident storage assertions. Historical images remain historical; current CI artifacts contain the new paired evidence. Targeted cliff tests, comparison regression tests and script syntax checks passed before this checkpoint. CI WebGL confirmation is tracked separately.
