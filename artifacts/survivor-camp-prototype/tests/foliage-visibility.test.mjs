import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { installFoliageVisibility } from '../src/game/environment/foliageVisibility.ts';

test('camera corridor uses the existing cutout pass and a live shared focus', () => {
  const material=new T.MeshStandardMaterial({alphaTest:.3,alphaToCoverage:true});
  const focus=new T.Vector3(11,2,100);
  installFoliageVisibility(material,focus);
  const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};
  material.onBeforeCompile(shader, null);
  assert.equal(shader.uniforms.uFoliageFocus.value,focus);
  assert.equal(material.transparent,false);
  assert.equal(material.depthWrite,true);
  assert.equal(material.alphaToCoverage,true);
  assert.ok(shader.vertexShader.includes('instanceMatrix*foliagePosition'), 'instanced leaves must use world positions');
  assert.ok(shader.fragmentShader.includes('#include <alphatest_fragment>'), 'retain the real alpha test');
  assert.ok(shader.fragmentShader.includes('smoothstep(.92,1.,foliageAlong)'), 'leave vegetation behind the player intact');
  focus.set(12,3,99);
  assert.equal(shader.uniforms.uFoliageFocus.value.x,12);
  material.dispose();
});
