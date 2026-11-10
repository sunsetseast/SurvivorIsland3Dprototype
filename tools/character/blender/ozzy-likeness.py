"""Artist-authored Cook Islands landmark sculpt and strand-card groom."""

import argparse
import json
from math import pi
from pathlib import Path
import sys
from struct import Struct

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bind import read_glb
from ozzy_groom import curl_cards, facial_hair, shade_skin


def unpacked_to_native(source):
    """Recover the position transform left in the inverse binds by dequantize."""
    doc, binary = read_glb(source)
    nodes = doc["nodes"]
    skin = doc["skins"][0]
    accessor = doc["accessors"][skin["inverseBindMatrices"]]
    view = doc["bufferViews"][accessor["bufferView"]]
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    mat4 = Struct("<16f")
    parents = {child: i for i, n in enumerate(nodes) for child in n.get("children", ())}

    def from_columns(values):
        return Matrix([values[row::4] for row in range(4)])

    def world(i):
        node = nodes[i]
        if "matrix" in node:
            local = from_columns(node["matrix"])
        else:
            x, y, z, w = node.get("rotation", (0, 0, 0, 1))
            local = Matrix.LocRotScale(Vector(node.get("translation", (0, 0, 0))),
                                       Quaternion((w, x, y, z)), Vector(node.get("scale", (1, 1, 1))))
        return world(parents[i]) @ local if i in parents else local

    transforms = [world(joint) @ from_columns(mat4.unpack_from(binary, start + i * mat4.size))
                  for i, joint in enumerate(skin["joints"])]
    native_to_world = transforms[0]
    if any(max(abs(value) for row in (matrix - native_to_world) for value in row) > 1e-4
           for matrix in transforms):
        raise ValueError("Ozzy foundation has incompatible joint-dependent bind transforms")
    basis = Matrix.Rotation(pi / 2, 4, "X")  # glTF Y up, Blender Z up
    return basis @ native_to_world.inverted() @ basis.inverted()


def remove_materials(body, names):
    mesh = bmesh.new()
    mesh.from_mesh(body.data)
    removed = {i for i, mat in enumerate(body.data.materials) if mat.name in names}
    bmesh.ops.delete(mesh, geom=[face for face in mesh.faces if face.material_index in removed],
                     context="FACES")
    mesh.to_mesh(body.data)
    mesh.free()
    body.data.update()


def sculpt_landmarks(body, head, landmarks):
    """Interpolate sculpt handles while letting the face blend back to the bind mesh."""
    controls, displacements, widths = [], [], []
    for landmark in landmarks:
        for sign in ([1, -1] if landmark.get("mirror") else [1]):
            mirror = np.array([sign, 1, 1])
            controls.append(mirror * landmark["at"])
            displacements.append(mirror * landmark["delta"])
            widths.append(landmark["radius"])
    points = np.array(controls)
    widths = np.array(widths)

    def influence(vertices):
        t = np.linalg.norm((vertices[:, None, :] - points) / widths, axis=2)
        taper = np.maximum(1 - t, 0)
        return taper**4 * (4 * t + 1)

    coefficients = np.linalg.solve(influence(points), np.array(displacements))
    if np.max(np.abs(coefficients)) > 0.04:
        raise ValueError("Conflicting face landmark handles")
    mesh = body.data
    coords = np.empty((len(mesh.vertices), 3), dtype=np.float32)
    mesh.vertices.foreach_get("co", coords.ravel())
    positions = coords - np.array(head)
    region = (positions[:, 2] > -0.11) & (positions[:, 2] < 0.21)
    coords[region] += influence(positions[region]) @ coefficients
    mesh.vertices.foreach_set("co", coords.ravel())
    mesh.update()
    # Drop stale imported split normals only around the sculpt. Blend coincident
    # head vertices across UV seams while keeping separate eye and lip surfaces.
    face_slots = {i for i, mat in enumerate(mesh.materials) if mat.name == "Skin"}
    head_vertices = {i for p in mesh.polygons if p.material_index in face_slots
                     for i in p.vertices if region[i]}
    normal_sums = {}
    for index in head_vertices:
        vertex = mesh.vertices[index]
        key = tuple(round(v, 5) for v in vertex.co)
        normal_sums.setdefault(key, Vector())
        normal_sums[key] += vertex.normal
    custom = [normal.vector.copy() for normal in mesh.corner_normals]
    for polygon in mesh.polygons:
        if polygon.material_index not in face_slots:
            continue
        for li in polygon.loop_indices:
            index = mesh.loops[li].vertex_index
            if index in head_vertices:
                key = tuple(round(v, 5) for v in mesh.vertices[index].co)
                custom[li] = normal_sums[key].normalized()
    mesh.normals_split_custom_set(custom)


def author(source, dest, config, bare):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source), guess_original_bind_pose=False)
    body = bpy.data.objects["Survivor_1"]
    rig = body.parent
    head = rig.data.bones["Head"].head_local.copy()
    remove_materials(body, {"Sunlit dark curls", "Brow and sparse stubble", "Eyebrows", "Eyelashes"})
    sculpt_landmarks(body, head, config["landmarks"])

    if not bare:
        shade_skin(body, head, config["groom"])
        hair = curl_cards(body, head, config["groom"])
        beard = facial_hair(body, head, config["groom"]["seed"])
        bpy.ops.object.select_all(action="DESELECT")
        body.select_set(True)
        hair.select_set(True)
        beard.select_set(True)
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.join()

    body.data.transform(unpacked_to_native(source))
    rig.animation_data.action = None
    bpy.ops.export_scene.gltf(filepath=str(dest), export_format="GLB",
                             export_animations=False, export_morph=False, export_image_format="AUTO")


if __name__ == "__main__":
    cli = argparse.ArgumentParser()
    cli.add_argument("source", type=Path)
    cli.add_argument("destination", type=Path)
    cli.add_argument("--bare", action="store_true")
    args = cli.parse_args(sys.argv[sys.argv.index("--") + 1:])
    config = json.loads(Path(__file__).with_name("ozzy-landmarks.json").read_text())
    author(args.source, args.destination, config, args.bare)
