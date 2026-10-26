"""Original Thai-inspired fictional sanctuary kit. Run with Blender 4.5 LTS, not system Python.

All author-facing coordinates are Three.js metres: X right, Y up, Z forward.
The adapter writes Blender (X, -Z, Y); glTF's Y-up conversion restores X,Y,Z.
No downloaded meshes, textures, museum photographs or sacred figures are embedded.
"""
import bpy
import math
import json
import random
import hashlib
import sys
from pathlib import Path
from mathutils import Vector
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/survivor-camp-prototype/src/assets/sanctuary'
SOURCE = ROOT / 'tools/blender/source'
SEED = 47921
random.seed(SEED)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 1
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)

PALETTE = [(125,99,68), (115,59,35), (45,61,29), (60,39,24),
           (83,45,28), (115,84,39), (53,82,35), (58,55,45)]
def atlas(name, normal=False):
    n = 1024
    yy, xx = np.mgrid[0:n, 0:n]
    tilex, tiley = xx % 256, yy % 512
    ident = xx // 256 + (yy // 512)*4
    noise = np.random.default_rng(SEED).random((n,n))
    cloud = (np.sin(xx*.043+np.sin(yy*.026)*2)+np.sin(yy*.077+xx*.019))*.09
    veins = np.maximum(0, np.sin(xx*.037+np.sin(yy*.019)*4)-.975)*12
    pores = (noise > .96)*.19
    joint = (((tiley % 33)<2) | (((tilex+(tiley//33%2)*31)%62)<2))
    height = cloud + noise*.065 - veins*.18 - pores
    height -= joint * np.isin(ident,[1,4])*.24
    image = bpy.data.images.new(name, width=n, height=n, alpha=True)
    rgba = np.ones((n,n,4), dtype=np.float32)
    if normal:
        dy, dx = np.gradient(height)
        rgba[:,:,0] = .5-dx*.85
        rgba[:,:,1] = .5-dy*.85
        rgba[:,:,2] = 1
        image.colorspace_settings.name = 'Non-Color'
    else:
        palette=np.array(PALETTE)/255
        rgb=palette[ident]*(.88+cloud[:,:,None]+noise[:,:,None]*.20)
        rgb *= (1-veins[:,:,None]*.24-pores[:,:,None])
        rgb *= (1-(joint*np.isin(ident,[1,4]))[:,:,None]*.42)
        # Damp mineral bloom and irregular moss patches, rather than uniform stripes.
        moss=(np.sin(xx*.025+np.sin(yy*.036)*2)*np.sin(yy*.014)> .67)
        rgb[moss] = rgb[moss]*.72+np.array([.035,.055,.012])
        rgba[:,:,:3]=np.clip(rgb,0,1)
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw=str(SOURCE/(name+'.png'))
    image.file_format='PNG'
    image.save()
    image.pack()
    return image

base, normals = atlas('sanctuary-albedo'), atlas('sanctuary-normal',True)
mat=bpy.data.materials.new('Sanctuary_Atlas_PBR')
mat.use_nodes=True
nodes=mat.node_tree.nodes
p=nodes.get('Principled BSDF')
p.inputs['Roughness'].default_value=.94
p.inputs['Metallic'].default_value=0
tex=nodes.new('ShaderNodeTexImage'); tex.image=base
normaltex=nodes.new('ShaderNodeTexImage'); normaltex.image=normals
nmap=nodes.new('ShaderNodeNormalMap'); nmap.inputs['Strength'].default_value=.38
attr=nodes.new('ShaderNodeVertexColor'); attr.layer_name='Weather'
mix=nodes.new('ShaderNodeMixRGB'); mix.blend_type='MULTIPLY'; mix.inputs[0].default_value=1
mat.node_tree.links.new(tex.outputs['Color'],mix.inputs[1])
mat.node_tree.links.new(attr.outputs['Color'],mix.inputs[2])
mat.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
mat.node_tree.links.new(normaltex.outputs['Color'],nmap.inputs['Color'])
mat.node_tree.links.new(nmap.outputs['Normal'],p.inputs['Normal'])
leafmat=mat.copy(); leafmat.name='Sanctuary_Atlas_Foliage'; leafmat.use_backface_culling=False
mat.use_backface_culling=True

def xyz(p): return (p[0], -p[2], p[1])
parts=[]
def register(o, tile=0, smooth=False):
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.clear(); o.data.materials.append(leafmat if tile==6 else mat)
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='AtlasUV')
    mins=[min(v.co[k] for v in o.data.vertices) for k in range(3)]
    spans=[max(v.co[k] for v in o.data.vertices)-mins[k] for k in range(3)]
    # Per-face world projection with a padded atlas cell, preserving visible material grain.
    for face in o.data.polygons:
        face.use_smooth=smooth
        normal=face.normal
        axis=max(range(3),key=lambda k:abs(normal[k]))
        a,b=[k for k in range(3) if k!=axis]
        for li in face.loop_indices:
            v=o.data.vertices[o.data.loops[li].vertex_index].co
            u=(v[a]-mins[a])/max(.001,spans[a]); w=(v[b]-mins[b])/max(.001,spans[b])
            uv.data[li].uv=((tile%4+.04+u*.92)/4,(tile//4+.025+w*.95)/2)
    # Vertex weathering exported as COLOR_0: soot in high recesses, damp at the foot.
    colors=o.data.color_attributes.new(name='Weather',type='FLOAT_COLOR',domain='CORNER')
    for li,loop in enumerate(o.data.loops):
        v=o.matrix_world @ o.data.vertices[loop.vertex_index].co
        f=.79+.12*math.sin(v.x*3.3+v.y*1.8)*math.sin(v.z*2.2)+random.random()*.07
        colors.data[li].color=(f,f*.98,f*.92,1)
    parts.append(o)
    return o

def mesh(name, verts, faces, tile=0, smooth=False):
    m=bpy.data.meshes.new(name); m.from_pydata([xyz(p) for p in verts],[],faces); m.update()
    o=bpy.data.objects.new(name,m); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    register(o,tile,smooth); o.select_set(False)
    return o

def box(p,s,tile=0,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p))
    o=bpy.context.object; o.scale=(s[0],s[2],s[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Worn arris','BEVEL'); mod.width=bevel; mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return register(o,tile)

def ellipsoid(p,s,tile=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=xyz(p))
    o=bpy.context.object; o.scale=(s[0],s[2],s[1]); return register(o,tile,True)

def tube(points,r=.05,tile=0,sides=7):
    verts=[]; faces=[]
    for i,p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        tangent.normalize(); u=tangent.cross(Vector((0,1,0)))
        if u.length<.1: u=tangent.cross(Vector((1,0,0)))
        u.normalize(); v=tangent.cross(u).normalized()
        rad=r*(1-i/(len(points)-1)*.55)
        for j in range(sides):
            q=Vector(p)+rad*(math.cos(j*math.tau/sides)*u+math.sin(j*math.tau/sides)*v)
            verts.append(tuple(q))
        if i:
            for j in range(sides):
                a=(i-1)*sides+j; b=(i-1)*sides+(j+1)%sides
                faces.append((a,b,b+sides,a+sides))
    faces += [tuple(range(sides-1,-1,-1)),tuple(range((len(points)-1)*sides,len(points)*sides))]
    return mesh('Carved sweep',verts,faces,tile,True)

def lathe(profile,tile=0,segments=32):
    verts=[(r*math.cos(a*math.tau/segments),y,r*math.sin(a*math.tau/segments)) for r,y in profile for a in range(segments)]
    faces=[]
    for i in range(len(profile)-1):
        for j in range(segments):
            a=i*segments+j; b=i*segments+(j+1)%segments
            faces.append((a,b,b+segments,a+segments))
    return mesh('Turned stone',verts,faces,tile,True)

def petal(x,y,z,w,h,tile=0):
    verts=[(x,y,z),(x-w*.6,y+h*.3,z-.02),(x-w*.45,y+h*.7,z),(x,y+h,z+.05),
           (x+w*.45,y+h*.7,z),(x+w*.6,y+h*.3,z-.02),(x,y+h*.42,z+.13)]
    return mesh('Lotus relief',verts,[(i,(i+1)%6,6) for i in range(6)],tile,True)

def begin():
    global parts
    parts=[]

assets=[]
def finish(name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join(); o=bpy.context.object; o.name=name
    # Origin at ground centre for modules; roof origin at eave datum.
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    tri=o.modifiers.new('Runtime triangles','TRIANGULATE'); bpy.ops.object.modifier_apply(modifier=tri.name)
    o['source']='Blender 4.5 LTS / tools/blender/sanctuary.py'; o['decorative']=True
    o.select_set(False); assets.append(o)

def elephant():
    begin()
    # Unified anatomical volume, remeshed in Blender; attached ears/tusks/relief remain legible.
    ellipsoid((0,1.65,.1),(.74,.92,1.15))
    ellipsoid((0,1.95,-.55),(.67,.79,.72))
    ellipsoid((0,2.02,-1.0),(.49,.62,.53))
    for side in [-1,1]:
        ellipsoid((side*.24,2.39,-1.03),(.25,.28,.28))
        for z in [-.66,.84]: ellipsoid((side*.5,.79,z),(.27,.76,.29))
    tube([(0,2,-1.38),(0,1.7,-1.63),(0,1.1,-1.72),(0,.55,-1.8),(.1,.44,-1.99),(.2,.63,-2.06)],.23,sides=12)
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join(); o=bpy.context.object
    mod=o.modifiers.new('Anatomical stone union','REMESH'); mod.mode='VOXEL'; mod.voxel_size=.075
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('Weather softened carving','SMOOTH'); mod.factor=.55; mod.iterations=3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('Mobile sculpture topology','DECIMATE'); mod.ratio=.32
    bpy.ops.object.modifier_apply(modifier=mod.name)
    parts.clear(); register(o,0,True)
    for side in [-1,1]:
        verts=[(side*.42,2.35,-.9),(side*.91,2.3,-.73),(side*1.02,1.95,-.73),(side*.84,1.5,-.82),(side*.5,1.72,-1.0),(side*.66,2.03,-1.03)]
        mesh('Fan ear',verts,[(i,(i+1)%5,5) for i in range(5)],0,True)
        tube([(side*.49,2.3,-.94),(side*.84,2.22,-.83),(side*.88,1.92,-.83),(side*.74,1.67,-.89)],.045,7)
        ellipsoid((side*.4,2.11,-1.37),(.07,.045,.025),7)
        tube([(side*.28,1.75,-1.37),(side*.39,1.46,-1.7),(side*.45,1.55,-1.97)],.067,0)
        # Brow and floral saddle are cut stone details with visible relief depth.
        tube([(side*.18,2.3,-1.43),(side*.35,2.28,-1.42),(side*.45,2.19,-1.29)],.045,0)
        for z in [-.45,-.12,.21,.54]:petal(side*.74,1.55,z,.14,.4,5)
        for z in [-.66,.84]:
            for x in [-.1,0,.1]:ellipsoid((side*.5+x,.22,z-.25),(.045,.065,.035),7)
    tube([(0,2,.98),(.1,1.3,1.27),(.13,.75,1.23)],.065,0)
    box((0,.1,0),(2.35,.2,3.45),1); box((0,.25,0),(2.5,.13,3.58),0)
    # The statue's feet rest on the top of the plinth rather than floating.
    finish('elephant_guardian')

def naga():
    begin()
    box((0,.12,0),(1.35,.24,1.55),1)
    tube([(0,.37,.55),(0,.48,.15),(0,.8,-.12),(0,1.3,-.12),(0,1.85,-.02),(0,2.23,-.17)],.24,0,12)
    verts=[(0,1.05,.02),(-.49,1.32,.10),(-.69,1.85,.13),(-.43,2.35,.04),(0,2.62,-.02),(.43,2.35,.04),(.69,1.85,.13),(.49,1.32,.10),(0,1.87,-.17)]
    mesh('Naga cobra hood',verts,[(i,(i+1)%8,8) for i in range(8)],0,True)
    for side in [-1,1]:
        tube([(0,1.1,.01),(side*.48,1.4,.10),(side*.64,1.9,.13),(side*.4,2.36,.04),(0,2.62,-.02)],.055,0)
        for row in range(5):
            for col in range(2):petal(side*(.17+col*.15),1.3+row*.18,.0,.085,.19,5 if row==4 else 0)
    ellipsoid((0,2.25,-.18),(.21,.17,.33),0)
    box((0,2.17,-.42),(.29,.07,.23),7,.015)
    for side in [-1,1]:ellipsoid((side*.17,2.32,-.35),(.035,.035,.035),7)
    finish('naga_terminal')

def roof():
    begin()
    for width,length,y,rise in [(8.4,8.5,0,2),(5.4,6.7,1.7,1.4)]:
        def h(t):return y+rise*(1-t)**1.6+.30*t**8
        for side in [-1,1]:
            verts=[]; faces=[]
            for i in range(15):
                t=i/14
                for end in [-1,1]:verts.append((side*t*width/2,h(t),end*length/2))
                if i:
                    a=(i-1)*2
                    faces.append((a,a+1,a+3,a+2) if side==1 else (a+2,a+3,a+1,a))
            mesh('Curved tiled roof',verts,faces,4)
            # Individual terracotta tile ribs produce close-view parallax, all joined on export.
            for j in range(29):
                z=-length/2+j*length/28
                tube([(side*t*width/2,h(t)+.025,z) for t in [i/10 for i in range(11)]],.025,4,5)
            for end in [-1,1]:
                tube([(side*t*width/2,h(t)+.075,end*length/2) for t in [i/14 for i in range(15)]],.085,5)
                tube([(side*width/2,y+.3,end*length/2),(side*(width/2+.16),y+.65,end*length/2),(side*(width/2+.22),y+1.03,end*(length/2+.15))],.09,0)
                for j in range(1,10):
                    t=j/10
                    petal(side*t*width/2,h(t)+.1,end*length/2,.07,.24,5)
        for end in [-1,1]:
            tube([(0,y+rise,end*length/2),(0,y+rise+.43,end*(length/2+.08)),(0,y+rise+.9,end*(length/2+.38)),(0,y+rise+1.12,end*(length/2+.6))],.105,0)
            # Recessed gable panel with pierced-looking layered lotus relief.
            z=end*(length/2-.3)
            mesh('Gable tympanum',[(-width*.36,y+.2,z),(width*.36,y+.2,z),(0,y+rise-.1,z)],[(0,1,2) if end>0 else (2,1,0)],3)
            for j in range(-4,5):
                petal(j*.3,y+.3,z+end*.03,.16,max(.2,rise-.6-abs(j)*.18),5)
            for j in range(-4,5):
                tube([(j*.3,y+.4,z),(j*.2,y+rise*.55,z+end*.08),(0,y+rise-.18,z)],.025,5,5)
        tube([(0,y+rise,-length/2),(0,y+rise,length/2)],.09,5)
    finish('voting_roof')

def column():
    begin()
    for i in range(3):box((0,.12+i*.19,0),(1.6-i*.16,.23,1.6-i*.16),1 if i%2 else 0)
    for i in range(7):
        o=box((0,.84+i*.38,0),(.83,.36,.83),0,.055)
        o.rotation_euler.z=(random.random()-.5)*.035
    for y in [.72,2.92,3.12]:box((0,y,0),(1.06,.16,1.06),0)
    for side in [-1,1]:
        for y in [1,1.55,2.1]:petal(side*.23,y,-.455,.15,.36,5)
    tube([(.28,3.3,.3),(.5,2.1,.32),(.45,1.05,.45),(.65,.2,.6),(1.15,.035,.75)],.13,3)
    for i in range(8):petal(.49,2.9-i*.31,.38,.13,.19,6)
    finish('root_column')

def urn():
    begin()
    lathe([(.0,0),(.3,.04),(.28,.12),(.45,.35),(.48,.65),(.35,.88),(.27,.95),(.27,1.02),(.21,1.02),(.21,.94),(.27,.86),(.35,.64),(.33,.3),(.12,.14),(0,.14)],1)
    for y,r in [(.12,.29),(.82,.37),(.99,.28)]:
        tube([(r*math.cos(i*math.tau/32),y,r*math.sin(i*math.tau/32)) for i in range(33)],.025,5)
    for side in [-1,1]:tube([(side*.38,.7,0),(side*.61,.78,0),(side*.57,.45,0),(side*.45,.43,0)],.065,1)
    finish('ceremonial_urn')

def rubble():
    begin()
    for i in range(9):
        x=random.uniform(-1,1); z=random.uniform(-.7,.7)
        o=box((x,.12+random.random()*.13,z),(.4+random.random()*.5,.25,.34),1 if i%3 else 0)
        o.rotation_euler.z=random.random()*3
    for i in range(4):petal(-.5+i*.25,.23,-.1,.12,.25,0)
    tube([(-1,.02,.4),(-.3,.3,.1),(.4,.23,0),(1.2,.02,-.4)],.09,3)
    finish('fallen_relief')

def fern():
    begin()
    for k in range(9):
        a=k*2.4; length=.8+(k%3)*.2
        def p(t,off=0):return (math.sin(a)*length*t+math.cos(a)*off,math.sin(t*math.pi)*.44+.06,math.cos(a)*length*t-math.sin(a)*off)
        tube([p(i/8) for i in range(9)],.012,2,4)
        for i in range(1,9):
            t=i/10; w=math.sin(t*math.pi)*.23
            for side in [-1,1]:
                mesh('Fern pinnule',[p(t),p(t+.1,side*w*.7),p(t+.04,side*w),p(t-.025,side*w*.5)],[(0,1,2),(0,2,3)],6,True)
    finish('fern_cluster')

def vine():
    begin()
    points=[(.08*math.sin(i*.8),-i*.18,.06*math.cos(i*.7)) for i in range(20)]
    tube(points,.026,3,5)
    for i in range(1,19):
        x,y,z=points[i]; side=(-1)**i
        mesh('Heart leaf',[(x,y,z),(x+side*.19,y+.035,z+.035),(x+side*.25,y-.16,z+.04),(x+side*.06,y-.12,z+.035)],[(0,1,2),(0,2,3)],6,True)
    finish('hanging_vine')

def relief():
    begin()
    box((0,.6,0),(2.65,1.2,.28),1)
    for y in [.08,1.12]:box((0,y,-.19),(2.8,.13,.16),0)
    for j in range(-4,5):petal(j*.28,.21,-.21,.17,.71,0)
    for j in range(-4,5):
        tube([(j*.28,.2,-.28),(j*.28+.13,.5,-.32),(j*.28,.94,-.27)],.025,5,5)
    finish('lotus_relief')

for maker in [elephant,naga,roof,column,urn,rubble,fern,vine,relief]:maker()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'sanctuary-kit.blend'),compress=True)

def export(filename):
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',export_yup=True,
        export_apply=True,export_animations=False,export_extras=True,export_texcoords=True,
        export_normals=True,export_materials='EXPORT',export_image_format='AUTO',
        export_attributes=False,export_vertex_color='NAME',export_vertex_color_name='Weather',export_all_vertex_colors=False)

export('sanctuary-kit.glb')
for o in assets:
    if o.name not in ['fern_cluster','hanging_vine','lotus_relief']:
        bpy.context.view_layer.objects.active=o
        mod=o.modifiers.new('Low quality topology','DECIMATE'); mod.ratio=.48
        bpy.ops.object.modifier_apply(modifier=mod.name)
        tri=o.modifiers.new('Low triangles','TRIANGULATE'); bpy.ops.object.modifier_apply(modifier=tri.name)
base.scale(512,512)
normals.scale(512,512)
export('sanctuary-kit-low.glb')

manifest={'schema':1,'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'blender':bpy.app.version_string,'seed':SEED,'units':'metres','up':'Y',
          'origin':'ground centre; roof eave datum; vine top attachment',
          'authoring':'Original meshes generated and exported by Blender; no external art',
          'atlases':{'count':2,'size':1024,'channels':['sRGB albedo','tangent-space normal']},
          'assets':[o.name for o in assets], 'files':{}}
for f in sorted(OUT.glob('*.glb')):
    data=f.read_bytes(); manifest['files'][f.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('SANCTUARY_EXPORT',json.dumps(manifest))
