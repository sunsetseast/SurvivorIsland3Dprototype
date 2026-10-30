# Water implementation decision

[Ultra-Water](https://github.com/Humpalumps/Ultra-Water) was inspected at commit `ce9248f` (the full SHA is available in the reference repository's history). Its license is MIT. Its published desktop/mobile timing claims belong to its own demo and hardware; they are not measurements of Survivor Island or iPhone Safari.

| Approach | Benefit | Cost and integration consequence | Decision |
| --- | --- | --- | --- |
| Improve the existing surface | Small integration and one surface draw. Existing coast/collision remains authoritative. | The old system needs its three independent foam ribbons removed rather than recoloured. | Selected: replace it with an original continuous coastal shader. |
| Adapt a small Ultra-Water shoreline subset | Depth-aware swash and broken foam are relevant techniques. | Its implementation couples shore travel fields, depth sampling, terrain swash and simulation uniforms; a proper adapter and license notices would be needed for source reuse. | Studied conceptually; independently implemented a small shoreline field and broken foam. No source copied. |
| Full Ultra-Water | FFT spectrum, refraction, planar reflections, underwater effects and richer breakers. | `OceanSurface.js`, `OceanSim.js` and `main.js` show simulation targets, scene colour/depth targets, a reflection pass and a separate water scene. Replacing the current React Three Fiber/lifecycle render ownership would add substantial scope. No integrated device benchmark establishes that this cost is acceptable. | Deferred. The immediate scene does not need ocean-scale simulation or underwater gameplay. |

The selected original shader uses the real shoreline function packed into a small RGBA8 lookup, gradual depth tint, moving normal variation, sky Fresnel shading, soft broken swash and modest displaced waves. It removes the layered foam meshes. It adds no reflection/refraction render targets, mandatory floating-point textures, postprocessing chain or runtime package. It explicitly releases its geometry, material and shore texture.

The sky reflection is an analytic approximation. This version has no scene-object reflections, screen-space refraction, FFT, buoyancy or underwater renderer. The evidence and host timings in PERFORMANCE.md describe the implemented version. Full Ultra-Water would require a separate measured integration experiment before adoption.
