"""Close-up Survivor-inspired voting props. Blender 4.5.3 LTS; run at repo root.
Original meshes/materials. Uses the sanctuary's metres + (X,-Z,Y) Blender adapter.
Exports 4 named, independently anchored modules with one opaque PBR atlas material.
"""
import bpy, math, random, json, hashlib
from pathlib import Path
from mathutils import Vector
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/survivor-camp-prototype/src/assets/sanctuary'
SRC=ROOT/'tools/blender/source'
random.seed(9302)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0
bpy.context.scene.unit_settings.system='METRIC'
bpy.context.scene.unit_settings.scale_length=1
n=512
y,x=np.mgrid[:n,:n];noise=np.random.default_rng(9302).random((n,n))
# wood, aged bronze, charcoal linen, parchment; atlas has baked grain/weave.
colors=np.array([(75,44,23),(120,94,47),(38,42,43),(209,185,134)])/255
ident=(x//256)+(y//256)*2
factor=.86+noise*.19+np.sin(x*.19+np.sin(y*.04)*3)*.06
factor[ident==2]=(.82+noise*.12+((x%3==0)|(y%3==0))*.12)[ident==2]
factor[ident==3]=(.92+noise*.06+np.sin(x*.04)*np.sin(y*.027)*.04)[ident==3]
rgba=np.ones((n,n,4),dtype=np.float32);rgba[:,:,:3]=colors[ident]*factor[:,:,None]
image=bpy.data.images.new('Voting props grain and linen',width=n,height=n,alpha=True)
image.pixels.foreach_set(rgba.ravel());image.filepath_raw=str(SRC/'voting-props-atlas.png');image.file_format='PNG';image.save();image.pack()
mat=bpy.data.materials.new('Voting_Props_Atlas');mat.use_nodes=True;mat.use_backface_culling=True
p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.84
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
attr=mat.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='Wear'
mix=mat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
mat.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);mat.node_tree.links.new(attr.outputs['Color'],mix.inputs[2]);mat.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
parts=[];modules=[]
def mesh(name,verts,faces,tile=0,smooth=True,tint=1):
 m=bpy.data.meshes.new(name);m.from_pydata([(a,-c,b) for a,b,c in verts],[],faces);m.update()
 o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);m.materials.append(mat)
 col=m.color_attributes.new(name='Wear',type='FLOAT_COLOR',domain='CORNER');uv=m.uv_layers.new(name='AtlasUV')
 mins=[min(v.co[k] for v in m.vertices) for k in range(3)];spans=[max(v.co[k] for v in m.vertices)-mins[k] for k in range(3)]
 for f in m.polygons:
  f.use_smooth=smooth
  axis=max(range(3),key=lambda k:abs(f.normal[k]));a,b=[k for k in range(3) if k!=axis]
  for li in f.loop_indices:
   v=m.vertices[m.loops[li].vertex_index].co
   u=(v[a]-mins[a])/max(.001,spans[a]);w=(v[b]-mins[b])/max(.001,spans[b])
   uv.data[li].uv=((tile%2+.035+u*.93)/2,(tile//2+.035+w*.93)/2)
   c=tint*(.85+random.random()*.15);col.data[li].color=(c,c,c,1)
 parts.append(o);return o

def lathe(profile,tile=0,seg=48,mapper=lambda p:p,tint=1):
 v=[mapper((r*math.cos(j*math.tau/seg),h,r*math.sin(j*math.tau/seg))) for r,h in profile for j in range(seg)]
 f=[]
 for i in range(len(profile)-1):
  for j in range(seg):
   a=i*seg+j;b=i*seg+(j+1)%seg
   f.append((a,a+seg,b+seg,b))
 return mesh('Turned hollow vessel',v,f,tile,True,tint)

def tube(points,r=.01,tile=1,sides=6,tint=1):
 v=[];f=[]
 for i,p in enumerate(points):
  d=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)]);d.normalize();u=d.cross(Vector((0,1,0)))
  if u.length<.1:u=d.cross(Vector((1,0,0)))
  u.normalize();w=d.cross(u).normalized()
  for j in range(sides):v.append(tuple(Vector(p)+r*(math.cos(j*math.tau/sides)*u+math.sin(j*math.tau/sides)*w)))
  if i:
   for j in range(sides):
    a=(i-1)*sides+j;b=(i-1)*sides+(j+1)%sides;f.append((a,b,b+sides,a+sides))
 return mesh('Raised carving',v,f,tile,True,tint)

def ring(radius,h,r=.01,tile=1,offset=(0,0,0)):
 return tube([(offset[0]+radius*math.cos(i*math.tau/48),h+offset[1],offset[2]+radius*math.sin(i*math.tau/48)) for i in range(49)],r,tile)

def finish(name):
 global parts
 bpy.ops.object.select_all(action='DESELECT')
 for p in parts:p.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.select_set(False);modules.append(o);parts=[]

# Hollow urn: a complete inner wall, open .55m clear mouth, removable lid rests beside.
profile=[(.04,0),(.27,0),(.29,.05),(.34,.14),(.38,.32),(.35,.53),(.30,.65),(.30,.73),(.275,.75),(.265,.72),(.265,.65),(.31,.5),(.33,.32),(.28,.15),(.22,.07),(.04,.07)]
lathe(profile,0)
for h,rad in [(.07,.29),(.14,.34),(.60,.32),(.72,.30)]:ring(rad,h,.015)
for j in range(12):
 a=j*math.tau/12
 pts=[((.355+.014*math.sin(t*math.pi))*math.cos(a+.12*math.sin(t*math.pi)),.18+t*.37,(.355+.014*math.sin(t*math.pi))*math.sin(a+.12*math.sin(t*math.pi))) for t in [k/16 for k in range(17)]]
 tube(pts,.012)
 # Each bronze leaf is an original lotus-inspired flourish, not a season replica.
for side in [-1,1]:
 tube([(side*(.33+.17*math.sin(i*math.pi/20)),.42+.15*math.cos(i*math.pi/20),0) for i in range(21)],.025)
lathe([(.005,.01),(.32,.01),(.34,.04),(.26,.095),(.07,.14),(.005,.14)],1,48,lambda p:(p[0]*.259-p[1]*.966+.46,p[0]*.966+p[1]*.259+.34,p[2]-.05))
finish('voting_urn')

# Carved dark tiki-like marker body and uncapped black nib. Cap rests adjacent.
axis=lambda p:(p[1]-.22,p[0],p[2])
lathe([(.002,0),(.035,0),(.045,.04),(.05,.08),(.06,.14),(.065,.32),(.08,.39),(.065,.46),(.002,.48)],0,40,axis)
lathe([(.003,-.07),(.018,-.045),(.023,0)],2,24,axis,.12)
for h in [.06,.09,.13,.34,.37,.43]:
 tube([(h-.22,.064*math.cos(j*math.tau/32),.064*math.sin(j*math.tau/32)) for j in range(33)],.007,0)
# Face relief above barrel: brow/eyes, angular nose and mouth bars.
for sign in [-1,1]:
 tube([(.14,.064,sign*.015),(.13,.081,sign*.037),(.09,.079,sign*.038),(.075,.065,sign*.016)],.009,0)
 tube([(.005,.063,sign*.02),(.025,.083,0),(.07,.067,0)],.01,0)
for xx in [-.065,-.045,-.025]:tube([(xx,.052,-.037),(xx,.07,0),(xx,.052,.037)],.006,0)
lathe([(.003,0),(.055,0),(.06,.02),(.06,.14),(.054,.16),(.003,.16)],0,32,lambda p:(p[1]+.13,p[0]-.015,p[2]+.16))
finish('voting_pen')

# Heavy charcoal cloth pouch, flattened contact base, deep radial folds and open neck.
seg=64;layers=23;v=[];f=[]
for i in range(layers):
 t=i/(layers-1);h=.015+t*.44
 rad=.24*math.sin((.15+t*.85)*math.pi*.9)+.045
 if t>.72:rad=.15+(t-.72)*.16
 for j in range(seg):
  a=j*math.tau/seg;fold=(.014+.018*t)*math.sin(a*13+t*1.7)+.007*math.sin(a*21-t*4)
  rr=rad+fold
  v.append((rr*math.cos(a),h+.012*math.sin(a*7)*t,rr*.8*math.sin(a)))
 if i:
  for j in range(seg):
   a=(i-1)*seg+j;b=(i-1)*seg+(j+1)%seg;f.append((a,a+seg,b+seg,b))
f.append(tuple(range(seg-1,-1,-1)))
mesh('Folded dark linen',v,f,2)
ring(.168,.363,.012,0)
tube([(.16,.36,0),(.25,.3,.03),(.28,.23,.06),(.27,.1,.07)],.007,0)
tube([(.16,.36,0),(.30,.32,-.03),(.32,.18,-.07),(.29,.07,-.1)],.007,0)
for side in [-1,1]:
 tube([(side*(.17+.035*math.sin(k*math.pi/20)),.02+k*.018,.07) for k in range(21)],.003,1)
# A few rolled papers visible below the lip, no random draws or gameplay logic.
for x,z,h in [(-.075,0,.36),(.035,-.055,.34),(.055,.05,.38)]:
 lathe([(.027,.18),(.027,h),(.019,h),(.019,.18)],3,20,lambda p:(p[0]+x,p[1],p[2]+z))
finish('shot_dark_bag')

# Two-sided parchment with irregular edge, slight edge curl and visible thickness.
nx,nz=24,16;v=[];f=[]
for layer in [0,1]:
 for j in range(nz+1):
  for i in range(nx+1):
   x=(i/nx-.5)*.77;z=(j/nz-.5)*.52
   edge=max(abs(x)/.385,abs(z)/.26)
   h=max(0,(edge-.75))**2*.50+.0015*math.sin(x*24+z*12)-layer*.006
   if i in [0,nx]:x+=.006*math.sin(j*3.1)
   if j in [0,nz]:z+=.005*math.sin(i*4.3)
   v.append((x,h,z))
size=(nx+1)*(nz+1)
for layer in [0,1]:
 for j in range(nz):
  for i in range(nx):
   a=layer*size+j*(nx+1)+i;b=a+1;c=b+nx+1;d=c-1
   f.append((a,d,c,b) if layer==0 else (a,b,c,d))
perimeter=list(range(nx+1))+[j*(nx+1)+nx for j in range(1,nz+1)]+[nz*(nx+1)+i for i in range(nx-1,-1,-1)]+[j*(nx+1) for j in range(nz-1,0,-1)]
for i,a in enumerate(perimeter):
 b=perimeter[(i+1)%len(perimeter)];f.append((a,b,b+size,a+size))
mesh('Curled aged paper',v,f,3)
finish('parchment')

bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'voting-props.blend'))
bpy.ops.object.select_all(action='SELECT')
path=OUT/'voting-props.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color="ACTIVE",export_all_vertex_colors=True,export_cameras=False,export_lights=False)
manifest={'generator':'tools/blender/voting_props.py','blender':bpy.app.version_string,'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'seed':9302,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'modules':{o.name:sum(len(p.vertices)-2 for p in o.data.polygons) for o in modules},'textureSize':512,'materials':1,'urnOpeningDiameter':.53,'foldedBallotSize':[.35,.008,.25]}
(OUT/'voting-props.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))
