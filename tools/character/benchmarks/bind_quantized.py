"""Reuse the cast binder with a foundation decoded from a production GLB."""

from pathlib import Path
from struct import pack_into, unpack_from
import sys
from tempfile import TemporaryDirectory

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "blender"))
from bind import bind, read_glb, write_glb


def accessor_layout(model, index, element_bytes):
    accessor = model["accessors"][index]
    view = model["bufferViews"][accessor["bufferView"]]
    if accessor["componentType"] != 5126 or accessor.get("sparse") or view["buffer"] != 0:
        raise ValueError("Expected a dense unpacked float accessor")
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    return start, view.get("byteStride", element_bytes), accessor["count"]


def matrices_by_joint(model, binary, actor):
    skin = model["skins"][actor["skin"]]
    start, stride, count = accessor_layout(model, skin["inverseBindMatrices"], 64)
    if count != len(skin["joints"]):
        raise ValueError("Expected one inverse bind matrix per joint")
    return {
        model["nodes"][j]["name"]: np.array(unpack_from("<16f", binary, start + i * stride)).reshape((4, 4), order="F")
        for i, j in enumerate(skin["joints"])
    }


def bind_benchmark(foundation, authored, output, actor_name):
    target, target_bytes = read_glb(foundation)
    art, art_bytes = read_glb(authored)
    t_actor = next(n for n in target["nodes"] if n.get("name") == actor_name)
    a_actor = next(n for n in art["nodes"] if n.get("name") == actor_name)
    t_joints = matrices_by_joint(target, target_bytes, t_actor)
    a_joints = matrices_by_joint(art, art_bytes, a_actor)
    if t_joints.keys() != a_joints.keys():
        raise ValueError("Foundation and authored armature use different joints")

    # The inverse binds in the production GLB retain the original global
    # position dequantization after the accessors are decoded. Confirm the
    # same uniform decode across all joints before rebasing authored positions.
    decode = np.linalg.solve(a_joints["Hips"], t_joints["Hips"])
    scale = float(decode[0, 0])
    if scale <= 0 or not np.allclose(decode[:3, :3], np.eye(3) * scale, atol=2e-5):
        raise ValueError("Expected one uniform position decode")
    for name in t_joints:
        if not np.allclose(a_joints[name] @ decode, t_joints[name], atol=2e-5):
            raise ValueError(f"Bind-space mismatch on joint {name}")
    offset = decode[:3, 3]
    mesh = art["meshes"][a_actor["mesh"]]
    # Painted textures already include full pigment. The exporter can copy
    # the joined mesh's active skin color layer onto these primitives.
    for primitive in mesh["primitives"]:
        material = art["materials"][primitive["material"]]
        if "baseColorTexture" in material.get("pbrMetallicRoughness", {}):
            primitive["attributes"].pop("COLOR_0", None)
    for index in {p["attributes"]["POSITION"] for p in mesh["primitives"]}:
        start, stride, count = accessor_layout(art, index, 12)
        accessor = art["accessors"][index]
        for row in range(count):
            at = start + row * stride
            xyz = (np.array(unpack_from("<3f", art_bytes, at)) - offset) / scale
            pack_into("<3f", art_bytes, at, *xyz)
        for field in ("min", "max"):
            accessor[field] = ((np.array(accessor[field]) - offset) / scale).tolist()

    with TemporaryDirectory(prefix="survivor-bind-") as temporary:
        fitted = Path(temporary) / "rebase.glb"
        write_glb(fitted, art, art_bytes)
        bind(foundation, fitted, output, actor_name)


if __name__ == "__main__":
    bind_benchmark(*sys.argv[1:])
