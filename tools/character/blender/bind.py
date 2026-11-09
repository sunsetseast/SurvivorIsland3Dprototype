"""Bind Blender-authored geometry to the unchanged foundation rig and clip data."""

import json
from pathlib import Path
from struct import Struct, pack, unpack_from
import sys


def read_glb(path):
    data = Path(path).read_bytes()
    magic, version, size, length, kind = unpack_from("<4sIII4s", data)
    if (magic, version, size, kind) != (b"glTF", 2, len(data), b"JSON"):
        raise ValueError(f"Invalid GLB header: {path}")
    model = json.loads(data[20:20 + length])
    binary = bytearray(data[28 + length:])
    if len(model["buffers"]) != 1 or model.get("extensionsUsed"):
        raise ValueError("Binding expects an unpacked, uncompressed Blender export and foundation")
    return model, binary


def write_glb(path, model, binary):
    binary.extend(bytes(-len(binary) % 4))
    model["buffers"][0]["byteLength"] = len(binary)
    header = json.dumps(model, separators=(",", ":")).encode()
    header += b" " * (-len(header) % 4)
    Path(path).write_bytes(pack("<4sIII4s", b"glTF", 2, 28 + len(header) + len(binary),
                                len(header), b"JSON") + header +
                           pack("<I4s", len(binary), b"BIN\0") + binary)


def bind(foundation, authored, output, actor):
    target, binary = read_glb(foundation)
    art, geometry = read_glb(authored)
    t_actor = next(node for node in target["nodes"] if node.get("name") == actor)
    a_actor = next(node for node in art["nodes"] if node.get("name") == actor)
    for node in art["nodes"]:
        if node.get("name") in {actor, "Armature"} and any(
            key in node for key in ("matrix", "scale", "rotation", "translation")
        ):
            raise ValueError("The art export must use the foundation bind space")

    def joint_names(document, node):
        return [document["nodes"][i]["name"] for i in document["skins"][node["skin"]]["joints"]]

    target_names, art_names = joint_names(target, t_actor), joint_names(art, a_actor)
    if len(set(art_names)) != len(art_names) or set(target_names) != set(art_names):
        raise ValueError("Art joint names differ from the foundation")
    palette = [target_names.index(name) for name in art_names]
    mesh = art["meshes"][a_actor["mesh"]]
    for index in {p["attributes"]["JOINTS_0"] for p in mesh["primitives"]}:
        accessor = art["accessors"][index]
        if accessor["type"] != "VEC4" or accessor.get("sparse"):
            raise ValueError("Expected four dense joint weights per vertex")
        joint = Struct({5121: "<4B", 5123: "<4H"}[accessor["componentType"]])
        view = art["bufferViews"][accessor["bufferView"]]
        start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        for row in range(accessor["count"]):
            offset = start + row * view.get("byteStride", joint.size)
            joint.pack_into(geometry, offset, *(palette[i] for i in joint.unpack_from(geometry, offset)))

    binary.extend(bytes(-len(binary) % 4))
    start = len(binary)
    binary.extend(geometry)
    arrays = ("bufferViews", "accessors", "images", "samplers", "textures", "materials")
    offsets = {key: len(target.setdefault(key, [])) for key in arrays}
    for view in art["bufferViews"]:
        view["byteOffset"] = view.get("byteOffset", 0) + start
    for entry in [*art["accessors"], *art.get("images", [])]:
        entry["bufferView"] += offsets["bufferViews"]
    for texture in art.get("textures", []):
        texture["source"] += offsets["images"]
        texture["sampler"] += offsets["samplers"]
    for material in art["materials"]:
        for values in (material, material.get("pbrMetallicRoughness", {})):
            for key, texture in values.items():
                if key.endswith("Texture"):
                    texture["index"] += offsets["textures"]
    for primitive in mesh["primitives"]:
        primitive["attributes"] = {k: v + offsets["accessors"] for k, v in primitive["attributes"].items()}
        primitive["indices"] += offsets["accessors"]
        primitive["material"] += offsets["materials"]
    for key in arrays:
        target[key].extend(art.get(key, []))
    target["meshes"][t_actor["mesh"]] = mesh
    target["asset"]["generator"] = "Survivor Blender art + original cast rig"
    write_glb(output, target, binary)


if __name__ == "__main__":
    bind(*sys.argv[1:])
