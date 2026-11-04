# Validation and recovery

## Final local checks

| Check | Result | Evidence |
| --- | --- | --- |
| Unit suite | 112 passed, zero failed/skipped | [Log](tests.log) |
| TypeScript | Passed | [Log](typecheck.log) |
| Ordinary production build | Passed; existing chunk-size and static/dynamic import warnings retained | [Log](build.log) |
| Genuine WebGL comparison | 24 native pairs and four inspection pairs; zero native camera-coordinate error; resource budgets pass | [Summary](evidence/comparison.json) |
| GLB rebuild | Four files reproduce byte for byte; only intended cliff/leaf meshes differ from PR21 | [Integrity](evidence/asset-integrity.json), [rebuild log](reproducibility.log) |
| Southern body clearance | 2,311 walkable samples checked against each shipped LOD; no new intersections | Unit tests and [PR21 fixture](../../artifacts/survivor-camp-prototype/tests/fixtures/pr21-cliff-clearance.json) |
| Gameplay routes | 51 continuous legs, including all 39 hiding approaches and water-collecting NPC follow-up | [Report](evidence/routes/report.json) |
| Mobile controls | 16 trusted touch/control groups passed | [Report](evidence/mobile/report.json) |
| Connected world | 15 groups passed, including repeated return travel, failure recovery, scene disposal and ballot | [Report](evidence/connected/browser-report.json) |
| Atmosphere | Seven groups passed, including presets, sky/ocean agreement, resource release and missing-atlas fallback | [Report](evidence/integration/report.json) |

The initial exported-clearance assertion reported `(15,100)`. Direct comparison with PR21 identifies seven existing cave-cheek intersections in both LODs, including that point. The final test uses an explicit base-commit fixture rather than incorrectly treating the inherited cases as new regressions. [Initial diagnostic log](art-tests.log) is retained. These inherited intersections are not claimed fixed by this art pass.

Physical iPhone Safari and sustained device performance remain untested. Touch results use Chromium's trusted browser input at a phone-like viewport, not physical hardware. Host render/loading timing is documented separately in [performance](PERFORMANCE.md).

## Reproduce

From the repository root, install the locked pnpm dependencies and build the existing API-client TypeScript project if needed. From `artifacts/survivor-camp-prototype`:

```sh
pnpm typecheck
pnpm test
PORT=5200 BASE_PATH=/ pnpm build
pnpm assets:environment-art
pnpm exec playwright install chromium
pnpm qa:environment-art
pnpm qa:environment-art-compare
```

The capture runner builds a minified app with a test-only inspection bridge. The ordinary app build does not receive that bridge. Before captures were made against immutable PR21 output; recapturing them requires checking out that base and using the same runner. Do not label a current-branch capture as the baseline. The comparison command reads the committed before report and the current after report; timing samples are excluded from automated budget assertions.

The new `.github/workflows/tonsai-environment-art.yml` runs TypeScript, unit tests, production build, Chromium captures and comparison. Local results are distinct from GitHub-hosted CI results.

## Recovery checkpoint

On November 4, 2026, the interrupted workspace was recovered at `/workspace/scratch/f3cab0a969d9/SurvivorIsland3Dprototype`. Its runtime implementation was intact in local commit `07a4f47881030f3c9ae0c7af8de75a604bc74838`; all evidence and reports were still untracked. No corresponding remote branch or draft PR existed at the start of recovery.

Before modifying files, a complete Git bundle, binary implementation patch and archive of all 121 untracked files were created. This includes temporary files from interrupted transfers, which remain excluded from Git commits. No stashes or additional unreachable commits were found; two unreachable blobs remain covered by the original object database. Existing failed Git push authentication was handled through the supported authenticated GitHub connection, without repeating the failed push.

The 13 previously uploaded blobs were reused after comparing every hash against the recovered local files. GitHub created the remaining tree entries and confirmed the complete implementation tree `cc3071b7f8f7a83c2cf00e690e2ee9b04a8fb344`, exactly matching the local implementation. It is reachable on `feat/tonsai-environment-art` through remote commit `b3b80f60a0e57c8dbb830a062fe73066ccdada9e`. The remote commit differs in metadata from the local commit; the source tree is identical.

[Draft PR #22](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/22) was opened immediately after securing the implementation. Fresh workspace-wide TypeScript checks, all 112 unit tests, saved-render camera/resource comparisons and four GLB integrity hashes pass. The production build is verified separately in the build log. Recovered gameplay/browser evidence is retained with its original results; those suites are not presented as newly rerun during recovery. No runtime changes were needed during recovery.

Reports and evidence are saved in subsequent incremental commits to the same branch. See the PR head for the final evidence checkpoint; GitHub Actions results are separate from local verification. Physical iPhone performance remains unverified.

Target repository: `sunsetseast/SurvivorIsland3Dprototype`. Base: `7b93d5444946217a6c5a59acb93ada563e6c1288`. Deliverable: one draft PR. Do not merge, deploy or publish the game. `SurvivorIsland2025` remains untouched.
