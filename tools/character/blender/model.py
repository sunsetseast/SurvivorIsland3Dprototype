"""Character-specific Blender mesh authoring on the existing 66-joint foundation."""

import json
from math import cos, exp, pi, sin, tau
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree


def material(name, color, roughness, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return mat


class Surface:
    """Rest-space lookup used to fit trim and transfer the original skin weights."""

    def __init__(self, body, material_name):
        mesh = body.data
        mesh.calc_loop_triangles()
        faces = [tuple(t.vertices) for t in mesh.loop_triangles
                 if mesh.materials[t.material_index].name == material_name]
        points = [v.co.copy() for v in mesh.vertices]
        ids = set().union(*faces)
        self.bvh = BVHTree.FromPolygons(points, faces, all_triangles=True)
        self.nearest = KDTree(len(ids))
        for i in sorted(ids):
            self.nearest.insert(points[i], i)
        self.nearest.balance()
        self.body = body

    def front(self, x, z, gap=0.0007):
        position, normal, _, _ = self.bvh.ray_cast((x, -1, z), (0, 1, 0), 2)
        return position + normal * gap if position is not None else None

    def around(self, origin, direction, gap):
        point, normal, _, _ = self.bvh.ray_cast(origin + direction * 0.35, -direction, 0.35)
        return point + normal * gap if point is not None else None

    def weight(self, point):
        _, index, _ = self.nearest.find(point)
        return [(self.body.vertex_groups[g.group].name, g.weight)
                for g in self.body.data.vertices[index].groups]


class MeshLayer:
    """Builds fitted curve ribbons and tubes as one skinned material primitive."""

    def __init__(self):
        self.vertices = []
        self.faces = []
        self.uvs = []

    def strip(self, path, radii, sides=5, flatten=1.0, normal=None, uv=None):
        start = len(self.vertices)
        for i, (point, radius) in enumerate(zip(path, radii)):
            axis = (path[min(i + 1, len(path) - 1)] - path[max(0, i - 1)]).normalized()
            guide = normal(point) if normal else Vector((0, 0, 1))
            u = axis.cross(guide)
            if u.length_squared < 1e-8:
                u = axis.cross(Vector((0, 1, 0)))
            u.normalize()
            v = u.cross(axis).normalized()
            for j in range(sides):
                angle = j * tau / sides
                self.vertices.append(point + radius * (u * cos(angle) + v * sin(angle) * flatten))
                if uv:
                    self.uvs.append(uv(i / (len(path) - 1), angle))
            if i:
                for j in range(sides):
                    a = start + (i - 1) * sides + j
                    b = start + (i - 1) * sides + (j + 1) % sides
                    self.faces.append((b, a, a + sides, b + sides))
        self.faces.extend([
            tuple(start + j for j in reversed(range(sides))),
            tuple(start + (len(path) - 1) * sides + j for j in range(sides)),
        ])

    def attach(self, body, mat, weights):
        mesh = bpy.data.meshes.new(mat.name)
        mesh.from_pydata(self.vertices, [], self.faces)
        mesh.update()
        obj = bpy.data.objects.new(mat.name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(mat)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        groups = {}
        for i, point in enumerate(self.vertices):
            for name, value in weights(point):
                if name not in groups:
                    groups[name] = obj.vertex_groups.new(name=name)
                groups[name].add([i], value, "REPLACE")
        if self.uvs:
            layer = mesh.uv_layers.new(name=body.data.uv_layers.active.name)
            for loop in mesh.loops:
                layer.data[loop.index].uv = self.uvs[loop.vertex_index]
        return obj


def sculpt(body, head, strokes):
    """Each elliptical sculpt stroke is authored in metres from the Head joint."""
    basis = body.shape_key_add(name="Foundation")
    shape = body.shape_key_add(name="Likeness sculpt")
    shorts_slot = body.data.materials.find("Board shorts")
    shorts = {i for face in body.data.polygons if face.material_index == shorts_slot for i in face.vertices}
    for index, vertex in enumerate(basis.data):
        p = vertex.co - head
        move = Vector()
        for stroke in strokes:
            if stroke.get("shorts") and index not in shorts:
                continue
            x, y, z = stroke["center"]
            rx, ry, rz = stroke["radius"]
            dx, dy, dz = stroke["delta"]
            side = -1 if p.x < 0 and stroke.get("mirror") else 1
            distance = ((side * p.x - x) / rx)**2 + ((p.y - y) / ry)**2 + ((p.z - z) / rz)**2
            if distance < 9:
                move += Vector((side * dx, dy, dz)) * exp(-distance * 1.7)
        shape.data[index].co = vertex.co + move
    shape.value = 1
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.shape_key_remove(all=True, apply_mix=True)


def hair(body, head, recipe):
    # The cap is broken up by layered, tapered locks. Its boundary is raised
    # across the forehead, drops behind the ears and reaches the nape.
    rng = Random(recipe["seed"])
    center = head + Vector(recipe["center"])
    rx, ry, rz = recipe["radii"]

    def scalp(azimuth, latitude, lift=0):
        return center + Vector(((rx + lift) * sin(latitude) * sin(azimuth),
                                -(ry + lift) * sin(latitude) * cos(azimuth),
                                (rz + lift) * cos(latitude)))

    def edge(a):
        return 1.96 - 0.72 * cos(a) + 0.12 * sin(a * 3 + 0.8) + 0.065 * cos(a * 7)

    layer = MeshLayer()
    count, rings = 38, 9
    layer.vertices.append(scalp(0, 0))
    layer.uvs.append((0.039, 0.5))
    for j in range(1, rings + 1):
        for k in range(count):
            a = k * tau / count
            layer.vertices.append(scalp(a, edge(a) * j / rings, -0.004 + 0.001 * sin(a * 12 + j)))
            layer.uvs.append(((0.08 + 0.84 * k / count) / 8, j / rings))
            i = (j - 1) * count + k + 1
            nxt = (j - 1) * count + (k + 1) % count + 1
            layer.faces.append((0, i, nxt) if j == 1 else (i - count, i, nxt, nxt - count))

    locks = []
    for row, length in enumerate((0.93, 1.0, 1.09)):
        for i in range(13):
            a = i * tau / 13 + row * 0.19 + rng.uniform(-0.19, 0.19)
            start = 0.24 + row * 0.39 + rng.uniform(-0.07, 0.09)
            stop = edge(a) * length + rng.uniform(-0.16, 0.17)
            locks.append((a, start, stop, rng.uniform(0.009, 0.015),
                          rng.choice((-1, 1)), rng.uniform(0.05, 0.59)))
    locks.extend(tuple(item) for item in recipe["hairlineLocks"])
    for a, start, end, width, direction, shade in locks:
        path, radii = [], []
        phase_offset = rng.uniform(-1.3, 1.3)
        for step in range(15):
            t = step / 14
            phase = t * tau * (1.3 + 0.37 * shade) + phase_offset
            curl = sin(pi * t)**0.6
            angle = a + direction * (0.14 * t + 0.22 * curl * sin(phase))
            latitude = start + (end - start) * t + 0.14 * curl * cos(phase)
            lift = 0.001 + curl * (0.008 + 0.006 * sin(phase - 0.5))
            path.append(scalp(angle, latitude, lift))
            radii.append(width * (0.14 + 0.86 * curl) * (1 - 0.70 * t**4))

        lane = 1 + min(6, round(shade * 7))
        layer.strip(path, radii, sides=5, flatten=0.53, normal=lambda p: p - center,
                    uv=lambda t, angle: ((lane + 0.12 + 0.76 * (cos(angle) + 1) / 2) / 8, t))

    mat = material("Sunlit dark curls", (0.035, 0.015, 0.007), 0.82)
    # Eight small pigment swatches with longitudinal fiber detail. The atlas
    # is authored here and packed into the GLB, with no photographic inputs.
    size = 128
    image = bpy.data.images.new("Cook Islands curl fibers", size * 2, size, alpha=False)
    pixels = []
    for j in range(size):
        t = j / (size - 1)
        for i in range(size * 2):
            lane, u = divmod(i, 32)
            weave = 0.40 + 0.25 * sin(u * 4.3 + 0.32 * sin(t * 11)) + 0.20 * sin(u * 1.68 + lane)
            sun = (lane / 7)**2 * (0.35 + 0.65 * sin(pi * t))
            pixels.extend((0.14 + 0.055 * weave + 0.28 * sun,
                           0.076 + 0.038 * weave + 0.17 * sun,
                           0.041 + 0.027 * weave + 0.087 * sun, 1))
    image.pixels.foreach_set(pixels)
    image.pack()
    nodes = mat.node_tree.nodes
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.extension = "EXTEND"
    mat.node_tree.links.new(texture.outputs["Color"], nodes.get("Principled BSDF").inputs["Base Color"])
    return layer.attach(body, mat, lambda _: [("Head", 1)])


def stubble(body, head, skin, recipe):
    rng = Random(recipe["seed"] + 1)
    strands = MeshLayer()
    for cx, cz, rx, rz, count, length in recipe["facialHair"]:
        for _ in range(count):
            u, v = rng.uniform(-1, 1), rng.uniform(-1, 1)
            if u * u + v * v > 1:
                continue
            x, z = cx + u * rx, head.z + cz + v * rz
            direction = 1 if x > 0 else -1
            root = skin.front(x, z)
            tip = skin.front(x + direction * length * 0.26, z - length, 0.0009)
            if root is None or tip is None:
                continue
            strands.vertices.extend((root - Vector((0.00036, 0, 0)),
                                     root + Vector((0.00036, 0, 0)), tip))
            i = len(strands.vertices)
            strands.faces.append((i - 3, i - 2, i - 1))
    # Add fuller central brows with tapered outer tails.
    for side in (-1, 1):
        for _ in range(150):
            t = rng.random()
            x = side * (0.013 + 0.050 * t)
            z = head.z + 0.053 + 0.007 * sin(t * pi) - 0.008 * t + (0.002 if side == 1 else 0)
            z += rng.uniform(-0.0027, 0.0027) * (1 - t * 0.8)
            root = skin.front(x, z)
            tip = skin.front(x + side * 0.003, z + 0.0014 * (1 - t), 0.0008)
            if root is None or tip is None:
                continue
            strands.vertices.extend((root - Vector((0, 0, 0.00055)),
                                     root + Vector((0, 0, 0.00055)), tip))
            i = len(strands.vertices)
            strands.faces.append((i - 3, i - 2, i - 1) if side > 0 else (i - 3, i - 1, i - 2))
    return strands.attach(body, material("Brow and sparse stubble", (0.059, 0.028, 0.015), 0.94), skin.weight)


def necklace(body, rig, skin):
    neck = rig.data.bones["Neck"].head_local
    path = []
    for step in range(33):
        t = step * tau / 32
        direction = Vector((sin(t), -cos(t), 0))
        origin = Vector((0, neck.y, neck.z + 0.012 - 0.116 * max(0, cos(t))**1.8))
        point = skin.around(origin, direction, 0.002)
        if point is None:
            raise ValueError("Necklace cord could not be fitted to the skin")
        path.append(point)
    cord = MeshLayer()
    cord.strip(path, [0.00155] * len(path), sides=5)
    center = path[0] + Vector((0, -0.002, -0.011))
    charm = MeshLayer()
    rim = [center + Vector((0.009 * sin(t * tau / 24), 0, 0.0105 * cos(t * tau / 24)))
           for t in range(25)]
    charm.strip(rim, [0.0016] * len(rim), sides=5, normal=lambda _: Vector((0, -1, 0)))
    charm.vertices.extend(rim[:-1])
    charm.faces.append(tuple(range(len(charm.vertices) - 24, len(charm.vertices))))
    return [cord.attach(body, material("Waxed necklace cord", (0.041, 0.025, 0.015), 0.86), skin.weight),
            charm.attach(body, material("Worn brass pendant", (0.45, 0.25, 0.066), 0.43, 0.65),
                         lambda _: skin.weight(center))]


def shorts_seams(body, rig):
    cloth = Surface(body, "Board shorts")
    hips = rig.data.bones["Hips"].head_local
    seams = MeshLayer()
    # Short fly and curved pocket openings follow the actual garment surface.
    outlines = [
        [(0.009 + 0.008 * sin(t * pi / 16), hips.z + 0.098 - 0.14 * t / 16) for t in range(17)],
        *[[(side * (0.104 + 0.061 * t / 16), hips.z + 0.087 - 0.101 * t / 16) for t in range(17)]
          for side in (-1, 1)],
    ]
    for outline in outlines:
        path = [p for x, z in outline if (p := cloth.front(x, z, 0.001)) is not None]
        if len(path) > 1:
            seams.strip(path, [0.0011] * len(path), sides=4)
    return seams.attach(body, material("Charcoal topstitching", (0.060, 0.064, 0.058), 0.93), cloth.weight)


def main(source, output, config, survivor):
    recipe = json.loads(Path(config).read_text())["people"][survivor]["sculpt"]
    if recipe["style"] != "cook-islands-ozzy":
        raise ValueError(f"Unimplemented sculpt style: {recipe['style']}")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    body = bpy.data.objects[f"Survivor_{survivor}"]
    rig = body.parent
    head = rig.data.bones["Head"].head_local.copy()
    if body.matrix_world.translation.length > 1e-5 or rig.matrix_world.translation.length > 1e-5:
        raise ValueError("Expected an unoptimized foundation in armature rest space")

    sculpt(body, head, recipe["strokes"])
    for name in ("Skin", "Skin details"):
        shader = body.data.materials[name].node_tree.nodes.get("Principled BSDF")
        tint = shader.inputs["Base Color"]
        if tint.is_linked:
            upstream = tint.links[0].from_node
            if upstream.type == "MIX":
                for socket in upstream.inputs:
                    if socket.type == "RGBA" and not socket.is_linked:
                        socket.default_value = (0.76, 0.47, 0.29, 1)
        shader.inputs["Roughness"].default_value = 0.74
    skin = Surface(body, "Skin")
    additions = [
        hair(body, head, recipe), stubble(body, head, skin, recipe),
        *necklace(body, rig, skin), shorts_seams(body, rig),
    ]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [body, *additions]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    # Export the skinned art in rest space. bind.py preserves the original clips.
    rig.animation_data.action = None
    bpy.ops.export_scene.gltf(
        filepath=str(output), export_format="GLB", export_animations=False, export_morph=False,
        export_image_format="AUTO",
    )


if __name__ == "__main__":
    src, dest, config_path, survivor_id = sys.argv[sys.argv.index("--") + 1:]
    main(Path(src), Path(dest), config_path, survivor_id)
