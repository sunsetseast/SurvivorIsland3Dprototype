# Future hiding candidates

39 authored candidates across 13 natural sites. These are preparation data, not placed idols or clues. Coordinates are local world metres, ordered X/Y/Z. Interaction Y is sampled from the current terrain; table values are rounded to 2 decimals. All approaches are checked by the real body solver and graph.

The [source registry](../../artifacts/survivor-camp-prototype/src/game/environment/hidingSpots.ts) is authoritative. Every entry has a stable ID, landmark association, category, placement and interaction positions, surface/clearance/range information, partial/recessed exposure, approach direction, enabled state and future idol/clue eligibility. Camera collision uses the actual rendered landmark meshes. No markers are rendered from this registry.

| Stable ID | Category | Candidate X/Y/Z | Player approach X/Y/Z | Exposure |
|---|---|---|---|---|
| `tonsai-ancient-fig-1` | buttress-root | (46.10, 3.07, 5.70) | (48.10, 2.85, 6.20) | partly-screened |
| `tonsai-ancient-fig-2` | buttress-root | (40.40, 2.41, 7.50) | (38.70, 1.88, 9.10) | partly-screened |
| `tonsai-ancient-fig-3` | buttress-root | (42.00, 2.67, 1.50) | (41.30, 2.23, -0.50) | partly-screened |
| `tonsai-root-crown-1` | root-pocket | (78.80, 6.65, 24.00) | (80.80, 6.65, 24.70) | partly-screened |
| `tonsai-root-crown-2` | root-pocket | (73.20, 5.88, 24.00) | (71.20, 5.31, 24.70) | partly-screened |
| `tonsai-root-crown-3` | root-pocket | (76.00, 6.29, 20.00) | (76.00, 6.03, 18.00) | partly-screened |
| `tonsai-fallen-giant-1` | hollow-log | (67.30, 6.75, 56.00) | (68.70, 5.90, 56.00) | recessed |
| `tonsai-fallen-giant-2` | hollow-log | (58.70, 5.84, 56.00) | (57.30, 4.66, 56.00) | recessed |
| `tonsai-fallen-giant-3` | hollow-log | (64.00, 5.72, 57.00) | (64.00, 5.53, 58.50) | recessed |
| `tonsai-moss-gates-1` | rock-crevice | (14.20, 2.61, 65.00) | (16.00, 2.04, 65.00) | partly-screened |
| `tonsai-moss-gates-2` | rock-crevice | (17.80, 2.67, 67.00) | (16.00, 2.07, 67.00) | partly-screened |
| `tonsai-moss-gates-3` | rock-crevice | (16.00, 2.63, 69.80) | (16.00, 2.10, 68.20) | partly-screened |
| `tonsai-southern-cave-1` | cave-recess | (7.20, 2.73, 103.00) | (9.00, 2.10, 103.00) | recessed |
| `tonsai-southern-cave-2` | cave-recess | (14.80, 3.36, 106.00) | (13.00, 2.38, 106.00) | recessed |
| `tonsai-southern-cave-3` | cave-recess | (11.00, 2.84, 110.80) | (11.00, 2.31, 109.00) | recessed |
| `tonsai-roof-shelter-1` | overhang | (-21.00, 0.94, 96.00) | (-21.00, 0.43, 94.00) | partly-screened |
| `tonsai-roof-shelter-2` | overhang | (-18.00, 1.04, 96.00) | (-18.00, 0.55, 94.00) | partly-screened |
| `tonsai-roof-shelter-3` | overhang | (-15.00, 1.12, 95.00) | (-15.00, 0.66, 93.00) | partly-screened |
| `tonsai-hollow-stump-1` | hollow-stump | (31.00, 3.59, -7.00) | (31.00, 1.35, -9.10) | recessed |
| `tonsai-hollow-stump-2` | hollow-stump | (31.60, 1.71, -6.30) | (32.60, 1.44, -5.20) | recessed |
| `tonsai-hollow-stump-3` | hollow-stump | (30.40, 1.66, -6.30) | (29.40, 1.30, -5.20) | recessed |
| `tonsai-leaning-tamarind-1` | root-pocket | (-2.00, 1.43, 45.70) | (-2.00, 1.17, 47.70) | partly-screened |
| `tonsai-leaning-tamarind-2` | root-pocket | (-4.70, 1.55, 43.00) | (-6.70, 1.36, 43.00) | partly-screened |
| `tonsai-leaning-tamarind-3` | root-pocket | (-2.00, 1.43, 40.30) | (-2.00, 1.19, 38.30) | partly-screened |
| `tonsai-strangler-stone-1` | behind-boulder | (92.90, 9.19, 61.00) | (90.50, 8.22, 61.00) | partly-screened |
| `tonsai-strangler-stone-2` | behind-boulder | (97.10, 9.69, 61.00) | (99.50, 9.25, 61.00) | partly-screened |
| `tonsai-strangler-stone-3` | behind-boulder | (95.00, 9.49, 63.10) | (95.00, 8.90, 65.50) | partly-screened |
| `tonsai-fern-bowl-1` | fallen-branch | (41.50, 3.81, 82.50) | (41.50, 3.67, 81.00) | partly-screened |
| `tonsai-fern-bowl-2` | fallen-branch | (43.00, 3.95, 82.50) | (43.00, 3.80, 81.00) | partly-screened |
| `tonsai-fern-bowl-3` | fallen-branch | (44.50, 4.10, 82.50) | (44.50, 3.94, 81.00) | partly-screened |
| `tonsai-root-bridge-1` | hollow-log | (84.70, 7.35, 1.00) | (83.30, 6.89, 1.00) | recessed |
| `tonsai-root-bridge-2` | hollow-log | (93.30, 8.13, 1.00) | (94.70, 7.96, 1.00) | recessed |
| `tonsai-root-bridge-3` | hollow-log | (90.00, 7.29, 2.00) | (90.00, 7.46, 3.50) | recessed |
| `tonsai-quiet-alcove-1` | rock-crevice | (27.50, 3.65, 92.00) | (29.00, 3.10, 92.00) | partly-screened |
| `tonsai-quiet-alcove-2` | rock-crevice | (32.50, 3.82, 92.00) | (31.00, 3.18, 92.00) | partly-screened |
| `tonsai-quiet-alcove-3` | rock-crevice | (30.00, 3.63, 93.80) | (30.00, 3.14, 92.20) | partly-screened |
| `tonsai-spring-seep-1` | spring-rock | (109.80, 9.86, 36.80) | (111.30, 9.51, 36.80) | partly-screened |
| `tonsai-spring-seep-2` | spring-rock | (108.80, 9.76, 37.60) | (108.80, 9.51, 39.10) | partly-screened |
| `tonsai-spring-seep-3` | spring-rock | (106.30, 9.71, 36.00) | (104.70, 9.51, 36.00) | partly-screened |

The spring is a natural seep site in addition to the twelve signature landmarks. Some candidates sit inside hollows or against rock, while their interaction positions remain outside solids. Future selection should choose a subset of eligible candidates and keep discovery/ownership separate; this PR creates no such state.
