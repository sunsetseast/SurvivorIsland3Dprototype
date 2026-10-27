"""Optimize the MAIN Tonsai cliff formations, save editable .blend, export GLB.
Run tools/tonsai/sculpt.py first, then Blender 4.5 --background --python this.py.
TONSAI_SCULPT chooses the scratch volume directory. MIT original mesh art.
"""
import bpy, numpy as np, os, json, hashlib, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/survivor-camp-prototype/src/assets/tonsai';OUT.mkdir(parents=True,exist_ok=True)
SRC=Path(os.environ.get('TONSAI_SCULPT','/tmp/tonsai-sculpt'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mat=bpy.data.materials.new('tonsai-weathered-limestone');mat.diffuse_color=(.47,.48,.43,1);mat.use_nodes=True
mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.94
manifest={'generator':'tools/tonsai/sculpt.py + tools/blender/tonsai.py','blender':bpy.app.version_string,'license':'MIT, original procedural/sculpted art','modules':[]}
for name in ['tonsai-divider','northwest-wall']:
 d=np.load(SRC/(name+'.npz'));verts=d['vertices'];faces=d['faces']
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([(float(x),float(-z),float(y)) for x,y,z in verts],[],faces.tolist());mesh.update()
 obj=bpy.data.objects.new(name+'-high',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 # Collapse excess coplanar samples while preserving genuine undercuts/cavities.
 mod=obj.modifiers.new('sculpt-surface-optimization','DECIMATE');mod.ratio=min(1,105000/len(faces));bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in obj.data.polygons:f.use_smooth=True
 # Store large-scale mineral and cavity coloration in editable vertex colours.
 col=obj.data.color_attributes.new(name='geological-occlusion',type='FLOAT_COLOR',domain='POINT')
 for i,v in enumerate(obj.data.vertices):
  x,z,y=v.co.x,-v.co.y,v.co.z
  stain=.5+.5*math.sin(x*.035+z*.051+math.sin(y*.043)*2)
  damp=math.exp(-max(y,0)/12)*.16
  value=.86-.20*stain-damp+.08*max(0,v.normal.z)
  col.data[i].color=(value,value*.99,value*.92,1)
 obj.data.color_attributes.active_color=col
 low=obj.copy();low.data=obj.data.copy();low.name=name+'-low';bpy.context.collection.objects.link(low)
 bpy.context.view_layer.objects.active=low
 mod=low.modifiers.new('mobile-silhouette-lod','DECIMATE');mod.ratio=.32;bpy.ops.object.modifier_apply(modifier=mod.name)
 for o in [obj,low]:
  manifest['modules'].append({'name':o.name,'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'vertices':len(o.data.vertices)})
 obj.select_set(False)
# An independently exported coarse fallback preserves the new silhouette on
# failed network loads and doubles as a bounded camera collision proxy.
fallback=[]
for o in list(bpy.context.scene.objects):
 if not o.name.endswith('-low'):continue
 coarse=o.copy();coarse.data=o.data.copy();bpy.context.collection.objects.link(coarse)
 bpy.context.view_layer.objects.active=coarse
 dec=coarse.modifiers.new('fallback-2k','DECIMATE');dec.ratio=.065;bpy.ops.object.modifier_apply(modifier=dec.name)
 fallback.append({'id':o.name.removesuffix('-low'),'position':[round(c,3) for v in coarse.data.vertices for c in (v.co.x,v.co.z,-v.co.y)],'index':[i for p in coarse.data.polygons for i in p.vertices]})
 bpy.data.objects.remove(coarse,do_unlink=True)
(OUT/'fallback.json').write_text(json.dumps(fallback,separators=(',',':')))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'tools/blender/source/tonsai-karsts.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'karsts.glb'),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,export_materials='EXPORT')
b=(OUT/'karsts.glb').read_bytes();manifest.update({'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'sourceSha256':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path(__file__),ROOT/'tools/tonsai/sculpt.py',ROOT/'tools/tonsai/footprints.json']}})
(OUT/'karsts.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
