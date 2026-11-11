"""Fit and render the Season 33 Jay appearance study in Blender 4.3."""
from math import cos, radians, sin, sqrt, tau
from pathlib import Path
import sys

import bpy
import bmesh
from mathutils import Quaternion, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree


def material(name, rgb, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Roughness"].default_value = roughness
    return mat


def mesh_object(name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for face in mesh.polygons:
        face.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def vertices(obj):
    return [obj.matrix_world @ v.co for v in obj.data.vertices]


def armature_for(obj, rig):
    mod = obj.modifiers.new("Survivor deformation", "ARMATURE")
    mod.object = rig
    obj.parent = rig
    obj.matrix_parent_inverse = rig.matrix_world.inverted()


def nearest_weights(obj, skin, rig):
    points = vertices(skin)
    tree = KDTree(len(points))
    for i, co in enumerate(points):
        tree.insert(co, i)
    tree.balance()
    for group in skin.vertex_groups:
        obj.vertex_groups.new(name=group.name)
    for v in obj.data.vertices:
        _, idx, _ = tree.find(obj.matrix_world @ v.co)
        for group in skin.data.vertices[idx].groups:
            obj.vertex_groups[group.group].add([v.index], group.weight, "REPLACE")
    armature_for(obj, rig)


def fit_tank(skin, rig, shorts):
    """Use continuous cloth topology with pale rolled bindings and a raised pocket."""
    source = bmesh.new()
    source.from_mesh(skin.data)
    for v in source.verts:
        v.co = skin.matrix_world @ v.co
    bmesh.ops.remove_doubles(source, verts=list(source.verts), dist=.00025)
    # Sample the curved cut lines on a finer torso grid before making the openings.
    torso = [edge for edge in source.edges if all(.75 < v.co.z < 1.64 for v in edge.verts)]
    bmesh.ops.subdivide_edges(source, edges=torso, cuts=2, use_grid_fill=True)
    source.normal_update()
    source.verts.index_update()
    source.verts.ensure_lookup_table()
    points = [v.co.copy() for v in source.verts]
    normals = [v.normal.copy() for v in source.verts]
    skin_faces = [[v.index for v in f.verts] for f in source.faces]
    source.free()
    shoulder = rig.matrix_world @ rig.data.bones["LeftArm"].head_local
    height = max(p.z for p in points)
    waist = max(p.z for p in vertices(shorts))
    scale = height / 1.78
    hem = waist - .056 * scale

    def distance(p):
        front = max(0, min(1, (-p.y + .005) / .052))
        neckline = shoulder.z - (.037 + .092 * front) * scale
        x = abs(p.x) / scale
        scoop = neckline + .130 * scale * min(1.65, x / .101) ** 2
        outside = (.185 - .044 * max(0, min(1, (p.z - shoulder.z + .18) / .15))) * scale
        return min(max(scoop - p.z, abs(p.x) - .099 * scale), outside - abs(p.x))

    def cloth_offset(p, n):
        near_waist = max(0, 1 - (p.z - hem) / .21)
        front = max(0, min(1, (-p.y - .016) / .055))
        fold = sin(29 * p.x + 25 * p.z) + .45 * sin(71 * p.x - 22 * p.z)
        return p + n * (.008 + .015 * near_waist + .0026 * front * near_waist * fold)

    def clip(poly, coordinate, threshold, sign=1):
        result = []
        for a, b in zip(poly, poly[1:] + poly[:1]):
            fa, fb = (a[coordinate] - threshold) * sign, (b[coordinate] - threshold) * sign
            if fa >= 0:
                result.append(a)
            if (fa >= 0) != (fb >= 0):
                t = fa / (fa - fb)
                result.append((a[0].lerp(b[0], t), a[1].lerp(b[1], t),
                               a[2] + t * (b[2] - a[2]), a[3] + t * (b[3] - a[3])))
        return result

    # The binding and jersey occupy adjacent faces on the same surface.
    # Material transitions and turned seams therefore follow skin weights together.
    mesh_input = [(p, n, distance(p), p.z) for p, n in zip(points, normals)]
    verts, faces, material_indices = [], [], []
    for indices in skin_faces:
        poly = clip(clip([mesh_input[i] for i in indices], 3, hem), 2, 0)
        for mat_id, part in ((0, clip(poly, 2, .0065)), (1, clip(poly, 2, .0065, -1))):
            if len(part) < 3:
                continue
            start = len(verts)
            verts.extend(cloth_offset(p, n.normalized()) for p, n, _, _ in part)
            faces.append(tuple(range(start, len(verts))))
            material_indices.append(mat_id)
    red = material("Washed red jersey", (.39, .022, .034), .79)
    trim = material("Pale knitted binding", (.56, .51, .44), .84)
    tank = mesh_object("Jay | red tank body", verts, faces, red)
    tank.data.materials.append(trim)
    for face, mat_id in zip(tank.data.polygons, material_indices):
        face.material_index = mat_id

    bm = bmesh.new()
    bm.from_mesh(tank.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00028)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    for _ in range(3):
        changes = {}
        for v in bm.verts:
            edges = [e for e in v.link_edges if e.is_boundary]
            if len(edges) == 2:
                avg = sum((e.other_vert(v).co for e in edges), Vector()) / 2
                changes[v] = v.co.lerp(avg, .21)
        for v, co in changes.items():
            v.co = co
    bm.to_mesh(tank.data)
    bm.free()
    nearest_weights(tank, skin, rig)
    thickness = tank.modifiers.new("Turned hem and arm openings", "SOLIDIFY")
    thickness.thickness = .0021
    thickness.offset = -.45

    tree = BVHTree.FromPolygons([v.co for v in tank.data.vertices], [f.vertices for f in tank.data.polygons])
    pocket = material("Pocket cotton", (.31, .33, .35), .82)
    pocket_v, pocket_f = [], []
    for row in range(9):
        t = row / 8
        for col in range(9):
            u = col / 8
            x = (.091 + (u - .5) * (.057 - .009 * (1 - t))) * scale
            z = shoulder.z + (-.236 + .064 * t + .009 * (1 - t) * abs(u - .5)) * scale
            hit, _, _, _ = tree.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)), 1.1)
            if hit is None:
                raise ValueError("Pocket pattern fell outside the tank front")
            pocket_v.append((x, hit.y - .0032 - .0013 * sin(u * tau / 2), z))
            if row and col:
                k = row * 9 + col
                pocket_f.append((k - 10, k - 9, k, k - 1))
    obj = mesh_object("Jay | raised pale chest pocket", pocket_v, pocket_f, pocket)
    nearest_weights(obj, skin, rig)
    solid = obj.modifiers.new("Pocket turned seam", "SOLIDIFY")
    solid.thickness = .0014


def fit_hair(hair, skin):
    """Shorten the licensed tied-back mesh toward the Season 33 camp look."""
    h = max(p.z for p in vertices(skin))
    inv = hair.matrix_world.inverted()
    for v, co in zip(hair.data.vertices, vertices(hair)):
        tail = max(0.0, h - .114 - co.z)
        back = max(0, min(1, (co.y - .041) / .067))
        crown = max(0, min(1, (co.z - (h - .055)) / .071))
        co.z += tail * .91 * back + crown * .007 * cos(26 * (co.x + .012))
        co.x *= 1 - .17 * back * min(1, tail / .12)
        co.y += .006 * back * sin(43 * co.z)
        v.co = inv @ co
    shader = hair.data.materials[0].node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = .74
    shader.inputs["Specular IOR Level"].default_value = .22


def relax(rig):
    """Pose at the shoulders and hands with the original armature left editable."""
    def joint(name):
        return rig.matrix_world @ rig.pose.bones[name].head

    def rotate(name, delta):
        b = rig.pose.bones[name]
        frame = rig.matrix_world.to_quaternion() @ b.matrix.to_quaternion()
        b.rotation_mode = "QUATERNION"
        b.rotation_quaternion = b.rotation_quaternion @ (frame.inverted() @ delta @ frame)
        bpy.context.view_layer.update()

    def aim(a, b, direction):
        v = (joint(b) - joint(a)).normalized()
        rotate(a, v.rotation_difference(Vector(direction).normalized()))

    for side, sign in (("Left", 1), ("Right", -1)):
        thigh, shin, foot = [side + n for n in ("UpLeg", "Leg", "Foot")]
        foot_before = joint(foot)
        toe = side + "ToeBase"
        foot_direction = joint(toe) - foot_before
        foot_goal = foot_before + Vector((-sign * .025, 0, 0))
        thigh_direction = joint(shin) - joint(thigh) + Vector((-sign * .016, 0, 0))
        aim(thigh, shin, thigh_direction)
        aim(shin, foot, foot_goal - joint(shin))
        aim(foot, toe, foot_direction)
        upper, fore, hand = [side + n for n in ("Arm", "ForeArm", "Hand")]
        aim(upper, fore, (sign * .22, -.03, -1))
        aim(fore, hand, (sign * .095, -.14, -1))
        aim(hand, side + "HandMiddle1", (sign * .025, -.045, -1))
        for finger in ("Index", "Middle", "Ring", "Pinky"):
            name = side + "Hand" + finger
            d = (joint(name + "2") - joint(name + "1")).normalized()
            axis = d.cross(Vector((-sign, -.25, 0)))
            if axis.length > .1:
                rotate(name + "1", Quaternion(axis.normalized(), .27))


def prepare(path, candidate):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    scene = bpy.context.scene
    actor = next(o for o in scene.objects if o.type == "MESH" and len(o.data.materials) > 3)
    rig = next(o for o in scene.objects if o.type == "ARMATURE")
    if rig.animation_data:
        rig.animation_data_clear()
    for o in list(scene.objects):
        if o.type == "MESH" and o != actor:
            o.hide_render = True
    if candidate:
        bpy.ops.object.select_all(action="DESELECT")
        actor.select_set(True)
        bpy.context.view_layer.objects.active = actor
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.separate(type="MATERIAL")
        bpy.ops.object.mode_set(mode="OBJECT")
        parts = {}
        for o in scene.objects:
            if o.type == "MESH" and not o.hide_render:
                name = o.data.materials[0].name.split(".")[0]
                parts[name] = o
                o.name = "Jay | " + name
        fit_hair(parts["Hair"], parts["Skin"])
        fit_tank(parts["Skin"], rig, parts["Boardshorts"])
    relax(rig)
    return scene


def studio(scene):
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.adaptive_threshold = .065
    scene.cycles.max_bounces = 5
    scene.cycles.use_denoising = False
    scene.render.resolution_x, scene.render.resolution_y = (550, 690)
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 91
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("Studio daylight")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (.15, .19, .24, 1)
    bg.inputs[1].default_value = .62
    slate = material("Slate", (.082, .106, .128), .95)
    mesh_object("Matte slate floor", [(-200, -200, -.004), (200, -200, -.004),
                                    (200, 200, -.004), (-200, 200, -.004)], [(0, 1, 2, 3)], slate)
    # The portrait sees the seamless curved wall beyond the subject.
    cross_section = [(4 + 2 * sin(radians(a)), -.008 + 2 * (1 - cos(radians(a))))
                     for a in range(0, 91, 5)] + [(6, 8)]
    sweep = [(x, y, z) for y, z in cross_section for x in (-8, 8)]
    mesh_object("Portrait cyclorama", sweep,
                [(i, i + 1, i + 3, i + 2) for i in range(0, len(sweep) - 2, 2)], slate)
    focus = Vector((0, 0, 1.0))
    for label, pos, power, size, color in (
        ("Window key", (-2.4, -3.3, 4.2), 432, 2.8, (1, .91, .82)),
        ("Studio fill", (2.6, -2.4, 2.65), 176, 2.4, (.82, .90, 1)),
        ("Crown rim", (.2, 3.1, 3.2), 347, 2.6, (.81, .88, 1)),
    ):
        d = bpy.data.lights.new(label, "AREA")
        d.energy, d.shape, d.size, d.color = power, "DISK", size, color
        o = bpy.data.objects.new(label, d)
        scene.collection.objects.link(o)
        o.location = pos
        o.rotation_euler = (focus - o.location).to_track_quat("-Z", "Y").to_euler()


def cameras(scene):
    for label, a in (("front", 0), ("three-quarter", 35), ("rear", 180)):
        ang = radians(a)
        focus = Vector((0, 0, .91))
        pos = Vector((4.4 * sin(ang), -4.4 * cos(ang), 1.14))
        camera(scene, label, pos, focus, ortho=2.13)
    camera(scene, "conversation", (.15, -1.42, 1.69), (0, -.026, 1.52), lens=73)
    camera(scene, "gameplay", (2.13, 5.58, 3.03), (0, 0, 1.44), lens=30)


def camera(scene, label, pos, focus, lens=55, ortho=None):
    d = bpy.data.cameras.new(label)
    o = bpy.data.objects.new(label, d)
    scene.collection.objects.link(o)
    o.location = pos
    o.rotation_euler = (Vector(focus) - o.location).to_track_quat("-Z", "Y").to_euler()
    if ortho:
        d.type = "ORTHO"
        d.ortho_scale = ortho
    else:
        d.lens = lens


if __name__ == "__main__":
    model, output, mode, *views = sys.argv[sys.argv.index("--") + 1:]
    out = Path(output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    scene = prepare(Path(model).resolve(), mode == "candidate")
    studio(scene)
    cameras(scene)
    scene.camera = scene.objects["three-quarter"]
    if mode == "candidate":
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=str(out / "Jay_Season_33_Study.blend"), compress=True)
    for view in views or ("front", "three-quarter", "rear", "conversation", "gameplay"):
        scene.camera = scene.objects[view]
        scene.render.resolution_x, scene.render.resolution_y = (800, 450) if view == "gameplay" else (550, 690)
        scene.render.filepath = str(out / (mode + "-" + view + ".jpg"))
        bpy.ops.render.render(write_still=True)
