# Character and asset provenance

All four new characters are original procedural geometry authored in this PR.
No downloaded models, AI-generated evidence, textures, proprietary game assets,
Roblox/Outlaster assets, avatar photographs, font files or animation packs are shipped.
The representations are stylized fan-game interpretations, not scans or claims of
photographic likeness. The monogram on Rob's cap is original geometric lettering.

| Contestant | Authored identity cues | Rendered triangles | Unique rig geometry bytes |
| --- | --- | ---: | ---: |
| Sandra | Shorter, wider build; shaped cheeks/nose/jaw; black bob; red sleeveless top; dark teal shorts | 9,494 | 812,376 |
| Parvati | Taller slender build; narrower jaw; long layered dark hair; teal top; purple shorts | 9,494 | 812,376 |
| Russell | Short broad build; heavier nose/jaw; goatee and facial hair; brown brimmed hat; sand shirt; navy shorts | 10,340 | 900,288 |
| Boston Rob | Taller broad build; distinct jaw/stubble; navy monogram cap; red shirt; khaki shorts | 10,586 | 926,856 |

The four rigs add 39,914 triangles before view culling and shadow passes. Limbs
share geometry within each rig. Eight merged part geometries per identity,
one shared vertex-color Lambert material, no added texture downloads, no new
lights, and the existing single directional shadow map. Meshes are articulated
under hips/spine/head, upper/lower arms, thighs/knees/ankles. Each hand has four
fingers and an opposing thumb; each sandal/foot has individually modeled toes.

Walking uses actual displacement, a planted stance phase and two-link leg IK;
the legs sample terrain under the feet. Idle, walking, speech/listening gestures,
chores and the campfire log seated pose blend continuously. NPCs currently walk;
there is no NPC sprint goal, so NPC running clips are deliberately not invented.
The existing player's walk/run rig and appearance are retained, with a small
conversation gesture added. No lip sync or facial blendshape animation is claimed.

The island, its textures, flora and props remain the project's procedural assets.
Existing third-party runtime libraries retain their package licenses. Test-only
Playwright and tsx are development dependencies, not runtime character assets.

The user's reference simulation source is reused verbatim in the local
`src/game/simulation/reference/` snapshots. Its repository, exact revision and
SHA256 hashes are in `reference-origin.json`. No new license is assigned to that
source or to the user's original art/code. Regenerate reviewed source snapshots
rather than hand-editing this copy. `contestants.json` is a documented projection
of the four actual GameData identity/rating records at the same revision.
