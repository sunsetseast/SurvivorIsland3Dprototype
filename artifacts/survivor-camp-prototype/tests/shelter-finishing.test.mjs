import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {finishShelterMesh} from '../src/game/environment/shelterFinishing.ts';
const bytes=g=>Object.values(g.attributes).reduce((sum,a)=>sum+a.array.byteLength,g.index?.array.byteLength??0);
function meshes(file) {
  const b=readFileSync(new URL('../src/assets/camp/'+file,import.meta.url)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n);
  const attr=id=>{
    const a=j.accessors[id],v=j.bufferViews[a.bufferView],C={5126:Float32Array,5123:Uint16Array,5125:Uint32Array}[a.componentType],size={SCALAR:1,VEC2:2,VEC3:3}[a.type],start=(v.byteOffset||0)+(a.byteOffset||0),data=bin.subarray(start,start+a.count*size*C.BYTES_PER_ELEMENT);
    return new T.BufferAttribute(new C(data.buffer.slice(data.byteOffset,data.byteOffset+data.length)),size);
  };
  return j.nodes.filter(node=>node.name.startsWith('shelter-')).map(node=>{
    const p=j.meshes[node.mesh].primitives[0],g=new T.BufferGeometry();
    for(const [name,id] of Object.entries(p.attributes))g.setAttribute({POSITION:'position',NORMAL:'normal',COLOR_0:'color',TEXCOORD_0:'uv'}[name],attr(id));
    g.setIndex(attr(p.indices)); const m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));m.name=node.name;return m;
  });
}
test('both finished shelter LODs retain deck/roof clearance, fixed draws and bounded resident geometry',()=>{
  for(const file of ['reconstruction.glb','reconstruction-low.glb']) {
    const ms=meshes(file),before=ms.reduce((sum,m)=>sum+bytes(m.geometry),0),deck=ms.find(m=>m.name==='shelter-deck'),originalDeck=Array.from(deck.geometry.attributes.position.array);
    ms.forEach(finishShelterMesh);
    const after=ms.reduce((sum,m)=>sum+bytes(m.geometry),0),delta=after-before;
    assert.equal(ms.length,5);
    assert.deepEqual(Array.from(deck.geometry.attributes.position.array),originalDeck);
    assert.ok(delta>0 && delta<45000,`${file}: ${delta} bytes`);
    assert.equal(delta,ms.find(m=>m.name==='shelter-supplies').geometry.userData.shelterCompletionBytes);
    const roof=ms.find(m=>m.name==='shelter-thatch');roof.updateMatrixWorld();
    for(const x of [8,12,15])for(const z of [-47,-44,-41]) {
      const hit=new T.Raycaster(new T.Vector3(x,3.5,z),new T.Vector3(0,1,0),0,6).intersectObject(roof)[0];
      assert.ok(hit&&hit.point.y>3.52,`${file} standing clearance ${x},${z}`);
    }
    for(const m of ms) {
      assert.ok([...m.geometry.attributes.position.array].every(Number.isFinite));
      const array=Array.from(m.geometry.attributes.position.array);finishShelterMesh(m);assert.deepEqual(Array.from(m.geometry.attributes.position.array),array,'one-time finishing must be idempotent');
      m.geometry.dispose();m.material.dispose();
    }
    console.log(file,{addedResidentBytes:delta});
  }
});
