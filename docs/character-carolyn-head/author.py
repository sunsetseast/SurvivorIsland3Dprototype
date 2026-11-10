"""Author and render the editable Carolyn head study with Blender 4.3."""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

base, output = map(Path, sys.argv[sys.argv.index("--") + 1:])
output = output.resolve()
output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, roughness, color_layer=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Specular IOR Level"].default_value = 0.32
    if color_layer:
        node = mat.node_tree.nodes.new("ShaderNodeVertexColor")
        node.layer_name = color_layer
        mat.node_tree.links.new(node.outputs["Color"], shader.inputs["Base Color"])
    return mat, shader


def finish(obj, mat):
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True


def paint(obj, colors):
    layer = obj.data.color_attributes.new(name="Tint", type="FLOAT_COLOR", domain="POINT")
    for element, color in zip(layer.data, colors):
        element.color = (*color, 1)


def mesh(name, vertices, faces, mat, colors=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    finish(obj, mat)
    if colors is not None:
        paint(obj, colors)
    return obj


def patch(x, y, z, center_x, center_z, width, height):
    front = max(0, min(1, (-y - 0.35) / 0.65))
    return front * math.exp(-0.5 * (((x-center_x)/width)**2 + ((z-center_z)/height)**2))


skin, shader = material("Skin | warm cheek planes", (0.43, 0.23, 0.14), 0.51, "Tint")
shader.inputs["Subsurface Weight"].default_value = 0.078
shader.inputs["Subsurface Scale"].default_value = 0.09
shader.inputs["Subsurface Radius"].default_value = (1.0, 0.49, 0.28)

with bpy.data.libraries.load(str(base.resolve())) as (_, dst):
    dst.objects = ["GEO-head_animation_realistic"]
head = dst.objects[0]
bpy.context.collection.objects.link(head)
head.name = "Carolyn | standalone facial topology"
head.location = (0, 0, 0)
head.scale = (1, 1, 1)
for vertex in head.data.vertices:
    vertex.co *= 10
finish(head, skin)
head.shape_key_add(name="Basis")
planes = head.shape_key_add(name="Cranium, cheekbones, jaw and nose")
expression = head.shape_key_add(name="Mouth corners and eye asymmetry")
skin_colors = []
for vertex in head.data.vertices:
    x, y, z = vertex.co
    side = 1 if x > 0 else -1
    chin = patch(x,y,z,0,1.91,.42,.27)
    cheek = patch(x,y,z,side*.55,2.62,.17,.19)
    lower = patch(x,y,z,side*.48,2.27,.19,.23)
    bridge = patch(x,y,z,0,2.88,.19,.30)
    tip = patch(x,y,z,0,2.68,.12,.10)
    lip = patch(x,y,z,0,2.20,.45,.20)
    corner = patch(x,y,z,side*.36,2.22,.10,.12)
    lid = patch(x,y,z,side*.37,3.10,.17,.145)
    brow = patch(x,y,z,side*.39,3.26,.22,.095)
    upper_lid = patch(x,y,z,side*.36,3.171,.115,.051)
    lower_lid = patch(x,y,z,side*.36,3.025,.115,.047)
    taper = 1 - .10*math.exp(-((z-2.01)/.43)**2) - .030*math.exp(-((z-3.58)/.53)**2)
    planes.data[vertex.index].co = (
        x*taper + side*(.05*cheek - .04*lower),
        y - .080*cheek + .039*lower + .060*tip - .023*bridge - .040*chin,
        z - .043*chin + .040*tip + .017*cheek,
    )
    expression.data[vertex.index].co = (
        x + x*.18*lip,
        y - .038*lip - .020*corner - .013*brow,
        z + corner*(.088 if side > 0 else .053) + side*(.012*lid + .027*brow)
        - .033*upper_lid + .017*lower_lid,
    )
    rgb = Vector((.432,.224,.137))
    rgb += Vector((.045,-.015,-.013))*cheek
    rgb -= Vector((.078,.054,.036))*lid
    rgb = rgb.lerp(Vector((.238,.083,.052)), .22*upper_lid)
    arc = max(0, 1-(x/.33)**2)
    lip_y = 2.198 + .04*(x/.33)**2
    if y < -1.18 and arc > 0:
        pigment = max(0, 1-(abs(z-lip_y)/(.105*arc))**3)
        rgb = rgb.lerp(Vector((.352,.115,.082)), .78*pigment)
    skin_colors.append(tuple(rgb))
planes.value = expression.value = 1
paint(head, skin_colors)
subdiv = head.modifiers.new("Editable subdivision", "SUBSURF")
subdiv.levels = subdiv.render_levels = 2
bpy.context.view_layer.update()
face_bvh = BVHTree.FromObject(head, bpy.context.evaluated_depsgraph_get())


def samples(controls, steps):
    points = [Vector(point) for point in controls]
    for i in range(len(points) - 1):
        a, b = points[max(0,i-1)], points[i]
        c, d = points[i+1], points[min(len(points)-1,i+2)]
        for j in range(steps):
            t = j / steps
            yield (b*2 + (c-a)*t + (a*2-b*5+c*4-d)*t*t + (-a+b*3-c*3+d)*t**3)*.5
    yield points[-1]


def surface_strip(name, points, mat, lift):
    vertices, faces = [], []
    for i, (x, z, width) in enumerate(samples(points, 6)):
        for j in range(5):
            w = (j-2)/2
            height = z + w*width
            hit, _, _, _ = face_bvh.ray_cast((x,-4,height), (0,1,0))
            vertices.append((x, hit.y - .004 - lift*(1-w*w), height))
            if i and j:
                k = i*5+j
                faces.append((k-6,k-1,k,k-5))
    mesh(name, vertices, faces, mat)


brow, _ = material("Brows | cool brown", (.068,.030,.016), .68)
surface_strip("Left eyebrow | raised arch", [
    (.168,3.249,.012),(.27,3.294,.042),(.42,3.345,.036),(.51,3.334,.023),(.655,3.228,.001),
], brow, .011)
surface_strip("Right eyebrow | lower arch", [
    (-.168,3.229,.013),(-.27,3.267,.037),(-.42,3.305,.032),(-.52,3.280,.023),(-.644,3.194,.001),
], brow, .011)

sclera, _ = material("Sclera | soft ivory", (.61,.54,.47), .30)
iris, _ = material("Iris | slate blue", (.10,.17,.20), .23, "Tint")
for side in (-1, 1):
    center = Vector((side*.356, -1.159, 3.096 + side*.015))
    rx, ry, rz = .171, .147, .163
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=1, location=center)
    eye = bpy.context.object
    eye.name = f"Fitted sclera {side:+}"
    eye.scale = (rx, ry, rz)
    finish(eye, sclera)
    rings = [
        (.0002,(.006,.006,.006)),(.027,(.008,.008,.008)),(.031,(.022,.030,.032)),
        (.041,(.13,.22,.25)),(.053,(.09,.16,.21)),(.065,(.045,.082,.105)),
        (.072,(.018,.027,.033)),
    ]
    vertices, faces, colors = [], [], []
    count = 48
    for j, (radius, color) in enumerate(rings):
        for i in range(count):
            angle = math.tau * i / count
            x = -.012 + radius*math.cos(angle)
            z = .006 + radius*math.sin(angle)
            y = -ry*math.sqrt(1-(x/rx)**2-(z/rz)**2)
            vertices.append(tuple(center + Vector((x,y-.003,z))))
            value = 1 + .13*math.cos(19*angle+j) if 2 < j < 6 else 1
            colors.append(tuple(value*c for c in color))
            if j:
                k = j*count+i
                n = j*count+(i+1)%count
                faces.append((k-count,n-count,n,k))
    mesh(f"Iris and pupil {side:+}", vertices, faces, iris, colors)

hair, shader = material("Groom | ash roots and blonde waves", (.56,.35,.16), .39, "Tint")
shader.inputs["Coat Weight"].default_value = .09
shader.inputs["Coat Roughness"].default_value = .42


def lock(name, controls, tone, root=.51):
    # The control points hold position, width and depth for each sculpted mass.
    path = list(samples(controls, 6))
    vertices, faces, colors = [], [], []
    sides = 20
    for j, control in enumerate(path):
        center = Vector(control[:3])
        direction = Vector(path[min(j+1,len(path)-1)][:3]) - Vector(path[max(j-1,0)][:3])
        along = direction.normalized()
        lateral = along.cross(Vector((0,1,0))).normalized()
        thickness = along.cross(lateral)
        length = j / (len(path)-1)
        width, depth = max(.006,control[3]), max(.006,control[4])
        if "wave" in name or "fall" in name:
            width *= .87
            depth *= .72
        color_scale = tone * (root + (1-root)*min(1,length*4.5))
        for i in range(sides):
            a = math.tau*i/sides
            relief = 1+.047*math.sin(7*a+.6*length)+.041*math.cos(4*a)
            vertices.append(tuple(center + lateral*(width*math.cos(a)*relief)
                                  + thickness*(depth*math.sin(a)*relief)))
            band = .83+.16*math.sin(a+.8)**2+.15*math.cos(7*a+.7*length)
            colors.append(tuple(c*color_scale*band for c in (.61,.38,.178)))
            if j:
                k = j*sides+i
                n = j*sides+(i+1)%sides
                faces.append((k,n,n-sides,k-sides))
    faces.extend((tuple(reversed(range(sides))), tuple(range(len(vertices)-sides,len(vertices)))))
    mesh("Groom | "+name, vertices, faces, hair, colors)


lock("back mass", [
    (.05,.34,4.08,.28,.29),(0,.63,3.77,.8,.53),(-.02,.65,3,.95,.49),
    (.08,.66,2.28,.95,.45),(-.05,.58,1.48,1.12,.34),(-.28,.52,.67,1.22,.26),
    (-.38,.53,-.19,1.01,.17),(-.63,.43,-.65,.40,.06),(-.65,.44,-.96,.012,.015),
], .69, .63)
for name, points, tone in (
    ("left front wave",[(.69,-.45,3.74,.052,.070),(.90,-.62,3.33,.17,.14),(1.15,-.54,2.93,.22,.19),
        (1.17,-.53,2.64,.20,.18),(.96,-.58,2.18,.20,.22),(1.04,-.63,1.75,.25,.22),
        (1.33,-.65,1.30,.28,.23),(1.40,-.75,.84,.22,.21),(1.25,-.92,.48,.16,.16),
        (1.28,-.93,.21,.008,.011)],.99),
    ("left outer wave",[(.84,.04,3.48,.18,.16),(1.01,.04,3.15,.25,.22),(1.23,.07,2.74,.24,.21),
        (1.17,.09,2.23,.20,.24),(1.26,-.02,1.84,.25,.22),(1.55,0,1.37,.22,.21),
        (1.55,-.03,.89,.18,.16),(1.44,-.09,.52,.11,.13),(1.51,-.13,.14,.013,.014)],.83),
    ("right front wave",[(-.67,-.42,3.73,.048,.060),(-.87,-.67,3.25,.18,.14),(-1,-.76,2.83,.20,.21),
        (-1.27,-.66,2.43,.23,.23),(-1.31,-.70,2.02,.24,.24),(-1.02,-.83,1.63,.27,.22),
        (-.94,-1,1.20,.29,.22),(-1.26,-1.04,.79,.29,.22),(-1.35,-1.08,.43,.25,.18),
        (-1.13,-1.12,.13,.19,.13),(-.99,-1.12,-.24,.13,.085),(-1.10,-1.10,-.55,.009,.011)],1.12),
    ("right broad wave",[(-.77,-.13,3.48,.19,.18),(-1.04,-.17,3.15,.25,.21),(-1.18,-.18,2.73,.28,.24),
        (-1.42,-.20,2.32,.27,.20),(-1.30,-.24,1.83,.23,.25),(-1.51,-.32,1.38,.31,.25),
        (-1.72,-.35,.95,.26,.23),(-1.54,-.46,.46,.21,.20),(-1.64,-.51,.04,.18,.13),
        (-1.78,-.49,-.36,.10,.10),(-1.66,-.46,-.67,.009,.011)],.93),
    ("right inner fall",[(-.88,-.27,2.74,.13,.17),(-.94,-.39,2.29,.19,.20),(-.83,-.42,1.85,.18,.21),
        (-.66,-.65,1.44,.19,.19),(-.73,-.77,.93,.24,.21),(-.95,-.87,.45,.21,.18),
        (-.76,-.92,.04,.18,.14),(-.63,-.90,-.30,.11,.09),(-.73,-.91,-.72,.009,.011)],.82),
    ("left inner fall",[(1.01,-.28,2.65,.11,.11),(.86,-.42,2.24,.15,.14),(.82,-.47,1.82,.17,.16),
        (.96,-.42,1.35,.17,.17),(1.23,-.44,.98,.16,.18),(1.16,-.59,.43,.16,.15),
        (1.18,-.62,.04,.09,.10),(1.29,-.59,-.31,.008,.012)],.80),
    ("rear left",[(.48,.75,3.99,.13,.11),(.69,.92,3.54,.22,.18),(.79,1.04,2.98,.24,.21),
        (.66,1.13,2.45,.22,.21),(.83,1.11,1.96,.25,.20),(1.07,1.07,1.40,.28,.21),
        (.92,1,.77,.22,.15),(.65,.90,.36,.11,.12),(.72,.83,-.13,.012,.014)],.89),
    ("rear right",[(-.41,.72,4.04,.15,.14),(-.57,.92,3.58,.24,.22),(-.60,1.13,3.06,.26,.21),
        (-.40,1.14,2.45,.26,.22),(-.64,1.12,1.89,.30,.22),(-.84,1.13,1.36,.31,.20),
        (-.71,1,.78,.25,.18),(-.43,.95,.21,.22,.13),(-.57,.91,-.36,.12,.09),
        (-.67,.80,-.66,.01,.014)],.93),
):
    lock(name, points, tone)

# A fitted crown joins the roots under the Buff rather than exposing individual ends.
vertices, faces, colors = [], [], []
crown_origin = Vector((0, -.26, 3.26))
columns, levels = 96, 17
for i in range(columns):
    angle = math.tau*i/columns
    for j in range(levels):
        extent = (1.26 - .18*math.cos(angle)) * (j + .04) / (levels - .96)
        direction = Vector((math.sin(extent)*math.sin(angle),
                            -math.sin(extent)*math.cos(angle), math.cos(extent)))
        hit, _, _, _ = face_bvh.ray_cast(crown_origin, direction)
        swept = 8*angle + 2.8*extent
        relief = (.042+.038*math.cos(swept)+.012*math.cos(2*swept))*math.sin(extent*.8) + .065
        vertices.append(tuple(hit + direction*relief))
        tone = .75+.13*math.cos(swept)+.035*math.cos(2*swept)
        colors.append(tuple(tone*c for c in (.55,.32,.137)))
        if j:
            k, n = i*levels+j, ((i+1)%columns)*levels+j
            faces.append((k-1,n-1,n,k))
faces.append(tuple(i*levels for i in range(columns)))
mesh("Groom | fitted swept crown",vertices,faces,hair,colors)

buff, shader = material("Buff | Tika color study", (.10,.04,.25), .71)
nodes = buff.node_tree.nodes
noise = nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 21
noise.inputs["Detail"].default_value = 1
ramp = nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements.remove(ramp.color_ramp.elements[1])
ramp.color_ramp.elements[0].color = (.026,.014,.090,1)
for stop, color in ((.43,(.061,.025,.17)),(.52,(.16,.036,.26)),(.57,(.31,.073,.28)),
                    (.63,(.043,.16,.32)),(.69,(.082,.27,.45))):
    ramp.color_ramp.elements.new(stop).color = (*color,1)
buff.node_tree.links.new(noise.outputs["Fac"],ramp.inputs[0])
buff.node_tree.links.new(ramp.outputs["Color"],shader.inputs["Base Color"])

for row, (bottom, thickness, width, depth) in enumerate(((3.275,.16,.965,1.278),
                                                        (3.420,.20,.949,1.266),
                                                        (3.591,.17,.938,1.235))):
    vertices, faces = [], []
    for i in range(96):
        a = math.tau*i/96
        for j in range(9):
            t = j/8
            ridge = .024*math.sin(t*math.pi)+.014*math.cos(5*a+t)
            z = bottom+thickness*t+.125*math.cos(a)+.034*math.sin(2*a+row)
            vertices.append(((width+ridge)*math.sin(a), -.30-(depth+ridge)*math.cos(a), z))
            if j:
                k, n = i*9+j, ((i+1)%96)*9+j
                faces.append((k-1,n-1,n,k))
    cloth = mesh(f"Buff | fold {row+1}",vertices,faces,buff)
    cloth.modifiers.new("Fabric edge","SOLIDIFY").thickness = .020


def aim(obj, point):
    obj.rotation_euler = (Vector(point)-obj.location).to_track_quat("-Z","Y").to_euler()


for name, position, color, power, size in (
    ("Warm key",(-4.2,-5.5,7),(1,.86,.75),710,4.2),
    ("Cool fill",(4.5,-3.2,4.1),(.70,.84,1),360,4.5),
    ("Warm rim",(3.3,3,5.8),(1,.74,.48),790,3.4),
    ("Eye bounce",(-.3,-5,3),(.88,.94,1),100,2.9),
):
    lamp = bpy.data.lights.new(name,"AREA")
    lamp.energy, lamp.color, lamp.shape, lamp.size = power, color, "DISK", size
    obj = bpy.data.objects.new(name,lamp)
    bpy.context.collection.objects.link(obj)
    obj.location = position
    aim(obj,(0,0,2.6))

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 48
scene.cycles.use_denoising = False
scene.render.resolution_x, scene.render.resolution_y = 600, 710
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 92
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.world = bpy.data.worlds.new("Studio")
scene.world.use_nodes = True
world = scene.world.node_tree
ambient = world.nodes.get("Background")
ambient.inputs["Color"].default_value = (.28,.37,.44,1)
ambient.inputs["Strength"].default_value = .35
background = world.nodes.new("ShaderNodeBackground")
background.inputs["Color"].default_value = (.045,.102,.148,1)
camera_ray = world.nodes.new("ShaderNodeLightPath")
mix = world.nodes.new("ShaderNodeMixShader")
world.links.new(camera_ray.outputs["Is Camera Ray"],mix.inputs[0])
world.links.new(ambient.outputs[0],mix.inputs[1])
world.links.new(background.outputs[0],mix.inputs[2])
world.links.new(mix.outputs[0],world.nodes.get("World Output").inputs["Surface"])

for name, angle in (("front",0),("three-quarter",-35),("profile",-90)):
    radians = math.radians(angle)
    camera = bpy.data.cameras.new(name)
    camera.type, camera.ortho_scale = "ORTHO", 4.82
    obj = bpy.data.objects.new("Review | "+name,camera)
    bpy.context.collection.objects.link(obj)
    obj.location = (9*math.sin(radians),-9*math.cos(radians),2.76)
    aim(obj,(0,-.08,2.37))

scene.camera = bpy.data.objects["Review | three-quarter"]
scene.render.filepath = "//three-quarter.jpg"
bpy.ops.object.select_all(action="DESELECT")
head.select_set(True)
bpy.context.view_layer.objects.active = head
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == "VIEW_3D":
            area.spaces.active.region_3d.view_perspective = "CAMERA"
bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(output/"carolyn-head.blend"),compress=True)
for name in ("front","three-quarter","profile"):
    scene.camera = bpy.data.objects["Review | "+name]
    scene.render.filepath = str(output/f"{name}.jpg")
    bpy.ops.render.render(write_still=True)
