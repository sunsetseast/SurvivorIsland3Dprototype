import * as T from 'three';
/** Alpha-tested coverage, only in the camera-to-character corridor. Existing
 * MSAA coverage softens the transition without sorted/blended leaf materials. */
export function installFoliageVisibility(material: T.Material, focus: T.Vector3) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFoliageFocus = { value: focus };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFoliageWorld;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 foliagePosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          foliagePosition=instanceMatrix*foliagePosition;
        #endif
        vFoliageWorld=(modelMatrix*foliagePosition).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uFoliageFocus;\nvarying vec3 vFoliageWorld;')
      .replace('#include <alphatest_fragment>', `
        vec3 foliageBoom=uFoliageFocus-cameraPosition;
        float foliageAlong=dot(vFoliageWorld-cameraPosition,foliageBoom)/max(.01,dot(foliageBoom,foliageBoom));
        vec3 foliageClosest=cameraPosition+clamp(foliageAlong,0.,1.)*foliageBoom;
        float foliageRadius=mix(.95,.65,clamp(foliageAlong,0.,1.));
        float foliageCoverage=smoothstep(.35,.85,length(vFoliageWorld-foliageClosest)/foliageRadius);
        float foliageSegment=smoothstep(0.,.08,foliageAlong)*(1.-smoothstep(.92,1.,foliageAlong));
        diffuseColor.a*=mix(1.,foliageCoverage,foliageSegment)*smoothstep(.65,1.7,length(vViewPosition));
        #include <alphatest_fragment>`);
  };
  material.customProgramCacheKey = () => 'character-foliage-corridor-v1';
}
