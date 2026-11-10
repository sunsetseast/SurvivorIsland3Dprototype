"""Author the two Art Bible benchmarks in the shipping armature's bind space."""

from math import atan2, cos, exp, pi, sin, tau
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "renaissance"))
from pilot import bell, geometry, mix, mul, paint, ramp, ray_surface, shader as vertex_shader, srgb, surface


EYE = 1.53444
HEAD = 1.40
STUDIO_BODY = "GEO-body_female_realistic"

# Hand-set displacements from the two photo boards, in meters relative to the
# Studio template. Each row is (half-width, height, outward, forward, up).
# The neutral mouth, nose and orbital controls are independent of the grooms.
CIRIE = (
    (.030, 1.568, .002, .003, .001), (.062, 1.555, .004, .006, 0),
    (.035, 1.538, .002, -.005, -.003), (.054, 1.530, .004, .003, .001),
    (.060, 1.504, .009, .007, .004), (.047, 1.486, .008, .008, .002),
    (.063, 1.471, .009, .006, .002), (.051, 1.449, .010, .006, .004),
    (.039, 1.430, .007, .003, .004), (0, 1.427, 0, -.005, .006),
    (.014, 1.502, .006, .002, -.001), (0, 1.510, 0, -.003, .001),
    (0, 1.529, 0, -.006, 0), (.024, 1.469, .004, .006, .004),
    (0, 1.474, 0, .004, .001), (0, 1.459, 0, .007, .001),
)
CAROLYN = (
    (.028, 1.570, .001, .002, .005), (.058, 1.558, -.003, .003, .003),
    (.035, 1.539, .001, -.004, .001), (.054, 1.534, -.002, .002, .003),
    (.056, 1.509, .005, .009, .006), (.043, 1.487, -.006, -.008, .002),
    (.057, 1.469, -.008, -.001, -.004), (.044, 1.451, -.010, .001, -.004),
    (.025, 1.430, -.003, .002, -.003), (0, 1.425, 0, .004, -.005),
    (0, 1.529, 0, .005, .002), (0, 1.505, 0, .003, -.001),
    (.013, 1.501, -.001, .002, -.001), (.026, 1.465, .001, .002, .002),
    (0, 1.470, 0, .003, .001), (0, 1.456, 0, .001, -.001),
)


def shader(name, roughness):
    mat = vertex_shader(name, roughness)
    mat.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = .5
    return mat


def face_sculpt(rows, cirie):
    points, deltas = [], []
    for x, z, dx, dy, dz in rows:
        for side in (-1, 1) if x else (1,):
            asymmetry = .0017 * side * bell(z, 1.567, .012) if not cirie else 0
            points.append((side * x, z))
            deltas.append((side * dx, -dy, dz + asymmetry))
    for x, z in ((0, 1.61), (-.075, 1.6), (.075, 1.6),
                 (-.091, 1.54), (.091, 1.54), (-.045, 1.396), (.045, 1.396)):
        points.append((x, z))
        deltas.append((0, 0, 0))
    points = np.array(points)
    radius = .020
    distance = np.sum((points[:, None, :] - points[None, :, :]) ** 2, axis=2)
    weights = np.linalg.solve(np.exp(-distance / radius ** 2) + .012 * np.eye(len(points)), deltas)

    def shape(p):
        x, y, z = p
        side = 1 if x >= 0 else -1
        if z > HEAD:
            influence = np.exp(-np.sum((points - (x, z)) ** 2, axis=1) / radius ** 2)
            offset = Vector(influence @ weights) * ramp(-y, .072, .125)
            jaw = bell(z, 1.455, .043) * ramp(-y, -.017, .096)
            offset.x += side * jaw * (.006 if cirie else -.003)
            return p + offset

        # Preserve the rig's joint spacing. Fullness changes cross-sections,
        # with a softer pelvis, stomach and upper arms on Cirie.
        ax = abs(x)
        torso = bell(z, .998, .323) * (1 - ramp(ax, .145, .22))
        hips = bell(z, .822, .116) * (1 - ramp(ax, .14, .22))
        limb = bell(z, .63, .146) * (1 - ramp(ax, .25, .34))
        leg_center = .113 + .06 * (1 - ramp(z, .42, .81))
        if cirie:
            x += x * (.28 * torso + .26 * hips) + (x - side * leg_center) * (.30 * limb)
            y += (y + .017) * (.30 * torso + .32 * hips + .23 * limb)
            y -= .030 * bell(z, .996, .145) * ramp(-y, .022, .11) * (1 - ramp(ax, .13, .19))
            arm = ramp(ax, .145, .198) * bell(z, 1.17, .125)
            y += (y - .016) * .38 * arm
            z -= .015 * arm * ramp(ax, .13, .25)
        else:
            x += x * (.07 * torso + .065 * hips) + (x - side * leg_center) * .075 * limb
            y += (y + .017) * (.055 * torso + .05 * hips)
        return Vector((x, y, z))

    return shape


def load_studio(path):
    with bpy.data.libraries.load(str(path)) as (source, result):
        result.objects = [name for name in source.objects if name.startswith(STUDIO_BODY)]
    body = next(o for o in result.objects if o.name == STUDIO_BODY)
    body.location = (0, 0, 0)
    for obj in result.objects:
        bpy.context.collection.objects.link(obj)
        obj.modifiers.clear()
    bpy.context.view_layer.update()
    eyes = [obj for obj in result.objects if obj != body]
    for eye in eyes:
        transform = eye.matrix_world.copy()
        eye.parent = None
        eye.matrix_world.identity()
        eye.location = (0, 0, 0)
        eye.rotation_euler = (0, 0, 0)
        eye.scale = (1, 1, 1)
        for vertex in eye.data.vertices:
            vertex.co = transform @ vertex.co
    return body, eyes


def skin_color(p, cirie):
    x, y, z = p
    a = abs(x)
    skin = srgb("66432e" if cirie else "af785c")
    flush = srgb("9a5340" if cirie else "b4705a")
    lip = srgb("532f2a" if cirie else "96584c")
    face = ramp(-y, .088, .147)
    color = mul(skin, 1 + .07 * sin(z * 8 + y * 10) + .025 * sin(x * 419 + z * 193))
    cheek = bell(a, .045, .026) * bell(z, 1.493, .027)
    nose = bell(a, 0, .023) * bell(z, 1.503, .016)
    color = mix(color, flush, face * (.46 * cheek + .25 * nose))
    lip_center = 1.467 + .044 * a + (.0014 if cirie else 0)
    lips = bell(z, lip_center, .0074) * (1 - ramp(a, .017, .031)) * face
    color = mix(color, lip, lips * .84)
    socket = bell(a, .035, .027) * bell(z, 1.541, .011)
    upper_lid = bell(a, .032, .020) * bell(z, 1.543 - .10 * (a - .034), .0033)
    color = mix(color, mul(flush, .49), face * (socket * .31 + upper_lid * .27))
    if not cirie:
        under_eye = bell(a, .039, .019) * bell(z, 1.519, .007)
        smile_fold = bell(a, .020 + (1.503 - z) * .34, .0035) * bell(z, 1.485, .021)
        color = mix(color, srgb("825047"), face * (.33 * under_eye + .22 * smile_fold))
    return color


def textured_material(name, roughness, size, pigment):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = roughness
    image = bpy.data.images.new(name, *size, alpha=False)
    pixels = [channel for j in range(size[1]) for i in range(size[0])
              for channel in (*pigment(i / (size[0] - 1), j / (size[1] - 1)), 1)]
    image.pixels.foreach_set(pixels)
    image.pack()
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    mat.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def sleeve_study(body, original):
    """Asymmetric ink keyed to the visible shoulder and outer forearm references."""
    def pigment(u, t):
        right = u < .5
        v = (u * 2) % 1
        base = skin_color(Vector((.25, .016, 1.37 - .46 * t)), False)
        if not right:
            line = bell(t, .87 + .017 * sin(v * 9), .012)
            fragments = .60 + .40 * sin(v * 130) ** 2
            return mix(base, srgb("4e3d39"), .82 * line * fragments *
                       ramp(v, .32, .39) * (1 - ramp(v, .74, .80)))
        # Only the visible color masses and a simplified petal contour are
        # represented. The hidden wrap, text and thigh art are left open.
        edge = ramp(v, .13, .24) * (1 - ramp(v, .76, .91)) * ramp(t, .025, .12) * (1 - ramp(t, .93, 1))
        blue = bell(t, .48 + .06 * sin(v * 10), .24) * bell(v, .53, .30)
        green = bell(t, .26 + .075 * cos(v * 13), .26) * bell(v, .53, .27)
        a, b = (v - .52) * 3.0, (t - .28) * 3.5
        angle = atan2(b, a)
        flower = 1 - ramp((a * a + b * b) ** .5, .21 + .075 * cos(angle * 8), .25 + .075 * cos(angle * 8))
        red = bell(t, .80 + .035 * cos(v * 14), .10) * bell(v, .47, .23)
        color = mix(base, srgb("34534f"), min(1, .84 * blue + .52 * green))
        color = mix(color, srgb("3b6961"), .82 * green)
        color = mix(color, srgb("b88043"), flower * .84)
        color = mix(color, srgb("8d473e"), .74 * red)
        color = mix(color, srgb("565154"), .38 * bell(t, .12, .086) * bell(v, .54, .22))
        return mix(base, color, edge)

    mat = textured_material("Visible sleeve color study", .67, (384, 256), pigment)
    mesh = body.data
    mesh.materials.append(mat)
    layer = mesh.uv_layers.active or mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        verts = [original[i] for i in poly.vertices]
        center = sum(verts, Vector()) / len(verts)
        if not (.15 < abs(center.x) < .41 and .90 < center.z < 1.36):
            continue
        if abs(center.x) < .195 and center.z < 1.24:
            continue
        poly.material_index = len(mesh.materials) - 1
        for li in poly.loop_indices:
            x, y, z = original[mesh.loops[li].vertex_index]
            # The visible outer/front field occupies the middle of each lane.
            outer = abs(x) - (.165 + (1.32 - z) * .45)
            v = .50 - (y - .010) * 4.6 + .65 * outer
            v = min(.99, max(.01, v))
            t = min(.999, max(.001, (1.37 - z) / .46))
            layer.data[li].uv = ((v + (0 if x < 0 else 1)) * .5, t)


def dress_body(body, eyes, shape, cirie):
    original = [v.co.copy() for v in body.data.vertices]
    body.data.materials.append(shader("Layered skin pigment", .67))
    paint(body.data, [skin_color(p, cirie) for p in original])
    for v in body.data.vertices:
        v.co = shape(v.co)
    if not cirie:
        sleeve_study(body, original)

    eye_mat = shader("Iris, limbus and sclera", .33)
    iris = srgb("2a1813" if cirie else "455a5d")
    for eye in eyes:
        center = sum((v.co for v in eye.data.vertices), Vector()) / len(eye.data.vertices)
        colors = []
        for v in eye.data.vertices:
            rel = v.co - center
            distance = ((rel.x + .00045) ** 2 + (rel.z - .0007) ** 2) ** .5
            angle = atan2(rel.z, rel.x)
            c = mul(iris, .84 + .33 * sin(angle * 24) ** 2 + .18 * sin(distance * 890) ** 2)
            c = mix(c, srgb("23201f"), ramp(distance, .0058, .0065))
            c = mix(srgb("161617"), c, ramp(distance, .00260, .0033))
            colors.append(mix(c, srgb("9d8f86" if cirie else "b6aaa2"), max(ramp(distance, .0067, .0075),
                                                    1 - ramp(-rel.y, .006, .010))))
            # Move the eyeball as a solid, preserving its curvature.
            v.co += shape(center) - center
        eye.data.materials.append(eye_mat)
        paint(eye.data, colors)
    return original


def tube(name, points, widths, depth, material, tint, sides=7, guide=(0, 1, 0)):
    points = [Vector(p) for p in points]
    guide = Vector(guide)

    def sample(t, u):
        i = round(t * (len(points) - 1))
        direction = (points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]).normalized()
        width = direction.cross(guide).normalized()
        if width.length < .001:
            width = direction.cross(Vector((1, 0, 0))).normalized()
        normal = width.cross(direction).normalized()
        a = tau * u
        p = points[i] + widths[i] * (cos(a) * width + depth * sin(a) * normal)
        return p, tint(t, a)

    return surface(name, len(points) - 1, sides, sample, material, wrap=True)


def face_details(body_bvh, cirie):
    hair = shader("Brows and upper lid", .86)
    dark = srgb("2a201c" if cirie else "4b3125")
    for side in (-1, 1):
        def brow(t, u):
            x = side * (.014 + .047 * t)
            z = EYE + .023 + (.004 if cirie else .009) * sin(pi * t) - .004 * t * t
            z += (u - .5) * (.001 + .007 * sin(pi * (.08 + .91 * t)))
            z += .0024 * side if not cirie else .0007 * side
            p, _ = ray_surface(body_bvh, (x, -.35, z), (0, 1, 0))
            p.y -= .00055
            skin = skin_color(p, cirie)
            fiber = mul(dark, .89 + .31 * sin(t * 93 + u * 5) ** 2)
            edge = ramp(t, 0, .14) * (1 - ramp(t, .83, 1))
            return p, mix(skin, fiber, sin(pi * u) ** .45 * edge)
        surface("Shaped asymmetric brow", 19, 4, brow, hair)


def oval_point(center, radii, t, u):
    angle = pi * (.006 + .988 * t)
    return Vector(center) + Vector((radii[0] * sin(angle) * sin(u * tau),
                                    -radii[1] * sin(angle) * cos(u * tau),
                                    radii[2] * cos(angle)))


def groom(body_bvh, cirie):
    mat = shader("Directional hair pigment", .87)
    shadow, mid, light = map(srgb, ("171518", "292329", "4e4140") if cirie else
                             ("392b23", "84663f", "c6a16b"))
    center = Vector((0, -.047, 1.559))

    def crown(theta, phi, lift):
        d = Vector((sin(theta) * sin(phi), -sin(theta) * cos(phi), cos(theta)))
        p, _ = ray_surface(body_bvh, center + d * .23, -d)
        return p + d * lift

    def scalp(t, u):
        phi = tau * u
        edge = 1.11 + .96 * (1 - cos(phi)) * .5
        angle = .006 + edge * t
        p = crown(angle, phi, .003 + .0006 * sin(phi * 37 + t * 4))
        return p, mix(shadow, mid, .25 + .34 * sin(phi * 29 + 3 * t) ** 4)

    surface("Root mass cut to the hairline", 12, 40, scalp, mat, True)
    if cirie:
        for index in range(17):
            lane = (index / 16 - .5) * 1.72
            points = []
            for j in range(22):
                t = j / 21
                sweep = -1.12 + 2.99 * t
                # Bend the rows around the temples and converge toward the tie.
                side = lane * (.86 + .14 * sin(pi * t)) * (1 - .49 * ramp(t, .60, 1))
                d = Vector((side, sin(sweep), cos(sweep))).normalized()
                p, _ = ray_surface(body_bvh, center + d * .23, -d)
                points.append(p + d * (.0036 + .00055 * sin(t * 55 + index)))
            widths = [.0009 + .0024 * sin(pi * j / 21) ** .6 for j in range(22)]
            tube("Narrow braid following scalp", points, widths, .80, mat,
                 lambda t, a: mix(shadow, light, .17 + .40 * sin(t * 107 + a * 2) ** 6),
                 sides=6, guide=(0, 0, 1))
        knot_center = (0, .065, 1.466)
        surface("Folded low braid gather", 14, 28, lambda t, u:
                (oval_point(knot_center, (.027, .030, .024), t, u),
                 mix(shadow, light, .10 + .34 * sin(u * tau * 13 + t * 13) ** 6)), mat, True)
        for index in range(6):
            phi = tau * index / 6
            points = []
            for j in range(13):
                t = j / 12
                radial = .017 + .008 * sin(pi * t)
                points.append(Vector((radial * sin(phi + t * 2.3), .054 + .035 * sin(pi * t),
                                      1.466 + radial * cos(phi + t * 2.3))))
            tube("Folded low braid contour", points, [.0033] * 13, .78, mat,
                 lambda t, a: mix(shadow, light, .13 + .29 * sin(a * 2 + t * 47) ** 4),
                 sides=6, guide=(0, 0, 1))
        return

    for index in range(30):
        phi = tau * index / 30
        points = []
        for j in range(15):
            t = j / 14
            target = (1.08 + .84 * (1 - cos(phi)) * .5)
            points.append(crown(.11 + target * t, phi + .18 * (1 - t) + .05 * sin(t * 6), .004))
        tube("Root mass directional sweep", points,
             [.0006 + .0035 * sin(pi * j / 16) ** .66 for j in range(15)], .37, mat,
             lambda t, a: mix(shadow, mid, .35 + .45 * sin(index * 6 + a * 2) ** 4),
             sides=4, guide=(0, 0, 1))

    rng = Random(17044)
    for row in range(3):
        for side in (-1, 1):
            for i in range(7):
                back = i >= 3
                depth_lane = (i - 3) / 3 if back else i / 2
                phi = side * (1.07 + .32 * i + row * .055)
                root = crown(1.26 + .12 * row, phi, .008 + row * .003)
                end_z = 1.073 + rng.uniform(-.058, .056) + .025 * row
                width = rng.uniform(.007, .011) * (1.12 if row == 0 else 1)
                phase = rng.uniform(-1, 1) + i * .8
                if back:
                    end_x = side * (.039 + .082 * depth_lane + .008 * row)
                    end_y = .077 + .026 * row + .018 * sin(i * .7)
                else:
                    end_x = side * (.069 + .068 * depth_lane + .009 * row)
                    end_y = -.127 - .021 * row + .012 * i
                points, widths = [], []
                for j in range(18):
                    t = j / 17
                    n = ramp(t, .02, .63)
                    wave = sin(t * 15 + phase) * sin(pi * t) * (.007 + .002 * row)
                    flare = (.024 if not back else .014) * bell(t, .52, .20)
                    x = root.x * (1 - n) + end_x * n + side * flare + wave
                    y = root.y * (1 - n) + end_y * n + .009 * sin(t * 17 + phase) * sin(pi * t)
                    z = root.z + (end_z - root.z) * t
                    points.append(Vector((x, y, z)))
                    widths.append(width * (.18 + .82 * ramp(t, 0, .24)) *
                                  (1 - .92 * ramp(t, .72 + .04 * (i % 3), 1)))
                tone = rng.uniform(.27, .89)
                tube("Released blonde wave", points, widths, .40, mat,
                     lambda t, a: mix(shadow, mix(mid, light, tone * (.52 + .42 * sin(a * 3 + phase) ** 2)),
                                      .36 + .61 * ramp(t, .02, .38)),
                     sides=6)


def set_wrap_uv(obj, columns):
    uv = obj.data.uv_layers.new(name="UVMap")
    rows = len(obj.data.polygons) // columns
    for face in obj.data.polygons:
        row, col = divmod(face.index, columns)
        corners = ((col / columns, row / rows), (col / columns, (row + 1) / rows),
                   ((col + 1) / columns, (row + 1) / rows), ((col + 1) / columns, row / rows))
        for li, coordinate in zip(face.loop_indices, corners):
            uv.data[li].uv = coordinate


def head_buff(body_bvh, cirie):
    main, edge, accent = map(srgb, ("2f78a0", "14364c", "d6a658") if cirie else
                             ("855fa3", "442c62", "72b4a9"))

    def print_cloth(u, v):
        weave = .95 + .045 * sin(u * 620) * sin(v * 680)
        trim = max(1 - ramp(v, .037, .12), ramp(v, .85, .94))
        wave = cos(u * tau * 9 + .39 * sin(v * tau * 2))
        medallion = ramp(wave * sin(pi * v) ** 1.6, .58, .92)
        secondary = ramp(sin(u * tau * 21 - v * 11) ** 8, .29, .90)
        return mul(mix(mix(main, edge, trim * .73 + .14 * secondary), accent,
                       .74 * medallion * (1 - trim)), weave)

    mat = textured_material("Woven Heroes blue" if cirie else "Woven Tika purple",
                            .79, (256, 64), print_cloth)

    def band(t, u):
        phi = tau * u
        d = Vector((sin(phi), -cos(phi), 0))
        back = (1 - cos(phi)) * .5
        z = 1.574 + .031 * t - .069 * back + .003 * sin(phi + .8)
        center = Vector((0, -.047, z))
        p, _ = ray_surface(body_bvh, center + d * .25, -d)
        p += d * (.008 + .0019 * sin(pi * t) + .0008 * sin(phi * 8 + t * 9))
        return p, (1, 1, 1)

    band_obj = surface("Forehead Buff", 6, 48, band, mat, True)
    set_wrap_uv(band_obj, 48)


def front_point(bvh, x, z, lift):
    p, normal = ray_surface(bvh, (x, -.46, z), (0, 1, 0))
    return p + normal * lift


def tanks(body_bvh, cirie):
    cloth = shader("Turquoise swim jersey" if cirie else "Plum jersey", .79)
    main, shade, trim, flash = map(srgb, ("168e85", "0c6866", "2caa9f", "c68765") if cirie else
                                  ("653346", "452739", "824657", "a57972"))
    def body_surface(t, u):
        phi = tau * u
        f = cos(phi)
        front = max(f, 0)
        back = max(-f, 0)
        d = Vector((sin(phi), -f, 0))
        highest = 1.222 + .052 * sin(phi * 2) ** 2
        high = highest - (.071 if cirie else .051) * front ** 8 - .029 * back ** 6
        high -= .064 * sin(phi) ** 8
        hem = (.804 if cirie else .920) + .013 * back + .008 * sin(phi * 2 + 1)
        z = hem + (high - hem) * t
        center = Vector((0, -.030, z))
        p, _ = ray_surface(body_bvh, center, d)
        fold = sin(phi * 11 + t * 8) * (.0045 if cirie else .0026)
        ease = .007 + (.013 * (1 - t) ** 1.6 * (1 - .50 * back) if cirie else .004 * (1 - t))
        p += d * (ease + fold * (.30 + .70 * bell(t, .15, .28)))
        dye = mix(main, shade, .19 + .15 * sin(phi * 7 - t * 13) ** 2)
        dye = mul(dye, .99 + .08 * sin(phi * 46 + t * 12))
        if cirie:
            dye = mix(dye, trim, .90 * max(bell(t, .936, .022), bell(t, .994, .020)))
            dye = mix(dye, flash, .92 * bell(t, .966, .015))
        else:
            dye = mix(dye, trim, .78 * bell(t, .984, .024))
        return p, dye

    surface("Cut and draped torso", 24, 54, body_surface, cloth, True)
    for side in (-1, 1):
        front = body_surface(.987, (side * .49 / tau) % 1)[0]
        rear = body_surface(.988, (.5 - side * .60 / tau) % 1)[0]
        points = []
        for j in range(15):
            t = j / 14
            x = front.x * (1 - t) + rear.x * t + side * .028 * sin(pi * t)
            y = front.y * (1 - t) + rear.y * t
            p, normal = ray_surface(body_bvh, (x, y, 1.52), (0, 0, -1))
            # Blend both ends into the neckline, where the shoulder ray
            # can land well above the front and rear attachment points.
            point = front.lerp(rear, t).lerp(p + normal * .004, sin(pi * t) ** .38)
            points.append(point)
        tube("Narrow shoulder strap", points, [.0072 if cirie else .011] * len(points),
             .36, cloth, lambda t, a: mix(main, trim, .35 + .42 * cos(a) ** 6),
             guide=(0, 0, 1))
        if cirie:
            knot = points[5] + Vector((0, -.004, .004))
            for sign in (-1, 1):
                loop = [knot + Vector((sign * .015 * sin(j * pi / 11),
                                        -.010 * sin(tau * j / 11), .006 * sin(j * pi / 11)))
                        for j in range(12)]
                tube("Tied strap loop", loop, [.0026] * len(loop), .66, cloth,
                     lambda t, a: mix(trim, flash, .43 * sin(a) ** 6))
                tail = [knot + Vector((sign * .011 * t, -.009 * t, -.027 * t)) for t in (0, .34, .68, 1)]
                tube("Tied strap tail", tail, [.0029, .0029, .0026, .001], .64, cloth,
                     lambda t, a: mix(trim, flash, .29 * cos(a) ** 4))

    if not cirie:
        def placket(t, u):
            z = 1.172 - .111 * t
            x = .005 + (u - .5) * .019 + .006 * t
            p = front_point(body_bvh, x, z, .019)
            return p, mix(shade, trim, .26 + .28 * cos(tau * u) ** 4)

        surface("Plum button placket", 14, 4, placket, cloth)
        button = shader("Dull shell buttons", .47)
        for i in range(4):
            z = 1.158 - .023 * i
            p = front_point(body_bvh, .007 + i * .001, z, .022)
            surface("Small front button", 5, 8, lambda t, u:
                    (oval_point(p, (.0030, .0011, .0030), t, u), srgb("9d7880")), button, True)


def shorts(body, cirie):
    """Cut the dark lower layer against the fitted body topology."""
    mesh = body.data
    mesh.calc_loop_triangles()
    values = []
    for vertex in mesh.vertices:
        x, y, z = vertex.co
        hem = (.663 if cirie else .636) + .026 * (abs(x) / .22) ** 2
        values.append(min(z - hem, (.891 if cirie else .932) - z, .245 - abs(x)))
    indices, verts, faces, colors = {}, [], [], []
    dark, light = map(srgb, ("242329", "3a333b") if cirie else ("1d242b", "353942"))
    def add(key, p, n, edge):
        if key not in indices:
            indices[key] = len(verts)
            verts.append(p + n * (.0048 + .0010 * sin(p.x * 79 + p.z * 34)))
            colors.append(mix(dark, light, .20 + .43 * edge + .13 * sin(p.x * 87 + p.z * 31)))
        return indices[key]

    for tri in mesh.loop_triangles:
        face = []
        triangle = list(tri.vertices)
        for j, a in enumerate(triangle):
            b = triangle[j - 1]
            av, bv = values[a], values[b]
            va, vb = mesh.vertices[a], mesh.vertices[b]
            if (av > 0) != (bv > 0):
                f = bv / (bv - av)
                face.append(add(tuple(sorted((a, b))), vb.co.lerp(va.co, f),
                                vb.normal.lerp(va.normal, f).normalized(), 1))
            if av > 0:
                face.append(add((a,), va.co, va.normal, 1 - ramp(av, .002, .012)))
        if len(face) >= 3:
            faces.append(face)
    geometry("Dark swim bottoms" if cirie else "Dark island shorts", verts, faces, colors,
             shader("Matte dark short fabric", .84))


def grid_shirt(body_bvh):
    linen, dark, thread = map(srgb, ("e2d8d4", "263955", "897e8a"))

    def grid(u, v):
        x = abs((u * 5 + .05 * sin(v * 13)) % 1 - .5)
        y = abs((v * 5 + .033 * cos(u * 18)) % 1 - .5)
        line = 1 - ramp(min(x, y), .025, .052)
        cloth = mul(linen, .92 + .064 * sin(u * 15 + v * 24) ** 2)
        return mix(mix(cloth, thread, .10 * sin(u * 590) ** 4), dark, .91 * line)

    mat = textured_material("White and navy windowpane cotton", .87, (256, 256), grid)
    for side in (-1, 1):
        def panel(t, u):
            # Each side folds from the front tie around the hips to the
            # rear tails, while the front remains open over the shorts.
            opening = .71 + .43 * t
            phi = side * (opening + u * (pi + .04 - opening))
            d = Vector((sin(phi), -cos(phi), 0))
            high = .926 - .015 * sin(phi + side * .6)
            low = .592 + .085 * u + .043 * cos(phi * 2) + .023 * side
            z = high + (low - high) * t
            origin = Vector((0, -.026, max(z, .766)))
            p, _ = ray_surface(body_bvh, origin, d)
            p.z = z
            p += d * (.028 + .006 * sin(phi * 11 + t * 6) + .051 * t)
            return p, (1, 1, 1)
        layer = surface("Shirt tail tied at waist", 15, 23, panel, mat)
        set_wrap_uv(layer, 23)
    for side in (-1, 1):
        def sleeve(t, u):
            center = Vector((side * (.138 * (1 - t) - .020 * t), -.101 - .035 * sin(pi * t), .931 - .045 * t))
            angle = tau * u
            p = center + Vector((.007 * sin(angle), .018 * cos(angle), .019 * sin(angle)))
            return p, (1, 1, 1)
        layer = surface("Crossed shirt sleeve at hip", 10, 10, sleeve, mat, True)
        set_wrap_uv(layer, 10)
    knot = surface("Soft tie knot", 8, 14, lambda t, u:
                   (oval_point((-.017, -.142, .891), (.034, .015, .016), t, u), (1, 1, 1)), mat, True)
    set_wrap_uv(knot, 14)


class BindFit:
    """Map Studio anatomy into the existing cast rest pose and transfer weights."""

    def __init__(self, control, fuller):
        self.control = control
        self.fuller = fuller
        self.rig = control.parent
        skin = [v for v in control.data.vertices if len(v.groups)]
        self.tree = KDTree(len(skin))
        for v in skin:
            self.tree.insert(v.co, v.index)
        self.tree.balance()
        self.leg = [self.bone("Left" + name) for name in ("UpLeg", "Leg", "Foot")]
        self.ground = min(v.co.z for v in control.data.vertices) + .012
        self.eye_line = self.bone("Head").z + .050
        self.height_scale = (self.eye_line - self.ground) / EYE
        self.arms = {}
        for side in (-1, 1):
            left = side > 0
            stem = "Left" if left else "Right"
            source = [Vector((side * x, y, z)) for x, y, z in
                      ((.161, .023, 1.317), (.262, .019, 1.087), (.342, .002, .899),
                       (.389, -.014, .803))]
            target = [self.bone(stem + n) for n in ("Arm", "ForeArm", "Hand")]
            palm = self.bone(stem + "HandMiddle1") - target[-1]
            target.append(target[-1] + palm * 1.38)
            self.arms[side] = source, target

    def bone(self, name):
        return self.rig.data.bones[name].head_local.copy()

    @staticmethod
    def arm_influence(p):
        a, z = abs(p.x), p.z
        if not .60 < z < 1.375:
            return 0
        lower = 1 - ramp(z, .86, 1.30)
        return ramp(a, .119 + .13 * lower, .182 + .10 * lower)

    def fit(self, p, arm=False):
        x, y, z = p
        side = 1 if x >= 0 else -1
        head_shift = .072 + (self.bone("Head").y - .072) * .5
        normal = Vector((x, y + .090 + (head_shift - .090) * ramp(z, 1.31, 1.46),
                         self.ground + z * self.height_scale))
        # Keep bare toes centered over the original support bones.
        if z < .54:
            foot_x = self.leg[2].x
            normal.x += side * (foot_x - .164) * (1 - ramp(z, .20, .58))
        if not arm:
            return normal
        a = abs(x)
        influence = self.arm_influence(p)
        if influence < .001:
            return normal
        source, target = self.arms[side]
        maps = []
        for i in range(3):
            line = source[i + 1] - source[i]
            t = (p - source[i]).dot(line) / line.length_squared
            origin = source[i] + t * line
            axis = target[i + 1] - target[i]
            turn = line.rotation_difference(axis)
            fullness = 1 + (.22 * bell(a, .199, .071) if self.fuller else 0)
            maps.append(target[i] + t * axis + turn @ ((p - origin) * fullness))
        first = 1 - ramp(a, .224, .287)
        last = ramp(a, .311, .365)
        fit = maps[0] * first + maps[1] * (1 - first - last) + maps[2] * last
        return normal.lerp(fit, influence)

    def weights(self, point, allowed=None, fallback="Hips"):
        nearest = self.tree.find_n(point, 10 if allowed else 5)
        values = {}
        for _, index, distance in nearest:
            for group in self.control.data.vertices[index].groups:
                name = self.control.vertex_groups[group.group].name
                if self.rig.data.bones.get(name) is not None and (allowed is None or name in allowed):
                    values[name] = values.get(name, 0) + group.weight / (.003 + distance) ** 2
        return normalized(values) or [(fallback, 1.)]

    def skin_weights(self, studio, point):
        a, z = abs(studio.x), studio.z
        if z > 1.410:
            return [("Head", 1.)]
        arm = self.arm_influence(studio)
        if arm <= .001:
            return self.weights(point)
        side = "Left" if studio.x > 0 else "Right"
        elbow = ramp(a, .227, .283)
        hand = ramp(a, .315, .350)
        # Arm samples near the pelvis must never pick up leg weights. Blend
        # through the wrist before treating the fingers as a unified hand.
        values = {side + "Arm": arm * (1 - elbow),
                  side + "ForeArm": arm * (elbow - hand), side + "Hand": arm * hand}
        if arm < 1:
            for name, value in self.weights(point, TORSO_BONES, "Spine2"):
                values[name] = values.get(name, 0) + value * (1 - arm)
        return normalized(values)


TORSO_BONES = {"Hips", "Spine", "Spine1", "Spine2", "Neck", "LeftShoulder", "RightShoulder"}


def normalized(values):
    top = sorted(((name, weight) for name, weight in values.items() if weight > 1e-6),
                 key=lambda item: -item[1])[:4]
    total = sum(weight for _, weight in top)
    return [(name, weight / total) for name, weight in top] if total else []


def add_small_details(bvh, cirie):
    metal = shader("Low-gloss jewelry", .48)
    gold = srgb("aaa18b")
    for side in (-1, 1):
        z = 1.479 if cirie else 1.477
        p, _ = ray_surface(bvh, (side * .26, -.037, z), (-side, 0, 0))
        p.x += side * .002
        surface("Small ear stud", 5, 8, lambda t, u:
                (oval_point(p, (.0021, .0025, .0025), t, u), gold), metal, True)
    if cirie:
        # The references show a narrow cord rather than a conspicuous pendant.
        points = []
        for i in range(31):
            u = tau * i / 30
            d = Vector((sin(u), -cos(u), 0))
            z = 1.354 - .071 * max(cos(u), 0) ** 3 - .015 * max(-cos(u), 0)
            c = Vector((0, -.017, z))
            p, normal = ray_surface(bvh, c + d * .23, -d)
            points.append(p + normal * .003)
        cord = shader("Fine necklace cord", .70)
        tube("Fine necklace cord", points, [.0015] * 31, 1, cord,
             lambda t, a: srgb("322722"), sides=5, guide=(0, 0, 1))


def bind_layer(obj, fit, body):
    groups = {}
    obj.parent = fit.rig
    modifier = obj.modifiers.new("Cast armature", "ARMATURE")
    modifier.object = fit.rig
    skull = obj.name.startswith(("Narrow braid", "Folded low", "Root mass", "Forehead",
                                 "GEO-body_female_realistic.eye", "Shaped asymmetric", "Small ear"))
    groom_lock = obj.name.startswith("Released blonde")
    waist_shirt = obj.name.startswith(("Shirt tail", "Crossed shirt", "Soft tie"))
    jersey = obj.name.startswith(("Cut and draped", "Narrow shoulder strap", "Tied strap",
                                 "Plum button", "Small front button", "Fine necklace"))
    for v in obj.data.vertices:
        studio = v.co.copy()
        v.co = fit.fit(studio, arm=obj == body)
        if skull:
            weights = [("Head", 1.)]
        elif groom_lock:
            hold = ramp(studio.z, 1.275, 1.45)
            weights = [("Head", hold), ("Spine2", 1 - hold)]
        elif obj == body:
            weights = fit.skin_weights(studio, v.co)
        elif waist_shirt:
            side = "Left" if studio.x > 0 else "Right"
            drape = .28 * (1 - ramp(studio.z, .63, .82))
            weights = [("Hips", 1 - drape), (side + "UpLeg", drape)]
        elif jersey:
            weights = fit.weights(v.co, TORSO_BONES)
            if fit.fuller and obj.name.startswith("Cut and draped"):
                hem = .67 * (1 - ramp(studio.z, .81, .91))
                side = ramp(studio.x, -.075, .075)
                values = {name: value * (1 - hem) for name, value in weights}
                values["LeftUpLeg"] = hem * side
                values["RightUpLeg"] = hem * (1 - side)
                weights = normalized(values)
        else:
            weights = fit.weights(v.co)
        for name, weight in weights:
            if weight < 1e-6:
                continue
            if name not in groups:
                groups[name] = obj.vertex_groups.new(name=name)
            groups[name].add([v.index], weight, "REPLACE")


def build(base, source, output, survivor_id):
    if survivor_id not in (10, 17):
        raise ValueError("Only Cirie (10) and Carolyn (17) are authored in this benchmark")
    cirie = survivor_id == 10
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source), merge_vertices=True)
    actor_name = f"Survivor_{survivor_id}"
    control = bpy.data.objects[actor_name]
    fit = BindFit(control, cirie)
    fit.rig.data.pose_position = "REST"
    fit.rig.animation_data_clear()
    body, eyes = load_studio(base)
    body.vertex_groups.clear()
    dress_body(body, eyes, face_sculpt(CIRIE if cirie else CAROLYN, cirie), cirie)
    bpy.context.view_layer.update()
    skin = BVHTree.FromPolygons([v.co for v in body.data.vertices],
                                 [p.vertices for p in body.data.polygons])
    face_details(skin, cirie)
    groom(skin, cirie)
    head_buff(skin, cirie)
    tanks(skin, cirie)
    shorts(body, cirie)
    if not cirie:
        grid_shirt(skin)
    add_small_details(skin, cirie)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and o != control]
    for obj in meshes:
        bind_layer(obj, fit, body)
    bpy.data.objects.remove(control, do_unlink=True)
    body.name = actor_name
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_animations=False,
                              export_morph=False, export_image_format="AUTO")


if __name__ == "__main__":
    base, source, output, survivor_id = sys.argv[sys.argv.index("--") + 1:]
    build(Path(base), Path(source), Path(output), int(survivor_id))
