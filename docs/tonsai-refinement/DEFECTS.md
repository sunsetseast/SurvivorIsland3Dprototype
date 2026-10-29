# Initial defect inventory — inspected before implementation

Baseline: merged PR16, fd2c39df39f237a8adda766d7c8cd70906f4ddfb.

1. **Critical — Moss Gates:** three 4–6 m tall rounded boxes with nearly vertical parallel sides and broad green vertex tint. Screenshot high-16 visibly reads as masonry/hedges. Replace the mesh source, not its bevel.
2. **High — alcove / strangler stone:** the same rounded-box recipe produces manufactured silhouettes. Shared broad rectangle collisions overfill corners.
3. **High — ancient fig:** nearly rotational trunk, flat triangular buttresses and straight branches; no convincing root flare. Baseline high-13 confirms artificial fins.
4. **High — fallen giant / stump:** concentric open cylinders and torus end rings, regular circular openings, identical thickness. Need authored broken rims and tapered cambium.
5. **High — cave:** constant semicircular vault, rectangular face cut, flat back panel; entrance/ceiling need a continuous irregular transition while keeping the full body corridor.
6. **High — southern face:** flat-shaded unshared triangle vertices exaggerate a regular grid; smooth weathered flutes, fissures and undercut need coherent normals and varied mineral response.
7. **Medium — roots:** repeated radial tubes and roots cutting through the strangler stone; root paths need stone-surface fitting, grounded tips and asymmetry.
8. **Medium — jungle:** one repeated scanned broadleaf orientation and single crown placement; uniform bright foliage, sparse midstory, weak contact shading at landmarks. Add ecological clusters without obstructing trails.
9. **Performance:** ~3 s graph build verifies every edge at runtime; terrain mask repeats expensive height/noise work. PR16 entry measurement combines initialization, manual simulation and five GPU finishes. Measure production stages separately before assigning blame.

Inspection sources: Landmarks.tsx, geography.ts, Environment.tsx, world.ts, navigation.ts, Terrain.tsx, PR16 high-13/high-14/high-15/high-16/high-18/high-20 and performance report. These are prioritized defects, not a claim of comprehensive physical-device visual certification.
