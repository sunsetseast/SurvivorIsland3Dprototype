import * as THREE from "three";

/** One opaque Standard material for all heroes, no texture fetches or alpha hair.
 * Baked surface controls survive rigid-part merging; lights stay native Three PBR. */
export function createCharacterMaterial() {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.82,
    metalness: 0,
  });
  material.name = "hero-skin-hair-weathered-fabric";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      attribute vec2 heroSurface;
      varying vec2 vHeroSurface;
      varying vec3 vHeroPosition;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      vHeroSurface = heroSurface;
      vHeroPosition = position;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec2 vHeroSurface;
      varying vec3 vHeroPosition;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
      roughnessFactor = vHeroSurface.x;
      float weave = sin(vHeroPosition.x * 620.0) * sin(vHeroPosition.y * 740.0);
      diffuseColor.rgb *= 1.0 + weave * vHeroSurface.y;`,
      );
  };
  material.customProgramCacheKey = () => "survivor-hero-surfaces-v1";
  return material;
}
