"""Original reusable limestone shelter / talus kit. Blender 4.5.3, metres, glTF Y up."""
import bpy, math, random, json, hashlib
from pathlib import Path
from mathutils import Vector
random.seed(8241)
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/survivor-camp-prototype/src/assets/railay';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mat=bpy.data.materials.new('weathered-limestone');mat.diffuse_color=(.52,.45,.33,1);mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.96
# Own baked albedo atlas; no external imagery.
img=bpy.data.images.new('railay-limestone-original',width=256,height=256)
pixels=[]
for y in range(256):
 for x in range(256):
  f=.8+.1*math.sin(x*.1+math.sin(y*.035)*2)+random.uniform(-.06,.06)
  pixels.extend((.66*f,.59*f,.46*f,1))
img.pixels=pixels;img.filepath_raw=str(OUT/'limestone.png');img.file_format='PNG';img.save();img.pack()
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img;mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
def mesh(name,v,f):
 m=bpy.data.meshes.new(name);m.from_pydata([(x,-z,y) for x,y,z in v],[],f);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 uv=m.uv_layers.new(name='UVMap')
 for p in m.polygons:
  p.use_smooth=True
  for li in p.loop_indices:
   a=m.vertices[m.loops[li].vertex_index].co;uv.data[li].uv=(a.x*.07%1,a.z*.07%1)
 return o
# A hollow, ragged rock shelter, open at front/back and below: actual arch, not black decal.
v=[];f=[];N=36;D=9
for j in range(D):
 z=j/(D-1)*14
 for i in range(N+1):
  a=i/N*math.pi;r=1+.045*math.sin(i*2.3+j)
  v.append((math.cos(a)*12*r,math.sin(a)*10*r+1,z))
for j in range(D-1):
 for i in range(N):
  a=j*(N+1)+i;f.append((a,a+1,a+N+2,a+N+1))
o=mesh('karst-shelter',v,f);solid=o.modifiers.new('geological-thickness','SOLIDIFY');solid.thickness=2.3
bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=solid.name)
for k in range(3):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(40+k*8,0,0));o=bpy.context.object;o.name=f'talus-{k}';
 for p in o.data.vertices:
  p.co*=random.uniform(.78,1.2);p.co.x*=1.8;p.co.z*=.8
 o.data.materials.append(mat)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
# Small independent stalactite cluster, roof origin.
v=[];f=[]
for k in range(9):
 cx=random.uniform(-5,5);cz=random.uniform(-2,2);h=random.uniform(1.5,4.5);start=len(v)
 for ring,r,y in [(0,.45,0),(1,.32,-h*.55),(2,.03,-h)]:
  for i in range(7):v.append((cx+math.cos(i*math.tau/7)*r,y,cz+math.sin(i*math.tau/7)*r))
 for j in range(2):
  for i in range(7):a=start+j*7+i;b=start+j*7+(i+1)%7;f.append((a,b,b+7,a+7))
o=mesh('stalactite-cluster',v,f);o.location.x=80
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'tools/blender/source/railay-geology.blend'))
# Individual module mesh origins reset: runtime places modules by geography, not authoring layout.
for o in bpy.context.scene.objects:o.location=(0,0,0)
bpy.ops.export_scene.gltf(filepath=str(OUT/'geology.glb'),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,export_materials='EXPORT')
b= (OUT/'geology.glb').read_bytes();(OUT/'geology.json').write_text(json.dumps({'generator':'tools/blender/railay.py','blender':bpy.app.version_string,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'license':'MIT; original procedural art','modules':['karst-shelter','talus-0','talus-1','talus-2','stalactite-cluster']},indent=2))
