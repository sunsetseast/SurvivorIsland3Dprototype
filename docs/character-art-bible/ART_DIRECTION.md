# Art direction

[Start here](README.md) · [Cast matrix](CAST_MATRIX.md) · [Production strategy](PRODUCTION_STRATEGY.md)

## Premium stylized realism

The goal is a cohesive cast of polished 3D adventure-game characters with recognizable faces, credible bodies and season-specific expedition clothing. Stylize detail frequency, material finish and expression range. Preserve individual proportions and relationships between features. A player should recognize the contestant from the face in the picker and from the silhouette and clothing in camp.

| Area | Standard | Review |
| --- | --- | --- |
| Face | Sculpt brow shelf, orbital shape, cheek plane, bridge and alae, mouth corners, jaw hinge and chin as a connected structure. Keep age cues and natural asymmetry. Use clear primary and secondary forms with restrained microdetail. | Compare hair-off front, three-quarter and profile under neutral light. Use neutral and speaking or smiling references separately. Check nose projection and brow-to-eye spacing in profile. |
| Eyes | Keep realistic socket depth and iris-to-eye ratio. Model upper and lower lid thickness. Let lids occlude the sphere naturally. Use toned sclera, iris color at supported confidence, wetness only at a restrained highlight and separate dark lash coverage where needed. | Read eye and lid silhouette at picker distance and in firelight. Check for clipping in blink and in downward glance. |
| Body | Use actual proportion relationships from full-body views. Vary limb lengths, thorax width, torso length, waist, hips, thigh volume and neck slope independently. Cirie carries fuller mass, Rob and Russell have different stocky frames, and Ozzy and Tyson are differently lean. | Compare isolated silhouettes in neutral and idle pose at one ground plane and camera distance. Check hand and foot scale, shoulder rotation and hip movement in run, climb and sit. |
| Hair and facial hair | Sculpt the broad groom and hairline first. Add directional textured ribbons, small clusters or a few alpha-masked cards where they add silhouette or softness. Style braids from scalp flow and actual gathering point. Stubble needs UV density and subtle color, with geometry only for visible volume. | Check hairline from both sides and rear, then inspect alpha edges, card sorting and motion. Pay particular attention to Carolyn’s loose length, Cirie’s low gathering and Ozzy’s nape curls. |
| Skin | Use original hand-painted or procedural albedo with restrained variation in cheek, lip, knuckle, shoulder and scalp zones. Keep diffuse values plausible and bake compatible normal and roughness detail. Reserve sharper highlights for eyes, moisture and some accessories. | Compare the same neutral daylight and firelight. Keep darker complexions readable without lifting all tones into the same hue. Avoid glossy plastic patches or baked directional shadows. |
| Clothing | Build neckline, collar, hem, strap and major pocket silhouettes. Use thickness at visible openings and a few folds that follow cloth tension. Separate matte jersey, swim fabric, denim, weave and metal through roughness and construction. | Confirm the garment reads when the whole character is small. Check Sandra’s collar, Cirie’s strap ties and Carolyn’s waist layer in neutral and raised-arm poses. |
| Tattoos and marks | Use original authored skin maps with separate UV space per side. Keep proven shape, placement, scale, negative space and saturation. Hold unknown borders and text in a labeled work layer until a better reference arrives. | Check the skin’s right and left at the same time, then the arm bend and sides. Confirm no mirrored ink and no texture seam through the key motif. |
| Lighting | Render all reviews with a neutral broad key, soft fill, fixed exposure and neutral background. Include the actual beach and council conditions in runtime review. Keep camera angles and screen size consistent across models. | Compare front, three-quarter, profile, rear and full body. Review lineup and one individual at a time in landscape. Include stock controls at the same scale. |

## Screen hierarchy

- **Picker and close-up** · Preserve the contestant-specific eye, cheek, nose and mouth relationship. Add material richness to hairline, skin and fabric where it survives the camera. Put the expression on a pose or shape rather than stretching the base mesh.
- **Camp and challenge** · Prioritize silhouette, gait, hair volume, garment construction, Buff location and large markings. Represent clothing logos and tattoo detail only to the degree supported by evidence and cleared for the intended release.
- **Council and group shots** · Keep everyone individually readable in a shared scene. Make the shadow-side eye and face plane legible. Preserve contrasting wardrobe blocks and hair silhouettes across adjacent actors.

## Animation and detail levels

- Keep deformation loops around shoulders, hip folds, elbows, knees and hands. Preserve bind pose, joint naming, toe contacts and clip names. Weight-test high cuffs, long hair, hats, pendants and tied waist layers against crouch, climb, balance and seated idle.
- Start future close models within the current validator’s limits of 650,000 bytes and fewer than 23,000 triangles per GLB. Existing production spans roughly 9,000–22,800 triangles and 9–15 material primitives. These are current observed ranges, with final budgets subject to physical iPhone profiling. [Validator](../../artifacts/survivor-camp-prototype/scripts/validate-cast.mjs)
- Prototype a reduced distance variant only if profiling shows a group-scene need. Reduce hidden garment faces, hair layers and material groups first. Preserve face shape, skinning, large clothing edges and tattoos. Measure switching cost and visible popping. The existing cast manifest maps one GLB per ID.
- Use base color with appropriate color-space metadata and linear data for roughness, metal and normals. Bake Blender-only shading into engine-supported maps. Start from the existing WebP and Meshopt route. A new texture compression path would need a supported loader and separate review. [Cast optimizer](../../tools/character/optimize-cast.mjs) · [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
- Compare group-scene draw calls, GPU texture residency, load latency, frame pacing and sustained thermal behavior on physical iPhone 17 Pro Max Safari. Report picker, camp, challenge and council separately. Prior Chromium figures establish development controls only.

## Appearance approval

Use four individual review panels per subject. Show a neutral face beside two source angles, a natural expression, a silhouette and full kit, and a gameplay-scale render. Review face identity and body fit before adding microdetail. Check seasonal coherence and open evidence gaps against the sheet before export. If a distinguishing feature is still uncertain, leave it visibly marked in the art review.
