"""Production export: designed hero, separately streamed quality files, shelf anchors.
Blender 4.5: blender -b -t 4 --python tools/blender/hero.py
Run tools/tonsai/hero.py first. Existing NW massif is carried through unchanged.
"""
import bpy, numpy as np, json, math, hashlib, random
from mathutils.bvhtree import BVHTree
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/survivor-camp-prototype/src/assets/tonsai'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'karsts.glb'))
for o in list(bpy.context.scene.objects):
 if o.name.startswith('tonsai-divider'):bpy.data.objects.remove(o,do_unlink=True)
d=np.load('/tmp/tonsai-hero/hero.npz')
mesh=bpy.data.meshes.new('designed-karst-sculpt');mesh.from_pydata([(float(x),float(-z),float(y)) for x,y,z in d['vertices']],[],d['faces'].tolist());mesh.update()
obj=bpy.data.objects.new('tonsai-divider-high',mesh);bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
mod=obj.modifiers.new('silhouette-preserving-retopology','DECIMATE');mod.ratio=62000/len(d['faces']);bpy.ops.object.modifier_apply(modifier=mod.name)
for f in obj.data.polygons:f.use_smooth=True
mat=bpy.data.materials.new('limestone-neutral');mat.diffuse_color=(.6,.61,.56,1);mat.use_nodes=True
mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.94;obj.data.materials.append(mat)
node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='geological-occlusion';mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
bvh=BVHTree.FromObject(obj,bpy.context.evaluated_depsgraph_get())
col=obj.data.color_attributes.new(name='geological-occlusion',type='FLOAT_COLOR',domain='POINT')
for i,v in enumerate(obj.data.vertices):
 # AO-like orientation tint; large recesses additionally get baked ray occlusion.
 n=v.normal;up=max(0,n.z);value=.80+.15*up
 hits=0
 for ray in range(8):
  a=ray*2.399;di=Vector((math.cos(a)*.7,math.sin(a)*.7,.45)).normalized()
  if di.dot(n)<0:di=-di
  if bvh.ray_cast(v.co+n*.25,di,28)[0] is not None:hits+=1
 value*=1-hits*.045
 col.data[i].color=(value,value*.99,value*.95,1)
obj.data.color_attributes.active_color=col
# Collision fallback exported independently. Never raycast the full 62k mesh per camera update.
low=obj.copy();low.data=obj.data.copy();low.name='tonsai-divider-low';bpy.context.collection.objects.link(low);bpy.context.view_layer.objects.active=low
mod=low.modifiers.new('mobile-ridge-lod','DECIMATE');mod.ratio=.28;bpy.ops.object.modifier_apply(modifier=mod.name)
# Anchors are true positions on upward-facing triangles, not noise in 3D space.
r=random.Random(6198);anchors=[]
faces=list(obj.data.polygons);r.shuffle(faces)
for f in faces:
 n=f.normal;c=f.center
 if n.z < .52 or c.z < 16: continue
 x,y,z=c.x,c.z,-c.y
 if any((x-a['x'])**2+(z-a['z'])**2+(y-a['y'])**2<11**2 for a in anchors):continue
 # Keep rim forest and selected garden ledges; vertical faces remain exposed.
 anchors.append({'x':round(x,3),'y':round(y-.12,3),'z':round(z,3),'normal':[round(n.x,3),round(n.z,3),round(-n.y,3)],'scale':round(.32+r.random()*.43,3),'kind':'ficus' if r.random()<.25 else 'canopy','variant':r.randrange(2),'turn':round(r.random()*math.tau,3),'tint':r.random()})
 if len(anchors)>=250:break
# Dense crest woodland, sampled from the final retopologized surface itself.
for x in range(-390,25,10):
 for z in range(-895,-355,10):
  origin=Vector((x+r.uniform(-3,3),-z+r.uniform(-3,3),220));hit,n,_,_=bvh.ray_cast(origin,Vector((0,0,-1)),220)
  if hit is None or hit.z<35 or n.z<.42:continue
  if any((hit.x-a['x'])**2+(-hit.y-a['z'])**2+(hit.z-a['y'])**2<8.2**2 for a in anchors):continue
  anchors.append({'x':round(hit.x,3),'y':round(hit.z-.12,3),'z':round(-hit.y,3),'normal':[round(n.x,3),round(n.z,3),round(-n.y,3)],'scale':round(.48+r.random()*.38,3),'kind':'ficus' if r.random()<.15 else 'canopy','variant':r.randrange(3),'turn':round(r.random()*math.tau,3),'tint':r.random()})
(OUT/'hero-anchors.json').write_text(json.dumps(anchors,separators=(',',':')))
fallback=json.loads((OUT/'fallback.json').read_text())
coarse=low.copy();coarse.data=low.data.copy();bpy.context.collection.objects.link(coarse);bpy.context.view_layer.objects.active=coarse
m=coarse.modifiers.new('camera-and-network-proxy','DECIMATE');m.ratio=1800/len(coarse.data.polygons);bpy.ops.object.modifier_apply(modifier=m.name)
fallback[0]={'id':'tonsai-divider','position':[round(c,3) for v in coarse.data.vertices for c in (v.co.x,v.co.z,-v.co.y)],'index':[i for p in coarse.data.polygons for i in p.vertices]}
(OUT/'fallback.json').write_text(json.dumps(fallback,separators=(',',':')));bpy.data.objects.remove(coarse,do_unlink=True)
manifest={'generator':'tools/tonsai/hero.py + tools/blender/hero.py','blender':bpy.app.version_string,'license':'Original art, MIT','files':[],'anchors':len(anchors)}
for quality in ['high','low']:
 bpy.ops.object.select_all(action='DESELECT')
 modules=[]
 for o in bpy.context.scene.objects:
  if o.type=='MESH' and o.name.endswith('-'+quality):
   o.select_set(True);modules.append({'name':o.name,'triangles':len(o.data.polygons),'vertices':len(o.data.vertices)})
 f=OUT/f'karsts-{quality}.glb'
 bpy.ops.export_scene.gltf(filepath=str(f),use_selection=True,export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,export_materials='EXPORT')
 manifest['files'].append({'file':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'modules':modules})
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'tools/blender/source/tonsai-hero.blend'),compress=True)
(OUT/'hero-manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest,indent=2),flush=True)
