"""Reference-sculpted Blender Studio anatomy studies for the cast style gate."""
import bpy
from math import cos, exp, pi, sin, sqrt
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
import numpy as np
import sys


TAU = 2 * pi
UP = Vector((0, 0, 1))


def srgb(rgb):
    def linear(channel):
        return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4
    return tuple(linear(int(rgb[i:i + 2], 16) / 255) for i in (0, 2, 4))


def mix(a, b, t):
    t = min(1, max(0, t))
    return tuple((1 - t) * x + t * y for x, y in zip(a, b))


def mul(a, amount):
    return tuple(min(1, max(0, x * amount)) for x in a)


def bell(x, center, width):
    return exp(-((x - center) / width) ** 2)


def ramp(value, start, end):
    t = min(1, max(0, (value - start) / (end - start)))
    return t * t * (3 - 2 * t)


def shader(name, roughness, coat=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    color = nodes.new('ShaderNodeVertexColor')
    color.layer_name = 'Albedo'
    mat.node_tree.links.new(color.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Specular IOR Level'].default_value = .30
    bsdf.inputs['Coat Weight'].default_value = coat
    return mat


def paint(mesh, colors):
    layer = mesh.color_attributes.new(name='Albedo', type='BYTE_COLOR', domain='POINT')
    for entry, color in zip(layer.data, colors):
        entry.color = (*color, 1)
    for face in mesh.polygons:
        face.use_smooth = True


def geometry(name, vertices, faces, colors, material):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    paint(mesh, colors)
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def surface(name, rows, cols, sample, material, wrap=False):
    vertices, colors, faces = [], [], []
    for row in range(rows + 1):
        for col in range(cols if wrap else cols + 1):
            p, c = sample(row / rows, col / cols)
            vertices.append(p)
            colors.append(c)
    stride = cols if wrap else cols + 1
    for row in range(rows):
        for col in range(cols):
            a, b = row * stride + col, row * stride + (col + 1) % stride
            faces.append((a, a + stride, b + stride, b))
    return geometry(name, vertices, faces, colors, material)


def loft(name, points, width, height, tint, material, phase=0, steps=10):
    # Elliptical cross-section gives locks both a polished highlight and a shadow valley.
    points = list(map(Vector, points))
    def sample(u, v):
        index = round(u * (len(points) - 1))
        tangent = (points[min(index + 1, len(points) - 1)] - points[max(0, index - 1)]).normalized()
        sideways = tangent.cross(Vector((0, -1, .15))).normalized()
        if sideways.length < .1:
            sideways = tangent.cross(UP).normalized()
        normal = tangent.cross(sideways).normalized()
        angle = v * TAU
        taper = .18 + .82 * sin(pi * (.06 + .92 * u)) ** .65
        p = points[index] + taper * (width * cos(angle) * sideways + height * sin(angle) * normal)
        c = mul(tint, .78 + .19 * sin(angle + phase) + .28 * sin(angle * 2 + .4) ** 4 + .12 * u)
        return p, c
    return surface(name, len(points) - 1, steps, sample, material, True)


def surface_bvh(obj):
    return BVHTree.FromPolygons([v.co for v in obj.data.vertices], [p.vertices for p in obj.data.polygons])


def ray_surface(bvh, start, direction):
    result, normal, _, _ = bvh.ray_cast(Vector(start), Vector(direction).normalized())
    return (result, normal) if result is not None else (Vector(start), Vector(direction).normalized())


def press_cloth(body, label, distance, tint, material, lining, ease=.005):
    # Cut against the actual body triangles so the armholes and hems follow the sculpt.
    mesh = body.data
    mesh.calc_loop_triangles()
    vertices, colors, faces = [], [], []
    vertices_by_edge = {}
    def add(key, p, n):
        if key not in vertices_by_edge:
            vertices_by_edge[key] = len(vertices)
            ripple = .0011 * sin(p.x * 91 + p.z * 18) * sin(p.z * 27 + p.y * 42)
            vertices.append(p + n * (ease + ripple))
            seam = 1 - ramp(distance(p), .001, .012)
            fabric = .97 + .025 * sin(p.x * 173 + p.z * 31) + .05 * sin(p.x * 39 - p.z * 24)
            colors.append(mix(mul(tint, fabric), lining, seam * .83))
        return vertices_by_edge[key]
    values = [distance(v.co) for v in mesh.vertices]
    for tri in mesh.loop_triangles:
        polygon = []
        indices = list(tri.vertices)
        for i, a in enumerate(indices):
            b = indices[i - 1]
            av, bv = values[a], values[b]
            va, vb = mesh.vertices[a], mesh.vertices[b]
            if (av > 0) != (bv > 0):
                w = bv / (bv - av)
                polygon.append(add(tuple(sorted((a, b))), vb.co.lerp(va.co, w), vb.normal.lerp(va.normal, w).normalized()))
            if av > 0:
                polygon.append(add((a,), va.co, va.normal))
        if len(polygon) >= 3:
            faces.append(polygon)
    return geometry(label, vertices, faces, colors, material)


def palette_study(id):
    # Values are landmark and garment choices for the three individual art studies.
    if id == 4:
        return dict(gender='male', skin='ba8262', blush='a75545', lip='924e45', iris='442c20',
                    brow=.003, build=1.09, depth=1.05, stature=1.035,
                    top='29282c', seam='3b4245', bottom='292a32', bottom_seam='693f45',
                    hair='241c1c', edge='5b3a30', head='cap')
    if id == 10:
        return dict(gender='female', skin='8c5339', blush='9f493f', lip='78413e', iris='30221d',
                    brow=.004, build=1.25, depth=1.22, stature=1.0,
                    top='277d79', seam='52a49c', bottom='494458', bottom_seam='66596b',
                    hair='251d21', edge='553733', head='braids')
    if id == 11:
        return dict(gender='female', skin='b98264', blush='b06352', lip='a35956', iris='442922',
                    brow=.009, build=1.05, depth=1.04, stature=.955,
                    top='824d58', seam='b88691', bottom='514e5c', bottom_seam='706776',
                    hair='2b1f24', edge='674137', head='sweep')
    raise ValueError(f'Unknown style study {id}')


# Source landmarks are in meters relative to the eye line on the Studio sculpt.
# Each tuple is (x, height, outward-x, toward-camera, up). The front and three-
# quarter studies use independent adjustments for the three faces.
FACE_CAGES = {
    4: (
        (.061, -.038, .010, .004, .003), (.059, -.068, .012, .004, .002),
        (.035, -.097, .006, .005, -.003), (.000, -.106, .000, .006, -.003),
        (.033, -.066, .007, .004, .009), (.015, -.070, .003, .003, .001),
        (.012, -.041, .003, .001, -.001), (.000, -.037, .000, .006, -.002),
        (.000, -.014, .000, .006, .000), (.049, .001, -.001, .002, -.003),
        (.034, .004, .000, .001, -.002), (.019, .000, .001, .000, .001),
        (.032, .025, .001, .004, -.003),
    ),
    10: (
        (.056, -.033, .014, .007, .004), (.051, -.065, .012, .007, .006),
        (.035, -.087, .010, .006, .003), (.000, -.109, .000, .003, .003),
        (.029, -.062, .007, .005, .011), (.013, -.068, .005, .006, .003),
        (.015, -.040, .007, .004, -.001), (.000, -.036, .000, .001, .001),
        (.000, -.015, .000, -.003, -.001), (.047, .000, -.001, .003, .002),
        (.034, .004, .000, .002, -.001), (.018, .000, .001, -.001, .002),
        (.031, .024, .001, .000, -.003),
    ),
    11: (
        (.059, -.030, .009, .006, .005), (.055, -.061, .006, .004, .001),
        (.036, -.086, .003, .000, .003), (.000, -.106, .000, .003, .003),
        (.028, -.063, .005, .004, .007), (.012, -.067, .004, .005, .002),
        (.014, -.040, .005, .003, -.001), (.000, -.039, .000, .007, .000),
        (.000, -.018, .000, .004, .000), (.047, .001, -.001, .002, .004),
        (.034, .004, .001, .000, -.001), (.017, .000, .001, .000, .001),
        (.031, .023, .002, .001, .005),
    ),
}


def facial_cage(id, eye_z):
    points = []
    offsets = []
    for x, z, dx, dy, dz in FACE_CAGES[id]:
        for side in (-1, 1) if x else (1,):
            points.append((x * side, z))
            offsets.append((dx * side, -dy, dz * (1.08 if side == 1 else .92)))
    for x, z in ((0, .081), (-.072, .041), (.072, .041), (-.081, -.071),
                 (.081, -.071), (-.043, -.134), (.043, -.134), (0, -.137)):
        points.append((x, z))
        offsets.append((0, 0, 0))
    points = np.array(points)
    radius = .022
    distances = np.sum((points[:, None, :] - points[None, :, :]) ** 2, axis=2)
    weights = np.linalg.solve(np.exp(-distances / radius ** 2) + .018 * np.eye(len(points)), offsets)

    def deform(x, y, z):
        reach = np.exp(-np.sum((points - (x, z - eye_z)) ** 2, axis=1) / radius ** 2)
        return Vector(reach @ weights) * ramp(-y, .053, .123)
    return deform


def authored_actor(base, id):
    art = palette_study(id)
    prefix = 'GEO-body_' + art['gender'] + '_realistic'
    with bpy.data.libraries.load(str(base)) as (src, dst):
        dst.objects = [name for name in src.objects if name.startswith(prefix)]
    body = next(o for o in dst.objects if o.name == prefix)
    body.location = (0, 0, 0)
    for obj in dst.objects:
        bpy.context.collection.objects.link(obj)
        for modifier in list(obj.modifiers):
            obj.modifiers.remove(modifier)
    bpy.context.view_layer.update()
    eye_z = 1.53444 if art['gender'] == 'female' else 1.5737
    mouth_z = eye_z - (.066 if art['gender'] == 'female' else .070)
    height = art['stature']
    deform_face = facial_cage(id, eye_z)
    def sculpt(p):
        x, y, z = p
        a = abs(x)
        torso = bell(z, .99, .38) * (1 - ramp(a, .16, .37))
        leg = bell(z, .56, .43) * .51
        upper_arm = bell(z, 1.06, .24) * ramp(a, .16, .3) * .33
        weight = min(1, torso + leg + upper_arm)
        x *= 1 + (art['build'] - 1) * weight
        y *= 1 + (art['depth'] - 1) * weight
        displacement = deform_face(x, y, z)
        return Vector((x + displacement.x, y + displacement.y, (z + displacement.z) * height))
    skin, blush, lip, iris = (srgb(art[k]) for k in ('skin', 'blush', 'lip', 'iris'))
    colors = []
    for v in body.data.vertices:
        x, y, z = v.co
        a = abs(x)
        face = ramp(-y, .063, .135)
        color = mul(skin, 1 + .09 * sin(z * 11) + .023 * sin(z * 163 + x * 117))
        rosy = face * (.47 * bell(a, .046, .024) * bell(z, eye_z - .027, .027)
                      + .44 * bell(a, 0, .016) * bell(z, eye_z - .04, .018))
        color = mix(color, blush, rosy)
        lip_band = bell(z, mouth_z + .0017, .0069) * (1 - ramp(a, .017, .032)) * ramp(-y, .097, .138)
        color = mix(color, lip, lip_band * .85)
        color = mix(color, mul(blush, .7), face * .18 * bell(a, .033, .024) * bell(z, eye_z + .005, .010))
        colors.append(color)
        v.co = sculpt(v.co)
    body.name = 'Studio anatomy with individual landmark sculpt'
    body.data.materials.append(shader('Warm skin', .63))
    paint(body.data, colors)
    eye_shader = shader('Iris and sclera', .31, .08)
    for eye in [o for o in dst.objects if o != body]:
        world = eye.matrix_world.copy()
        center = world.translation
        eye.parent = None
        eye.matrix_world.identity()
        eye.location = (0, 0, 0)
        eye.rotation_euler = (0, 0, 0)
        eye.scale = (1, 1, 1)
        colors = []
        for v in eye.data.vertices:
            p = world @ v.co
            rel = p - center
            r = sqrt((rel.x + .0004) ** 2 + (rel.z * .94) ** 2)
            phi = (rel.x * 278 + rel.z * 211)
            sclera = mix(srgb('baa6a2'), srgb('e9dbc9'), ramp(-rel.y, .004, .012))
            c = mix(mul(iris, 1.2 + .34 * sin(phi * 9)), srgb('241c1d'), ramp(r, .0052, .0065))
            c = mix(srgb('15151b'), c, ramp(r, .0022, .0032))
            c = mix(c, sclera, max(ramp(r, .0063, .0071), 1 - ramp(-rel.y, .006, .010)))
            colors.append(c)
            v.co = sculpt(center + Vector((rel.x * 1.02, rel.y, rel.z * 1.04)))
        eye.data.materials.append(eye_shader)
        paint(eye.data, colors)

    bvh = surface_bvh(body)
    hair_color = srgb(art['hair'])
    highlight = srgb(art['edge'])
    hair_mat = shader('Groom with carved directional highlights', .76)
    fabric = shader('Matte expedition fabric', .82)
    feature_mat = shader('Brow and beard fiber', .74)
    eyes_at = eye_z * height
    skull = Vector((0, -.026, eyes_at + .020))
    def head_ray(d):
        d = Vector(d).normalized()
        p, _ = ray_surface(bvh, skull + d * .21, -d)
        return p, d
    def face_point(x, z, clearance=.0012):
        p, _ = ray_surface(bvh, (x, -.42, z), (0, 1, 0))
        p.y -= clearance
        return p

    for side in (-1, 1):
        def brow(u, v):
            x = side * (.014 + (.047 if id != 11 else .042) * u)
            z = eyes_at + .020 + art['brow'] * sin(pi * u) + (.002 if side == 1 else 0)
            z -= .004 * u * u
            z += (v - .5) * (.00085 + .0048 * sin(pi * (.17 + .82 * u)))
            p = face_point(x, z, .00085)
            taper = max(.25, ramp(u, 0, .10) * (1 - ramp(u, .86, 1)))
            c = mix(hair_color, highlight, .11 + .23 * sin(u * 84 + v * 4) ** 2)
            return p, mix(skin, c, taper)
        surface('Individual brow', 24, 4, brow, feature_mat)

    if art['head'] in ('braids', 'sweep'):
        braided = art['head'] == 'braids'
        def flow_point(u, phi):
            edge = 1.17 + .77 * (1 - cos(phi)) * .5
            theta = .006 + u * edge
            flow = phi + (.31 if braided else -.54) * (1 - u) + .045 * sin(u * 6)
            return head_ray((sin(theta) * sin(flow), -sin(theta) * cos(flow), cos(theta)))

        def scalp(u, v):
            phi = TAU * v
            p, d = flow_point(u, phi)
            rib = sin(phi * (19 if braided else 24) + 2.5 * u) ** 6
            fuzz = .28 * sin(phi * 97 + 2 * u) ** 4
            p += d * (.0021 + .0009 * rib)
            c = mix(hair_color, highlight, .025 + .26 * rib + fuzz * .20)
            return p, mix(c, mul(skin, .62), ramp(u, .975, 1) * .45)
        surface('Scalp, directed sweep', 28, 112, scalp, hair_mat, True)
        count = 24 if braided else 21
        for i in range(count):
            phi = TAU * i / count
            path = []
            for j in range(32):
                u = .14 + .84 * j / 31
                wander = (.020 if braided else .044) * sin(u * 8 + i * .49)
                p, d = flow_point(u, phi + wander)
                path.append(p + d * (.0029 + .0007 * sin(j * 1.2 + i)))
            loft('Tight scalp braid' if braided else 'Swept scalp ribbon', path,
                 .0031 if braided else .0034, .0012, hair_color, hair_mat, i, 6)

        # Curved woven fabric has rolled edges and a small off-center seam.
        primary, accent = map(srgb, ('9d4432', 'e4a04f') if braided else ('28528c', 'bf5845'))
        def band(u, v):
            phi = TAU * v
            d = Vector((sin(phi), -cos(phi), 0))
            z = eyes_at + .035 + (.023 if braided else .020) * u + .010 * (1 - cos(phi)) * .5 - .004 * sin(phi + .3)
            origin = Vector((0, -.025, z))
            p, _ = ray_surface(bvh, origin + d * .2, -d)
            p += d * (.005 + .0016 * sin(pi * u))
            trim = .92 * max(1 - ramp(u, 0, .13), ramp(u, .79, 1))
            stripe = .56 * sin(phi * 7 + u * 10) ** 12 * sin(pi * u) ** 3
            c = mix(primary, accent, max(trim, stripe))
            return p, mul(c, .95 + .09 * sin(phi * 48 + 2 * u) ** 4)
        surface('Woven head wrap', 8, 96, band, fabric, True)

        crown = max(v.co.z for v in body.data.vertices)
        center = Vector((-.009 if braided else .016, .007 if braided else .025, crown + (.009 if braided else .004)))
        radius = .038 if braided else .033
        def bun(u, v):
            theta, phi = pi * (.004 + .992 * u), TAU * v
            ridge = cos(phi * (13 if braided else 8) + theta * 7) ** 6
            r = radius * (1 + .056 * ridge)
            p = center + Vector((r * sin(theta) * cos(phi), r * (1.08 if braided else 1.17) * sin(theta) * sin(phi), r * (.90 if braided else .72) * cos(theta)))
            return p, mix(hair_color, highlight, .035 + .17 * ridge)
        surface('Groom knot volume', 25, 64, bun, hair_mat, True)
        for index in range(15 if braided else 9):
            phi = TAU * index / (15 if braided else 9)
            path = []
            for j in range(26):
                u = j / 25
                theta = .19 + 2.55 * u
                t = phi + (2.4 if braided else 1.8) * u
                r = radius + .0018
                path.append(center + Vector((r * sin(theta) * cos(t), r * (1.08 if braided else 1.17) * sin(theta) * sin(t), r * (.90 if braided else .72) * cos(theta))))
            loft('Braid ribbon' if braided else 'Swept knot lock', path, .0029 if braided else .0032, .0017, hair_color, hair_mat, index, 6)
        if not braided:
            for i in range(15):
                turn = i * .16 + .24
                start, d = flow_point(.69 + (i % 3) * .075, turn)
                start += d * (.004 + i % 3 * .002)
                path = []
                for j in range(29):
                    t = j / 28
                    w = sin(t * 10.8 + i * .62)
                    path.append(start.lerp(Vector((.084 + i * .004, -.043 + i * .010,
                                                  eyes_at - .108 - (i % 5) * .014)), t)
                                + Vector((.025 * sin(pi * t) + .008 * w * t,
                                          .038 * sin(pi * t) + .009 * w * t, -.006 * w * t)))
                loft('Side-swept loose wave', path, .008 + i % 4 * .0012, .0047,
                     mix(hair_color, highlight, .16 + .13 * sin(i)), hair_mat, i * .3, 8)
    else:
        cap = srgb('a83e3e')
        stitching = srgb('cf8070')
        def cap_edge(phi):
            return 1.38 + .25 * (1 - cos(phi)) * .5
        def cap_point(theta, phi):
            p, d = head_ray((sin(theta) * sin(phi), -sin(theta) * cos(phi), cos(theta)))
            return p + d * .0054, d
        def panel(u, v):
            phi = TAU * v
            p, d = cap_point(.004 + cap_edge(phi) * u, phi)
            seam = cos(phi * 3) ** 82
            p += d * (.0031 * sin(pi * u) + .001 * seam)
            return p, mix(mul(cap, .97 + .09 * cos(phi * 6)), stitching, .24 * seam + .21 * ramp(u, .95, 1))
        surface('Six panel red cap', 24, 96, panel, fabric, True)
        def visor(u, v):
            arc = (v - .5) * 2.05
            length = .061 * cos(arc * 1.26) + .003
            root, _ = cap_point(cap_edge(arc), arc)
            p = root + Vector((sin(arc) * .013 * u, -length * u, -.014 * u - .004 * u * abs(sin(arc))))
            stripe = .43 * max(bell(u, .83, .018), bell(u, .95, .018))
            return p, mix(mul(cap, .72 + .16 * (1 - u)), stitching, stripe)
        visor_mesh = surface('Curved layered visor', 18, 54, visor, fabric)
        solidify = visor_mesh.modifiers.new('Visor thickness', 'SOLIDIFY')
        solidify.thickness = .0026

        # Stitched initial is drawn from original curves, with a high, visible visor.
        stroke = srgb('eee4c9')
        for glyph_path in (
            ((-.009, .052), (-.009, .079)),
            ((-.009, .078), (.004, .078), (.011, .073), (.009, .067), (-.008, .064)),
            ((-.008, .064), (.007, .064), (.013, .059), (.009, .053), (-.009, .052)),
        ):
            points = []
            for x, dz in glyph_path:
                p = face_point(x, eyes_at + dz, .0067)
                points.append(p)
            loft('Embroidered initial', points, .0017, .0015, stroke, fabric, .1, 6)

        def beard_region(label, x_span, center_z, width, top):
            def strand(u, v):
                x = x_span[0] + (x_span[1] - x_span[0]) * u
                z = center_z(x) + (v - .5) * width(x)
                p = face_point(x, z, .0009 + .00045 * sin(x * 760 + v * 4) ** 4)
                c = mix(hair_color, highlight, .18 + .38 * sin(x * 646 + v * 3) ** 6)
                return p, mix(skin, c, ramp(min(v, 1 - v), 0, .105) * top(u))
            surface(label, 48, 9, strand, feature_mat)
        for side in (-1, 1):
            beard_region('Close shaped mustache', (.0015 * side, .036 * side),
                         lambda x: mouth_z * height + .011 - .17 * abs(x),
                         lambda x: .009 + .003 * bell(abs(x), .012, .011),
                         lambda u: ramp(u, 0, .12) * (1 - ramp(u, .80, 1)))
        beard_region('Short rounded chin goatee', (-.034, .034),
                     lambda x: (mouth_z - .020) * height + .06 * abs(x),
                     lambda x: .028 * (1 - .78 * (abs(x) / .034) ** 1.3),
                     lambda u: sin(pi * u) ** .6)

    def tank(p):
        x, y, z = p
        z /= height
        ax = abs(x)
        front = ramp(-y, -.03, .072)
        high = 1.361 if art['gender'] == 'female' else 1.396
        scoop = .151 if id == 10 else .133 if id == 11 else .152
        neck = high - scoop * exp(-(ax / .076) ** 4) * (.28 + .72 * front)
        sides = (.162 if art['gender'] == 'female' else .198) * art['build'] ** .45
        armhole = sides - .044 * bell(z, high - .13, .067)
        hem = .901 if id != 4 else .907
        return min(z - hem, neck - z, armhole - ax)
    press_cloth(body, 'Shaped tank with contrast binding', tank, srgb(art['top']), fabric, srgb(art['seam']), .009)

    if id == 10:
        def coverup(p):
            x, y, z = p
            z /= height
            ax = abs(x)
            front = ramp(-y, -.01, .067)
            neck = 1.375 - .142 * bell(ax, 0, .083) * front
            sleeve = .237 - .020 * bell(z, 1.182, .051)
            hem = .935 + .014 * cos(x * 52 + y * 14)
            lattice = max(abs(sin(x * 108 + z * 56)), abs(sin(z * 79 - x * 46)))
            return min(z - hem, neck - z, sleeve - ax, .032 * (lattice - .30))
        press_cloth(body, 'Ivory open-weave cover', coverup, srgb('dec6a6'), fabric, srgb('d5ba97'), .016)

    def shorts(p):
        x, _, z = p
        z /= height
        hem = .171 if id == 10 else .527 if id == 4 else .554
        leg = .168 + .090 * ramp(z, .51, .91)
        if id == 10:
            leg += .030 * ramp(z, .40, .75)
        return min(z - hem + abs(x) * .06, .924 - z, leg - abs(x))
    press_cloth(body, 'Fitted island trousers' if id == 10 else 'Fitted expedition shorts',
                shorts, srgb(art['bottom']), fabric, srgb(art['bottom_seam']), .004)
    def shoe(p):
        _, y, z = p
        return min(.091 - z / height + .07 * ramp(y, -.08, .02), .24 - abs(p.x))
    press_cloth(body, 'Light trail slip-ons', shoe, srgb('2c3335'), fabric, srgb('677778'), .008)
    return eyes_at, height


def aim(o, target):
    o.rotation_euler = (Vector(target) - o.location).to_track_quat('-Z', 'Y').to_euler()


def light(name, pos, power, size, tint, target):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.shape, data.size, data.color = power, 'DISK', size, tint
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = pos
    aim(obj, target)


def studio(path, eyes_at, height, views):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 440
    scene.render.resolution_y = 440
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.quality = 92
    scene.world = bpy.data.worlds.new('Island dusk')
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes['Background']
    background.inputs[0].default_value = (.107, .159, .192, 1)
    background.inputs[1].default_value = .68
    scene.view_settings.view_transform = 'AgX'
    target = (0, -.030, eyes_at)
    light('Canopy key', (-1.65, -3.2, 3.30), 275, 2.5, (1, .87, .74), target)
    light('Sky fill', (2.0, -1.9, 2.27), 125, 2.6, (.76, .87, 1), target)
    light('Sun edge', (1.1, 1.8, 2.75), 310, 2.1, (1, .77, .64), target)
    camera = bpy.data.objects.new('Matched study camera', bpy.data.cameras.new('Study camera'))
    bpy.context.collection.objects.link(camera)
    camera.data.type = 'ORTHO'
    scene.camera = camera
    for view in views:
        body = view == 'body-front'
        target = Vector((0, -.035, .87 * height if body else eyes_at - .014))
        camera.data.ortho_scale = 1.94 * height if body else .355
        camera.location = target + Vector((2.15 if view == 'three-quarter' else 0, -3, .045))
        aim(camera, target)
        scene.render.filepath = str(path / f'{view}.jpg')
        bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    base, dest, id, *views = sys.argv[sys.argv.index('--') + 1:]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    out = Path(dest)
    out.mkdir(parents=True, exist_ok=True)
    eyes_at, height = authored_actor(Path(base), int(id))
    bpy.ops.wm.save_as_mainfile(filepath=str(out / 'art-study.blend'))
    studio(out, eyes_at, height, views or ['front', 'three-quarter', 'body-front'])
