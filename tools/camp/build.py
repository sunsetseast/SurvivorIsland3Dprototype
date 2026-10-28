"""Blender production of scanned Camp assets; no mathematical cliff generator.
blender -b --python tools/camp/build.py -- /tmp/tonsai-production/sources
Retains scan relief/UVs; creates near/far geometry, bounds and provenance manifest.
"""
import bpy, json, sys, hashlib, bmesh, math
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
SRC=Path(sys.argv[sys.argv.index('--')+1])
OUT=ROOT/'artifacts/survivor-camp-prototype/src/assets/camp'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
report=[]

def apply(o,modifier):
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.modifier_apply(modifier=modifier.name)

def optimize(o,budget):
    bm=bmesh.new();bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00003)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    tri=sum(len(p.vertices)-2 for p in o.data.polygons)
    if tri>budget:
        d=o.modifiers.new('production LOD','DECIMATE');d.ratio=budget/tri;apply(o,d)
    t=o.modifiers.new('export triangles','TRIANGULATE');apply(o,t)
    for p in o.data.polygons:p.use_smooth=True

def export(name,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),use_selection=True,export_format='GLB',export_yup=True,export_image_format='AUTO')
    for o in objects:
        report.append({'mesh':o.name,'triangles':len(o.data.polygons),'bounds':[list(min(v[i] for v in o.bound_box) for i in range(3)), list(max(v[i] for v in o.bound_box) for i in range(3))]})
    report.append({'file':name+'.glb','bytes':(OUT/(name+'.glb')).stat().st_size,'sha256':hashlib.sha256((OUT/(name+'.glb')).read_bytes()).hexdigest()})

# Small, genuinely volumetric scanned rock. Preserve original proportions.
bpy.ops.import_scene.gltf(filepath=str(SRC/'boulder_01/boulder_01.gltf'))
rock=next(o for o in bpy.context.selected_objects if o.type=='MESH')
bpy.context.view_layer.objects.active=rock;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
rock.rotation_mode='XYZ';rock.rotation_euler.x=math.pi/2;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
coords=[v.co for v in rock.data.vertices]
center=Vector(((min(v.x for v in coords)+max(v.x for v in coords))/2,(min(v.y for v in coords)+max(v.y for v in coords))/2,min(v.z for v in coords)))
for v in rock.data.vertices:v.co-=center
rock.location=(0,0,0);rock.name='limestone-near';optimize(rock,8000)
# Welded scan retains its massive shape; any tiny underside openings are buried.
far=rock.copy();far.data=rock.data.copy();bpy.context.collection.objects.link(far);far.name='limestone-far';optimize(far,2200)
export('limestone',[rock,far])
for o in [rock,far]:o.hide_set(True)

# Scanned coastal tree. Separate material regions before reduction so the
# thin branching silhouette survives independently of high-density leaf faces.
bpy.ops.import_scene.gltf(filepath=str(SRC/'island_tree_02/island_tree_02.gltf'))
tree=next(o for o in bpy.context.selected_objects if o.type=='MESH')
bpy.context.view_layer.objects.active=tree;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
trees=[o for o in bpy.context.selected_objects if o.type=='MESH']
allcoords=[o.matrix_world@v.co for o in trees for v in o.data.vertices]
minz=min(v.z for v in allcoords)
trunk=next(o for o in trees if 'leaves' not in o.data.materials[0].name and 'branches' not in o.data.materials[0].name)
root=[trunk.matrix_world@v.co for v in trunk.data.vertices if (trunk.matrix_world@v.co).z<minz+.16]
center=Vector(((min(v.x for v in root)+max(v.x for v in root))/2,(min(v.y for v in root)+max(v.y for v in root))/2,minz))
parts=[]
def foliage_cards(source,count,name,enlarge):
    """Retopologize complete scanned leaves, never collapse leaves into needles.
    Fit a plane to each original leaf's UVs and retain a distributed subset.
    """
    m=source.data;parent=list(range(len(m.vertices)))
    def find(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    for e in m.edges:
        a,b=e.vertices;parent[find(a)]=find(b)
    groups={}
    for p in m.polygons:groups.setdefault(find(p.vertices[0]),[]).append(p)
    groups=list(groups.values());stride=max(1,len(groups)/count)
    vertices=[];faces=[];uvs=[]
    for i in range(min(count,len(groups))):
        polys=groups[min(len(groups)-1,int(i*stride))];points={}
        for p in polys:
            for li in p.loop_indices:
                vi=m.loops[li].vertex_index;points[vi]=(m.vertices[vi].co[:],m.uv_layers.active.data[li].uv[:])
        xyz=np.array([v[0]for v in points.values()]);uv=np.array([v[1]for v in points.values()])
        if len(xyz)<3:continue
        a=np.column_stack([uv,np.ones(len(uv))]);fit=np.linalg.lstsq(a,xyz,rcond=None)[0]
        lo=uv.min(axis=0);hi=uv.max(axis=0);corners=np.array([[lo[0],lo[1],1],[hi[0],lo[1],1],[hi[0],hi[1],1],[lo[0],hi[1],1]])
        coords=corners@fit;c=coords.mean(axis=0);coords=c+(coords-c)*enlarge
        start=len(vertices);vertices.extend(coords.tolist());uvs.extend(corners[:,:2].tolist());faces.extend([(start,start+1,start+2),(start,start+2,start+3)])
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    uv=data.uv_layers.new(name='scanned-leaf-uv')
    for p in data.polygons:
        for li in p.loop_indices:uv.data[li].uv=uvs[data.loops[li].vertex_index]
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(source.data.materials[0])
    print('Retopologized',len(groups),'leaf islands to',len(faces),'triangles',flush=True)
    return o

for o in trees:
    mat=o.data.materials[0];kind='leaves' if 'leaves' in mat.name else 'branches' if 'branches' in mat.name else 'trunk'
    for v in o.data.vertices:v.co=(o.matrix_world@v.co)-center
    o.matrix_world.identity();o.name='coastal-'+kind+'-near'
    if kind=='leaves':
        o.name='source-leaves'
        rgba=bpy.data.images.load(str(SRC/'island_tree_02/textures/leaves-rgba.png'))
        for node in mat.node_tree.nodes:
            if node.type=='TEX_IMAGE' and node.image and 'leaves_diff'in node.image.name:
                node.image=rgba;mat.node_tree.links.new(node.outputs['Alpha'],mat.node_tree.nodes.get('Principled BSDF').inputs['Alpha'])
        parts.extend([foliage_cards(o,3200,'coastal-leaves-near',3.6),foliage_cards(o,520,'coastal-leaves-far',7.0)])
        o.hide_set(True)
    else:
        optimize(o,2000)
        lo=o.copy();lo.data=o.data.copy();bpy.context.collection.objects.link(lo);lo.name='coastal-'+kind+'-far';optimize(lo,600)
        parts.extend([o,lo])
export('coastal-tree',parts)

# Reuse only the original authored coconut-palm modules, rather than making
# Camp parse the unused Railay canopy/ficus kit on every entry.
bpy.ops.import_scene.gltf(filepath=str(ROOT/'artifacts/survivor-camp-prototype/src/assets/tonsai/botanical.glb'))
palms=[o for o in bpy.context.selected_objects if o.type=='MESH' and o.name.startswith('palm-')]
export('palms',palms)

# Keep a compact editable production source. Source scans can be reacquired.
keep={o.name for o in [rock,far,*parts,*palms]}
for o in list(bpy.data.objects):
    if o.name not in keep:bpy.data.objects.remove(o,do_unlink=True)
bpy.data.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'camp-kit.blend'),compress=True)
(OUT/'build-manifest.json').write_text(json.dumps({'blender':bpy.app.version_string,'assets':report},indent=2))
print(json.dumps(report,indent=2),flush=True)
