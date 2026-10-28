"""Original Blender botanical assets with distinct branch/crown architectures.
MIT original. Geometry cards share one original leaf atlas. Runtime instances
these meshes; this source .blend is never downloaded by the browser.
"""
import bpy,math,random,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/survivor-camp-prototype/src/assets/tonsai'
bpy.ops.wm.read_factory_settings(use_empty=True)
def mesh(name,ps,fs,uv=None,colors=None,normals=None):
 m=bpy.data.meshes.new(name);m.from_pydata(ps,[],fs);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o)
 for f in m.polygons:f.use_smooth=True
 if uv:
  layer=m.uv_layers.new(name='leaf-atlas')
  for f in m.polygons:
   for li in f.loop_indices:layer.data[li].uv=uv[m.loops[li].vertex_index]
 if colors:
  a=m.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
  for i,c in enumerate(colors):a.data[i].color=c
  m.color_attributes.active_color=a
 if normals:m.normals_split_custom_set_from_vertices(normals)
 return o
woodmat=bpy.data.materials.new('bark');woodmat.diffuse_color=(.27,.21,.14,1)
leafmat=bpy.data.materials.new('leaf');leafmat.use_nodes=True;n=leafmat.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='COLOR_0';leafmat.node_tree.links.new(n.outputs['Color'],leafmat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
modules=[]
for kind in ['canopy','ficus','palm']:
 for variant in range(3):
  for detail in [True,False]:
   r=random.Random(1741+variant*817+len(kind)*23);ps=[];fs=[];lp=[];lf=[];uv=[];cols=[];normals=[]
   def limb(a,b,r0,r1,sides=6):
    a=Vector(a);b=Vector(b);di=(b-a).normalized();a-=di*.025;b+=di*.025;u=di.cross(Vector((0,0,1)))
    if u.length<.01:u=di.cross(Vector((1,0,0)))
    u.normalize();v=di.cross(u);start=len(ps)
    for p,rad in [(a,r0),(b,r1)]:
     for i in range(sides):ps.append(tuple(p+rad*(u*math.cos(i*math.tau/sides)+v*math.sin(i*math.tau/sides))))
    for i in range(sides):
     j=(i+1)%sides;fs.extend([(start+i,start+j,start+sides+i),(start+j,start+sides+j,start+sides+i)])
   def card(p,width,height,angle,tilt,cell,shade):
    p=Vector(p);u=Vector((math.cos(angle),math.sin(angle),0))*width*.5
    v=Vector((-math.sin(angle)*math.sin(tilt),math.cos(angle)*math.sin(tilt),math.cos(tilt)))*height*.5
    mid=len(lp)
    # Bent 4-triangle card; the curved surface catches light as foliage volume.
    for a,b in [(-1,-1),(1,-1),(1,1),(-1,1),(0,0)]:
     q=p+u*a+v*b; q.z+=.12 if a==0 else 0;lp.append(tuple(q))
     uv.append(((cell%2+(a+1)*.5)*.5,(cell//2+(b+1)*.5)*.5))
     cols.append((shade*.94,shade,shade*.84,1));n=Vector((q.x*.04,q.y*.04,.6+(q.z/24)*.4)).normalized();normals.append(tuple(n))
    for i in range(4):lf.append((mid+i,mid+(i+1)%4,mid+4))
   if kind!='palm':
    ficus=kind=='ficus';h=(13 if ficus else 20)+variant*1.6;spread=(11 if ficus else 8.5)+variant
    fork=Vector((.6-variant*.5,.5,h*.42));base=Vector((0,0,0))
    for seg in range(5 if detail else 2):
     steps=5 if detail else 2;a=seg/steps;b=(seg+1)/steps;limb(fork*a+Vector((math.sin(a*3)*.45,0,0)),fork*b+Vector((math.sin(b*3)*.45,0,0)),(.95 if ficus else .55)*(1-a*.6),(.95 if ficus else .55)*(1-b*.6),8)
    if detail:
     for root in range(7 if ficus else 4):
      angle=root*2.399+variant;end=Vector((math.cos(angle)*(3.7 if ficus else 2.3),math.sin(angle)*(3.7 if ficus else 2.3),.05));limb(Vector((0,0,2.5)),end,.29,.04)
    for branch in range(10 if detail else 6):
     angle=branch*2.399+variant*.6;reach=spread*(.45+r.random()*.6);end=Vector((math.cos(angle)*reach,math.sin(angle)*reach,h+r.uniform(-4.5,2)))
     elbow=fork.lerp(end,.53)+Vector((0,0,-1.5));limb(fork,elbow,.25 if ficus else .19,.12,6 if detail else 4);
     if detail:limb(elbow,end,.12,.025)
     if ficus and detail and branch%3==0:limb(elbow,Vector((elbow.x,elbow.y,.1)),.055,.07,5)
     # Nested twigs create an open asymmetric canopy with visible crown gaps.
     for twig in range(5 if detail else 2):
      ta=angle+twig*1.7;tip=end+Vector((math.cos(ta)*r.uniform(.8,2.8),math.sin(ta)*r.uniform(.8,2.8),r.uniform(-1.2,2)))
      if detail:limb(end,tip,.035,.008,5)
      for leaf in range(8 if detail else 2):
       p=tip+Vector((r.uniform(-1.3,1.3),r.uniform(-1.3,1.3),r.uniform(-.7,.7)))
       card(p,(3.3+r.random()*.9) if detail else (6.2+r.random()),(3.2+r.random()) if detail else (5.8+r.random()),r.random()*math.tau,r.uniform(.25,1.4),r.randrange(4),.66+.3*max(0,(p.z-h+5)/7))
   else:
    h=14+variant*2;lean=1.8+variant*.9
    def trunk(t):return Vector((lean*t*t,math.sin(t*2.2)*.35,h*t))
    for j in range(12 if detail else 7):
     steps=12 if detail else 7;a=j/steps;b=(j+1)/steps;limb(trunk(a),trunk(b),.29*(1-a*.3),.29*(1-b*.3),8 if detail else 6)
    crown=trunk(1)
    for frond in range(19+variant):
     a=frond*2.399+r.random()*.3;length=5.4+r.random()*1.9;drop=2.7+r.random()*2.5
     def at(t):return crown+Vector((math.cos(a)*length*t,math.sin(a)*length*t,2.7*math.sin(t*math.pi)-drop*t*t))
     for j in range(5):limb(at(j/5),at((j+1)/5),.027*(1-j/6),.008,4)
     pairs=22 if detail else 10
     for j in range(1,pairs+1):
      t=j/(pairs+1);p=at(t);span=(.17+math.sin(t*math.pi)**.7)*1.1
      for s in [-1,1]:
       end=p+Vector((math.cos(a+s*1.12)*span+math.cos(a)*.3,math.sin(a+s*1.12)*span+math.sin(a)*.3,-.3-.3*t));d=end-p;side=Vector((-math.sin(a)*.065,math.cos(a)*.065,0));mid=len(lp)
       for q in [p,p.lerp(end,.5)+side,end,p.lerp(end,.5)-side]:lp.append(tuple(q));uv.append((0,0));cols.append((.31+r.random()*.15,.49+r.random()*.16,.12+r.random()*.06,1));normals.append((0,0,1))
       lf.extend([(mid,mid+1,mid+2),(mid,mid+2,mid+3)])
   level='near' if detail else 'far'
   for suffix,p,f in [('wood',ps,fs),('leaves',lp,lf)]:
    o=mesh(f'{kind}-{variant}-{level}-{suffix}',p,f,uv if suffix=='leaves' else None,cols if suffix=='leaves' else None,normals if suffix=='leaves' else None);o.data.materials.append(leafmat if suffix=='leaves' else woodmat);modules.append({'name':o.name,'triangles':len(f)})
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'tools/blender/source/tonsai-botanical.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'botanical.glb'),export_format='GLB',export_yup=True,export_materials='EXPORT')
(OUT/'botanical-manifest.json').write_text(json.dumps({'license':'MIT original','generator':'tools/blender/botanical-hero.py','modules':modules,'sha256':hashlib.sha256((OUT/'botanical.glb').read_bytes()).hexdigest()},indent=2));print('Botanical GLB', (OUT/'botanical.glb').stat().st_size,flush=True)
