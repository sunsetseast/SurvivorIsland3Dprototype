"""Original curl-card atlas and fitted shading for the Cook Islands look."""

from math import cos, pi, sin, tau
from random import Random

import bpy
from mathutils import Vector
import numpy as np

from model import MeshLayer, Surface, material


def hairline(azimuth):
    return 1.94 - 0.58 * np.cos(azimuth) - 0.13 * np.cos(2 * azimuth) + 0.072 * np.sin(3 * azimuth + 0.6)


def strand_atlas(seed):
    """Four tapered strand swatches and a dark opaque root swatch."""
    rng = Random(seed)
    width = 64
    u, v = np.meshgrid(np.linspace(-1, 1, width), np.linspace(0, 1, 256))
    lanes = []
    for lane in range(4):
        alpha = np.zeros(u.shape)
        pigment = np.zeros(u.shape)
        for _ in range(88):
            root = rng.uniform(-0.86, 0.86)
            phase = rng.uniform(0, tau)
            end = rng.uniform(0.72, 1.08)
            tone = rng.uniform(0.066, 0.18) + lane * rng.uniform(0.020, 0.052)
            strand = root * (1 - 0.47 * v**2) + 0.080 * np.sin(8 * v + phase) * v
            width_profile = rng.uniform(0.015, 0.036) * (1 - 0.63 * v**3)
            ink = np.clip(1.65 - np.abs(u - strand) / width_profile, 0, 1)
            ink *= np.clip((end - v) * 12, 0, 1)
            visible = ink > alpha
            tint = np.broadcast_to(tone * (0.77 + 0.25 * v), pigment.shape)
            pigment[visible] = tint[visible]
            alpha = np.maximum(ink, alpha)
        # Carry edge pigment into the transparent pixels for filtered mips.
        alpha *= np.clip((1.0 - np.abs(u)) * 3.5, 0, 1)
        pigment = np.where(pigment > 0, pigment, 0.09 + lane * 0.035)
        lanes.append(np.stack((pigment, pigment * 0.64, pigment * 0.40, alpha), axis=2))
    roots = 0.105 + 0.016 * np.sin(58 * u + 0.55 * np.sin(9 * v))
    lanes.append(np.stack((roots, roots * 0.61, roots * 0.38, np.ones(u.shape)), axis=2))
    image = bpy.data.images.new("Ozzy authored strand atlas", width * len(lanes), 256, alpha=True)
    image.pixels.foreach_set(np.concatenate(lanes, axis=1).astype(np.float32).ravel())
    image.pack()
    return image


def curl_cards(body, head, recipe):
    rng = Random(recipe["seed"])
    center = head + Vector(recipe["center"])
    rx, ry, rz = recipe["radii"]

    def scalp(azimuth, theta, lift):
        return center + Vector(((rx + lift) * sin(theta) * sin(azimuth),
                                -(ry + lift) * sin(theta) * cos(azimuth),
                                (rz + lift) * cos(theta)))

    groups = []
    for row, count in enumerate((23, 29, 35)):
        for index in range(count):
            a = index * tau / count + 0.16 * row + rng.uniform(-0.11, 0.11)
            theta = 0.17 + row * 0.43 + rng.uniform(-0.07, 0.12)
            # Most front roots sweep back above the brow. The authored
            # fringe guides supply the few irregular descending curls.
            front = max(cos(a), 0)**2
            end = float(hairline(a)) + rng.uniform(-0.08, 0.28) - 0.18 * front
            groups.append((a, theta, end, rng.choice((-1, 1)),
                           rng.uniform(0.006, 0.0115), rng.uniform(0.02, 0.64)))
    groups.extend(recipe["fringe"])

    cards = MeshLayer()
    # Root mass sits below the lifted cards and ends inside their silhouette.
    # Its shaded strand texture closes crown gaps without a visible hard rim.
    sectors, rings = 24, 8
    cards.vertices.append(scalp(0, 0, -0.004))
    cards.uvs.append((0.90, 0))
    for ring in range(1, rings + 1):
        for sector in range(sectors):
            a = tau * sector / sectors
            t = ring / rings
            depth = -0.005 + 0.002 * sin(a * 6 + ring * 0.76)
            edge = float(hairline(a)) - 0.14 + 0.045 * cos(a * 9)
            cards.vertices.append(scalp(a, t * edge, depth))
            cards.uvs.append((0.82 + 0.16 * sector / sectors, t))
            i = 1 + (ring - 1) * sectors + sector
            j = 1 + (ring - 1) * sectors + (sector + 1) % sectors
            cards.faces.append((0, i, j) if ring == 1 else (i-sectors, i, j, j-sectors))

    for a, first, last, sweep, width, bleach in groups:
        path = []
        lane = min(3, round(bleach * 3))
        phase = rng.uniform(-0.6, 0.6)
        steps = 20
        for i in range(steps):
            t = i / (steps - 1)
            turn = tau * (t * (1.05 + 0.55 * bleach) + 0.36 * t**5) + phase
            curl = sin(pi * t / 1.12)**0.72
            azimuth = a + sweep * (0.12 * t + 0.17 * curl * sin(turn))
            theta = first + (last - first) * t + 0.13 * curl * cos(turn)
            side = sin(a)**2
            lift = 0.0005 + curl * (0.008 + 0.009 * sin(turn + 0.8) + 0.005 * side) + 0.004 * t
            path.append(scalp(azimuth, theta, lift))
        offset = len(cards.vertices)
        for i, point in enumerate(path):
            t = i / (steps - 1)
            along = (path[min(steps - 1, i + 1)] - path[max(0, i - 1)]).normalized()
            outward = (point - center).normalized()
            across = along.cross(outward).normalized()
            size = width * (0.33 + 0.67 * sin(pi * t / 1.17)**0.62) * (1 - 0.65 * t**4)
            for k in (-1, 0, 1):
                cards.vertices.append(point + across * (k * size) - outward * (k*k * size * 0.30))
                cards.uvs.append(((lane + 0.50 + k * 0.48) / 5, t))
            if i:
                index = offset + i * 3
                cards.faces.extend([(index - 3, index - 2, index + 1, index),
                                    (index - 2, index - 1, index + 2, index + 1)])

    mat = material("Cook Islands curl cards", (0.075, 0.041, 0.023), 0.74)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    diffuse = nodes.new("ShaderNodeTexImage")
    diffuse.image = strand_atlas(recipe["seed"])
    diffuse.extension = "EXTEND"
    alpha = nodes.new("ShaderNodeMath")
    alpha.operation = "GREATER_THAN"
    alpha.inputs[1].default_value = 0.40
    shader = nodes.get("Principled BSDF")
    links.new(diffuse.outputs["Color"], shader.inputs["Base Color"])
    links.new(diffuse.outputs["Alpha"], alpha.inputs[0])
    links.new(alpha.outputs[0], shader.inputs["Alpha"])
    return cards.attach(body, mat, lambda _: [("Head", 1)])


def facial_hair(body, head, seed):
    """Fitted philtrum and chin grooming with softly blended original strokes."""
    rng = Random(seed + 3)
    u, v = np.meshgrid(np.linspace(-1, 1, 64), np.linspace(-1, 1, 64))
    textures = []
    for panel in range(3):
        coverage = np.zeros(u.shape)
        for _ in range((250, 95, 280)[panel]):
            x, z = rng.uniform(-1, 1), rng.uniform(-1, 1)
            if x*x + z*z > 1:
                continue
            width = rng.uniform(0.011, 0.021)
            length = rng.uniform(0.07, 0.25)
            tu = u - x - 0.29 * x * (z - v)
            coverage = np.maximum(coverage, 0.84 * np.exp(-(tu/width)**2 - ((v-z)/length)**2))
        edge = np.clip((1 - u*u - v*v) * 3, 0, 1)
        rgba = np.empty((64, 64, 4), dtype=np.float32)
        rgba[:, :, :3] = (0.18, 0.103, 0.061)
        rgba[:, :, 3] = coverage * edge * (0.56 if panel == 0 else 0.46)
        textures.append(rgba)
    image = bpy.data.images.new("Ozzy short facial hair", 192, 64, alpha=True)
    image.pixels.foreach_set(np.concatenate(textures, axis=1).ravel())
    image.pack()
    mat = material("Cook Islands facial hair", (0.095, 0.051, 0.029), 0.91)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.extension = "EXTEND"
    shader = nodes.get("Principled BSDF")
    links.new(tex.outputs["Color"], shader.inputs["Base Color"])
    links.new(tex.outputs["Alpha"], shader.inputs["Alpha"])
    mat.use_backface_culling = True

    surface = Surface(body, "Skin")
    layer = MeshLayer()
    patches = [(-0.015,-0.015,0.014,0.007,0), (0.015,-0.015,0.014,0.007,0),
               (0,-0.043,0.012,0.005,1), (0,-0.062,0.028,0.010,2)]
    columns, rows = 14, 5
    for cx, cz, width, height, panel in patches:
        start = len(layer.vertices)
        for row in range(rows):
            v = row / (rows - 1)
            for col in range(columns):
                u = col / (columns - 1)
                x = cx + width * (2*u - 1)
                z = cz + height * (2*v - 1) - (0.14 * abs(x) if panel == 0 else 0)
                point = surface.front(x, head.z + z, 0.0013)
                if point is None:
                    raise ValueError("Facial hair guide left the fitted skin surface")
                layer.vertices.append(point)
                # Reflect one half while preserving the philtrum break.
                mapped = 1 - u if cx < 0 else u
                layer.uvs.append(((panel + 0.02 + mapped*0.96)/3, v))
                if col and row:
                    i = start + row*columns + col
                    layer.faces.append((i-columns-1, i-columns, i, i-1))
    return layer.attach(body, mat, surface.weight)


def shade_skin(body, head, recipe):
    """Paint the existing UV atlas from art-directed masks in head coordinates."""
    skin = body.data.materials["Skin"]
    texture = next(node for node in skin.node_tree.nodes if node.type == "TEX_IMAGE")
    image = texture.image
    image.scale(640, 640)
    width, height = image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    pixels = pixels.reshape((height, width, 4))
    mesh = body.data
    mesh.calc_loop_triangles()
    uvs = mesh.uv_layers.active.data
    center = np.array(recipe["center"])
    radii = np.array(recipe["radii"])

    def brush(rgb, point):
        x, y, z = point.T
        ax = np.abs(x)
        front = np.clip((-y - 0.042) / 0.040, 0, 1)

        def blend(color, amount):
            rgb[:] = rgb * (1 - amount[:, None]) + np.array(color) * amount[:, None]

        # Cheek flush and subtle socket warmth in the diffuse. The sculpt
        # supplies the stronger plane changes under the game's moving sun.
        cheek = np.exp(-((ax - 0.048) / 0.031)**2 - ((z - 0.018) / 0.034)**2) * front
        blend((0.55, 0.24, 0.15), 0.12 * cheek)
        socket = np.exp(-((ax - 0.033) / 0.037)**2 - ((z - 0.050) / 0.013)**2) * front
        blend((0.28, 0.14, 0.091), 0.20 * socket)

        t = np.clip((ax - 0.010) / 0.057, 0, 1)
        brow = 0.055 + 0.010 * np.sin(t*pi) - 0.006 * t + 0.0014 * (x > 0)
        brow_width = 0.0034 * (1 - 0.70 * t**2)
        brow_mask = np.exp(-((z - brow) / brow_width)**4)
        brow_mask *= np.clip((ax - 0.010) / 0.008, 0, 1) * np.clip((0.068 - ax) / 0.012, 0, 1)
        pigment = 0.87 + 0.13 * np.sin(2600 * x + 480 * z)
        blend((0.105, 0.052, 0.028), 0.92 * brow_mask * front * pigment)

        moustache = np.exp(-((ax - 0.014) / 0.015)**4 - ((z + 0.015 + 0.16 * ax) / 0.007)**2)
        moustache *= np.clip(ax / 0.005, 0, 1)
        soul_patch = np.exp(-(x / 0.010)**2 - ((z + 0.043) / 0.005)**2)
        beard = np.exp(-(x / 0.034)**4 - ((z + 0.066 - 0.26 * ax) / 0.012)**2)
        fine_noise = 0.79 + 0.21 * np.sin(x * 3400) * np.sin(z * 4330 + y * 1250)
        blend((0.22, 0.11, 0.066), front * fine_noise * np.clip(
            0.72 * moustache + 0.46 * soul_patch + 0.58 * beard, 0, 0.82))

        gx, gy, gz = ((point - center) / radii).T
        theta = np.arctan2(np.hypot(gx, gy), gz)
        azimuth = np.arctan2(gx, -gy)
        root = np.clip((hairline(azimuth) - theta - 0.018) / 0.23, 0, 1)
        root *= 0.83 + 0.13 * np.sin(70 * azimuth + 26 * theta)**2
        blend((0.105, 0.055, 0.029), root)

    # UV islands are stable on the retained topology. Rasterize only head
    # triangles so the boardshorts, body and other skin pixels stay intact.
    for tri in mesh.loop_triangles:
        if mesh.materials[tri.material_index] != skin:
            continue
        xyz = np.array([mesh.vertices[i].co - head for i in tri.vertices])
        if xyz[:, 2].min() < -0.105:
            continue
        uv = np.array([uvs[i].uv for i in tri.loops]) * [width - 1, height - 1]
        low = np.maximum(0, np.floor(uv.min(axis=0)).astype(int))
        high = np.minimum([width - 1, height - 1], np.ceil(uv.max(axis=0)).astype(int))
        if np.any(high < low):
            continue
        a, b = uv[1] - uv[0], uv[2] - uv[0]
        determinant = a[0]*b[1] - b[0]*a[1]
        if abs(determinant) < 1e-8:
            continue
        ix, iy = np.meshgrid(np.arange(low[0], high[0]+1), np.arange(low[1], high[1]+1))
        dx, dy = ix - uv[0, 0], iy - uv[0, 1]
        t1, t2 = (dx*b[1] - dy*b[0])/determinant, (dy*a[0] - dx*a[1])/determinant
        mask = (t1 >= 0) & (t2 >= 0) & (t1 + t2 <= 1)
        if not mask.any():
            continue
        point = xyz[0] + t1[mask, None]*(xyz[1] - xyz[0]) + t2[mask, None]*(xyz[2] - xyz[0])
        x, y = ix[mask], iy[mask]
        rgb = pixels[y, x, :3].copy()
        brush(rgb, point)
        pixels[y, x, :3] = rgb
    image.pixels.foreach_set(pixels.ravel())
    # pack() with an encoded PNG keeps authored pixel changes rather than
    # retaining the imported WebP blob from the starting model.
    image.file_format = "PNG"
    image.update()
    image.pack()
    shader = skin.node_tree.nodes.get("Principled BSDF")
    tint = shader.inputs["Base Color"].links[0].from_node
    if tint.type == "MIX":
        for socket in tint.inputs:
            if socket.type == "RGBA" and not socket.is_linked:
                socket.default_value = (0.65, 0.455, 0.325, 1)
    shader.inputs["Roughness"].default_value = 0.73
    body.data.materials["Eyes"].node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = 0.20
