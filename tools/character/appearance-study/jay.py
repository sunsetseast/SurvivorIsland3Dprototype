"""Fit and render the Season 33 Jay appearance study in Blender 4.3."""
from math import atan2, cos, pi, radians, sin, tau
from pathlib import Path
import sys

import bpy
import bmesh
from mathutils import Quaternion, Vector
from mathutils.bvhtree import BVHTree


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
    skin.data.calc_loop_triangles()
    triangles = [tuple(face.vertices) for face in skin.data.loop_triangles]
    surface = BVHTree.FromPolygons(points, triangles, all_triangles=True)
    for group in skin.vertex_groups:
        obj.vertex_groups.new(name=group.name)
    for v in obj.data.vertices:
        hit, _, face, _ = surface.find_nearest(obj.matrix_world @ v.co)
        indices = triangles[face]
        a, b, c = (points[i] for i in indices)
        ab, ac, ap = b - a, c - a, hit - a
        aa, bb, cc = ab.dot(ab), ab.dot(ac), ac.dot(ac)
        d, e = ap.dot(ab), ap.dot(ac)
        determinant = aa * cc - bb * bb
        u = (cc * d - bb * e) / determinant if determinant > 1e-16 else 0
        w = (aa * e - bb * d) / determinant if determinant > 1e-16 else 0
        weights = {}
        for idx, blend in zip(indices, (1 - u - w, u, w)):
            if blend <= 0:
                continue
            for group in skin.data.vertices[idx].groups:
                weights[group.group] = weights.get(group.group, 0) + blend * group.weight
        strongest = sorted(weights.items(), key=lambda pair: -pair[1])[:4]
        total = sum(weight for _, weight in strongest)
        for group, weight in strongest:
            obj.vertex_groups[group].add([v.index], weight / total, "REPLACE")
    armature_for(obj, rig)


def body_surface(skin):
    points = vertices(skin)
    return BVHTree.FromPolygons(points, [face.vertices for face in skin.data.polygons])


def sample_surface(surface, center, direction, clearance):
    direction = Vector(direction).normalized()
    hit, _, _, _ = surface.ray_cast(Vector(center), direction, .45)
    if hit is None:
        raise ValueError(f"Pattern sample missed skin from {center} along {direction}")
    return hit + direction * clearance


def join_rows(faces, first, second, closed=False):
    edges = list(zip(first, first[1:], second, second[1:]))
    if closed:
        edges.append((first[-1], first[0], second[-1], second[0]))
    faces.extend((a, b, d, c) for a, b, c, d in edges)


def finish_cloth(obj, skin, rig, thickness):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.0001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()
    nearest_weights(obj, skin, rig)
    solid = obj.modifiers.new("Fabric thickness and turned edges", "SOLIDIFY")
    solid.thickness = thickness
    solid.offset = -.4


def garment_material(name, color, roughness, scale):
    mat = material(name, color, roughness)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 2
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Distance"].default_value = .0006
    bump.inputs["Strength"].default_value = .15
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], nodes.get("Principled BSDF").inputs["Normal"])
    return mat


def add_tank_binding(tank, binding, hem, surface):
    """Continue each neck and armhole edge into a narrow, single-surface binding."""
    tank.data.materials.append(binding)
    bm = bmesh.new()
    bm.from_mesh(tank.data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    edges = [edge for edge in bm.edges if edge.is_boundary
             and max(v.co.z for v in edge.verts) > hem + .06]
    outline = {v for edge in edges for v in edge.verts}
    for _ in range(5):
        changes = {}
        for v in outline:
            adjacent = [edge.other_vert(v) for edge in v.link_edges if edge.is_boundary]
            if len(adjacent) != 2:
                continue
            average = (adjacent[0].co + adjacent[1].co) / 2
            point = v.co.lerp(average, .39)
            hit, normal, _, _ = surface.find_nearest(point)
            separation = (point - hit).dot(normal)
            changes[v] = point + max(0, .0068 - separation) * normal
        for v, point in changes.items():
            v.co = point
    bm.normal_update()
    directions = {}
    for edge in edges:
        face = edge.link_faces[0]
        for v in edge.verts:
            line = (edge.other_vert(v).co - v.co).normalized()
            normal = v.normal.normalized()
            out = normal.cross(line).normalized()
            inward = face.calc_center_median() - v.co
            directions.setdefault(v, []).append(-out if out.dot(inward) > 0 else out)
    rim = {v: bm.verts.new(v.co + sum(axes, Vector()).normalized() * .0052 + v.normal * .0016)
           for v, axes in directions.items()}
    for edge in edges:
        a, b = edge.verts
        face = bm.faces.new((a, b, rim[b], rim[a]))
        face.material_index = 1
        face.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(tank.data)
    bm.free()


def fit_tank(skin, rig):
    """Draft a torso panel and two shoulder straps with independent cloth topology."""
    surface = body_surface(skin)
    verts, faces = [], []
    count = 112
    hem = 1.004
    half_profile = (
        (0, 1.276), (4, 1.283), (8, 1.316), (11, 1.364), (13, 1.405),
        (17, 1.405), (19, 1.359), (23, 1.303), (28, 1.282), (32, 1.303),
        (36, 1.342), (38, 1.402), (42, 1.402), (44, 1.368), (48, 1.342), (56, 1.331),
    )

    def upper_edge(index):
        index = min(index, count - index)
        for (a, z0), (b, z1) in zip(half_profile, half_profile[1:]):
            if index <= b:
                t = (index - a) / (b - a)
                return z0 + (z1 - z0) * (3 * t * t - 2 * t * t * t)
        return half_profile[-1][1]

    rows = []
    for row in range(19):
        t = row / 18
        current = []
        for i in range(count):
            angle = tau * i / count
            ripple = sin(angle * 7 + .5) * .003 + sin(angle * 3) * .0035
            z = hem + (upper_edge(i) - hem) * t + ripple * (1 - t) ** 2
            # Let the hem hang over the shorts and taper the cloth to its arm openings.
            fold = (.006 * cos(angle * 7 + z * 24) + .002 * sin(angle * 13 - z * 45)) * (1 - t) ** 2
            offset = .009 + .017 * (1 - t) ** 3 + fold
            current.append(len(verts))
            verts.append(sample_surface(surface, (0, .012, z), (sin(angle), -cos(angle), 0), offset))
        if rows:
            join_rows(faces, rows[-1], current, closed=True)
        rows.append(current)

    top = rows[-1]
    for sign in (1, -1):
        front = [top[(sign * i) % count] for i in range(13, 18)]
        back = [top[(sign * i) % count] for i in range(42, 37, -1)]
        prior = front
        for row in range(1, 19):
            t = row / 18
            if row == 18:
                current = back
            else:
                current = []
                for a, b in zip(front, back):
                    start, end = verts[a], verts[b]
                    # Follow the shoulder itself across the crown of the strap.
                    x = start.x * (1 - t) + end.x * t
                    if abs(x) < .078:
                        x = sign * (.078 + (abs(x) - .078) * abs(2 * t - 1))
                    center = Vector((x, 0, 1.417))
                    start_angle = atan2(start.z - center.z, -start.y)
                    end_angle = pi - atan2(end.z - center.z, end.y)
                    angle = start_angle + (end_angle - start_angle) * t
                    p = sample_surface(surface, center, (0, -cos(angle), sin(angle)), .0105)
                    current.append(len(verts))
                    verts.append(p)
            join_rows(faces, prior, current)
            prior = current

    red = garment_material("Washed red jersey", (.386, .027, .040), .84, 188)
    trim = garment_material("Pale knitted binding", (.63, .55, .46), .89, 245)
    tank = mesh_object("Jay | sewn red tank", verts, faces, red)
    add_tank_binding(tank, trim, hem, surface)
    finish_cloth(tank, skin, rig, .0022)

    front_tree = BVHTree.FromPolygons(verts, faces)
    pocket = garment_material("Pale cotton chest pocket", (.34, .37, .39), .86, 165)
    seam = material("Pocket seam", (.26, .29, .31), .87)
    pocket_v, pocket_f = [], []
    for row in range(9):
        t = row / 8
        for col in range(9):
            u = col / 8
            x = .086 + (u - .5) * (.061 - .012 * (1 - t))
            z = 1.168 + .066 * t + .010 * (1 - t) * abs(u - .5)
            hit, _, _, _ = front_tree.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)), 1)
            if hit is None:
                raise ValueError("Pocket pattern fell outside the tank front")
            bulge = .0022 * sin(pi * u) * sin(pi * t * .7)
            pocket_v.append((x, hit.y - .0028 - bulge, z))
            if row and col:
                k = row * 9 + col
                pocket_f.append((k - 10, k - 9, k, k - 1))
    obj = mesh_object("Jay | pale patch pocket", pocket_v, pocket_f, pocket)
    obj.data.materials.append(seam)
    for face in obj.data.polygons:
        row, col = divmod(face.index, 8)
        if col in (0, 7) or row in (0, 7):
            face.material_index = 1
    finish_cloth(obj, skin, rig, .0011)
    return tank


def fit_shorts(skin, rig):
    """Join the two leg panels at a crotch curve and a fitted single waistband."""
    surface = body_surface(skin)
    slate = garment_material("Washed slate shorts", (.073, .086, .104), .86, 168)
    seam = material("Slate seam and hem", (.054, .067, .083), .86)
    waistband = garment_material("Slate waistband", (.060, .070, .084), .9, 210)
    verts, faces, groups = [], [], []
    half = 24
    count = half * 2
    hip = .887

    def add_point(p):
        verts.append(p)
        return len(verts) - 1

    def connect(a, b, group, closed=True):
        start = len(faces)
        join_rows(faces, a, b, closed=closed)
        groups.extend([group] * (len(faces) - start))

    prior = None
    for row, z in enumerate((1.039, 1.035, 1.014, 1.011, .985, .954, .922, hip)):
        ring = []
        for i in range(count):
            angle = i * tau / count
            offset = .011 + .010 * (1 - (z - hip) / (1.039 - hip))
            p = sample_surface(surface, (0, .010, z), (sin(angle), -cos(angle), 0), offset)
            ring.append(add_point(p))
        if prior is not None:
            connect(prior, ring, 2 if row <= 3 else 0)
        prior = ring
    hip_ring = prior
    center_front, center_back = verts[hip_ring[0]], verts[hip_ring[half]]
    midline = []
    for i in range(1, half):
        t = i / half
        p = center_back.lerp(center_front, t)
        p.z -= .069 * sin(pi * t) ** .83
        midline.append(add_point(p))

    for sign in (1, -1):
        outer = [hip_ring[(sign * i) % count] for i in range(half + 1)]
        branch = outer + midline
        prior = branch
        for row, t in enumerate((.09, .18, .29, .42, .56, .69, .82, .94, .966, .987, 1.0)):
            ring = []
            for i, branch_index in enumerate(branch):
                angle = i * tau / count
                start = verts[branch_index]
                pz = start.z * (1 - t) + (.666 + .004 * cos(angle)) * t
                center = (sign * (.104 + (1 - pz) * .113), -.009 - (1 - pz) * .014, pz)
                gather = .0017 * sin(7 * angle + row * .3) + .0013 * cos(12 * angle + row * .25)
                offset = .012 + .003 * sin(pi * t) + gather
                hit = sample_surface(surface, center, (sign * sin(angle), -cos(angle), 0), offset)
                blend = min(1, t / .42)
                panel = start.lerp(hit, blend)
                panel.z = pz
                if abs(cos(angle)) > .30:
                    side = -1 if cos(angle) > 0 else 1
                    probe, _, _, _ = surface.ray_cast(
                        Vector((panel.x, .25 * side, pz)), Vector((0, -side, 0)), .31,
                    )
                    if probe and (probe.y + side * .010 - panel.y) * side > 0:
                        panel.y = probe.y + side * .010
                # Keep the inside of each leg on its own side of the inseam.
                panel.x = sign * max(.0018, panel.x * sign)
                ring.append(add_point(panel))
            connect(prior, ring, 1 if row >= 8 else 0)
            prior = ring

    obj = mesh_object("Jay | cut slate shorts", verts, faces, slate)
    obj.data.materials.append(seam)
    obj.data.materials.append(waistband)
    for face, group in zip(obj.data.polygons, groups):
        face.material_index = group
    finish_cloth(obj, skin, rig, .0022)
    return obj


def hide_covered_skin(skin, garments):
    """Cull skin only where cloth fully encloses it and no opening is nearby."""
    coverage = []
    for garment in garments:
        points = vertices(garment)
        surface = BVHTree.FromPolygons(points, [face.vertices for face in garment.data.polygons])
        edge_uses = {}
        for face in garment.data.polygons:
            for edge in face.edge_keys:
                edge_uses[edge] = edge_uses.get(edge, 0) + 1
        rim = [points[i] for edge, uses in edge_uses.items() if uses == 1 for i in edge]
        coverage.append((surface, rim))

    bm = bmesh.new()
    bm.from_mesh(skin.data)
    enclosed = {}
    for v in bm.verts:
        point = skin.matrix_world @ v.co
        inside = False
        for surface, rim in coverage:
            hit, normal, _, distance = surface.find_nearest(point, .033)
            if hit is None or (point - hit).dot(normal) >= 0:
                continue
            if all((hit - rim_point).length_squared > .014 ** 2 for rim_point in rim):
                inside = True
                break
        enclosed[v] = inside
    hidden = [face for face in bm.faces if all(enclosed[v] for v in face.verts)]
    bmesh.ops.delete(bm, geom=hidden, context="FACES")
    bm.to_mesh(skin.data)
    bm.free()


def fit_hair(hair, skin, rig):
    """Refit the existing UV-mapped scalp and fold its tail into a high, compact tie."""
    h = max(p.z for p in vertices(skin))
    to_world = hair.matrix_world
    inv = to_world.inverted()
    bm = bmesh.new()
    bm.from_mesh(hair.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00007)
    remaining = set(bm.verts)
    while remaining:
        seed = remaining.pop()
        component, queue = [seed], [seed]
        while queue:
            v = queue.pop()
            for edge in v.link_edges:
                neighbor = edge.other_vert(v)
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    component.append(neighbor)
                    queue.append(neighbor)
        positions = [to_world @ v.co for v in component]
        is_tail = min(p.y for p in positions) > .038 and min(p.z for p in positions) < h - .27
        for v, p in zip(component, positions):
            if is_tail:
                t = max(0, min(1, (h - .045 - p.z) / .315))
                p.x = p.x * (.69 + .22 * sin(pi * t)) - .006 + .012 * sin(tau * t)
                p.y = .035 + (p.y - .052) * .29 + .024 * sin(t * pi * .94)
                crown_roll = .016 * min(1.4, abs(p.x + .005) / .032) ** 1.7
                p.z = h - .045 + .069 * sin(pi * t) - crown_roll + .15 * (p.y - .058)
            else:
                crown = max(0, min(1, (p.z - h + .095) / .104))
                hairline = max(0, 1 - abs(p.z - (h - .075)) / .026)
                front = max(0, min(1, (-p.y - .077) / .036))
                p.z += crown * (.003 + .004 * sin(75 * p.x + .8))
                if len(component) < 220:
                    lift = .0012 * crown * sin(57 * p.y + 43 * p.x)
                    p.z += lift
                p.z += front * hairline * .004 * sin(161 * p.x + 18 * p.z)
            v.co = inv @ p
    bm.to_mesh(hair.data)
    bm.free()
    indices = list(range(len(hair.data.vertices)))
    for group in hair.vertex_groups:
        group.remove(indices)
    hair.vertex_groups["Head"].add(indices, 1.0, "REPLACE")
    shader = hair.data.materials[0].node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = .74
    shader.inputs["Specular IOR Level"].default_value = .17


    add_hairline_accents(skin, rig, h)


def add_hairline_accents(skin, rig, height):
    """Add sparse, fine overlapping cards around the temples and swept hairline."""
    surface = body_surface(skin)
    center = Vector((0, -.031, height - .104))
    verts, faces, uv = [], [], []
    directions = (
        (-.060, .015, -.012), (-.053, .028, -.009), (-.037, .041, .010),
        (-.019, .051, .018), (.003, .057, .016), (.025, .048, .013),
        (.048, .035, .010), (.057, .021, -.012), (.064, .014, -.011),
    )
    for index, (x, elevation, drift) in enumerate(directions):
        prior = None
        for row in range(11):
            t = row / 10
            direction = Vector((
                x + drift * sin(t * pi * .76) + .0024 * sin(t * tau + index),
                -.103 + t * .064,
                elevation + t * .031 + .0029 * sin(t * tau * .9 + index),
            ))
            p = sample_surface(surface, center, direction, .0055 + .006 * sin(pi * t))
            tangent = direction.cross(Vector((drift, .064, .031))).normalized()
            width = .0015 * (1 - .73 * t) * (.75 + .28 * sin(index * 1.9) ** 2)
            first = len(verts)
            verts.extend((p - tangent * width, p + tangent * width))
            uv.extend(((0, t), (1, t)))
            current = [first, first + 1]
            if prior is not None:
                join_rows(faces, prior, current)
            prior = current

    mat = material("Directional temple and hairline strands", (.052, .028, .016), .68)
    # Original atlas with soft edges and three narrow strands per card.
    texture = bpy.data.images.new("Fine hairline strands", width=64, height=128, alpha=True)
    pixels = []
    for row in range(128):
        v = row / 127
        fade = min(1, v * 12, (1 - v) * 11)
        for col in range(64):
            u = col / 63
            strand = max(max(0, 1 - abs(u - root - .042 * sin(tau * v + root * 8)) / .093)
                         for root in (.27, .48, .70))
            shade = .67 + .33 * strand
            pixels.extend((.258 * shade, .174 * shade, .121 * shade, strand * fade))
    texture.pixels.foreach_set(pixels)
    texture.pack()
    mat.surface_render_method = "DITHERED"
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    atlas = nodes.new("ShaderNodeTexImage")
    atlas.image = texture
    shader = nodes.get("Principled BSDF")
    links.new(atlas.outputs["Color"], shader.inputs["Base Color"])
    links.new(atlas.outputs["Alpha"], shader.inputs["Alpha"])
    obj = mesh_object("Jay | fine hairline cards", verts, faces, mat)
    layer = obj.data.uv_layers.new()
    for corner in obj.data.loops:
        layer.data[corner.index].uv = uv[corner.vertex_index]
    group = obj.vertex_groups.new(name="Head")
    group.add(list(range(len(verts))), 1.0, "REPLACE")
    armature_for(obj, rig)


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
        fit_hair(parts["Hair"], parts["Skin"], rig)
        skin = parts["Skin"]
        tank = fit_tank(skin, rig)
        shorts = fit_shorts(skin, rig)
        hide_covered_skin(skin, (tank, shorts))
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
