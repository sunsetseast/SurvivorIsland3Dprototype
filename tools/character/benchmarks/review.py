"""Render matched GLBs in Blender using the same lights, pose and camera."""

from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "renaissance"))
from pilot import aim, light


def review(source, output, views):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source), merge_vertices=True)
    scene = bpy.context.scene
    rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
    actor = next(obj for obj in scene.objects if obj.type == "MESH")
    animation = rig.animation_data
    clips = {track.name: track.strips[0].action for track in animation.nla_tracks}
    for track in animation.nla_tracks:
        track.mute = True
    output.mkdir(parents=True, exist_ok=True)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 408
    scene.render.resolution_y = 448
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 90
    scene.world = bpy.data.worlds.new("Neutral teal-gray studio")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes["Background"]
    background.inputs[0].default_value = (.093, .145, .163, 1)
    background.inputs[1].default_value = .66
    scene.view_settings.view_transform = "AgX"
    light("Large soft key", (-1.85, -3, 2.1), 255, 2.25, (1, .91, .84), (0, 0, .1))
    light("Soft sky fill", (1.8, -2, 1.48), 122, 2.35, (.83, .92, 1), (0, 0, .25))
    light("Hair edge", (1.0, 1.4, 2.2), 210, 1.8, (1, .86, .68), (0, 0, .2))
    cam = bpy.data.objects.new("Matched camera", bpy.data.cameras.new("Matched camera"))
    bpy.context.collection.objects.link(cam)
    cam.data.type = "ORTHO"
    scene.camera = cam

    def set_pose(clip, progress):
        action = clips[clip]
        animation.action = action
        start, end = action.frame_range
        scene.frame_set(round(start + progress * (end - start)))
        bpy.context.view_layer.update()

    set_pose("idle", .13)
    head = rig.matrix_world @ rig.pose.bones["Head"].head
    angles = {
        "face-front": (0, -3, .014), "face-three-quarter": (-2.05, -3, .014),
        "face-side": (-3, 0, .014), "body-front": (0, -3, .03),
        "body-side": (-3, 0, .03), "body-rear": (0, 3, .03),
        "walk": (-1.4, -3, .10), "run": (-1.4, -3, .10),
        "sit": (-1.4, -3, .10), "climb": (-1.4, -3, .10),
    }
    for name in views:
        if name in clips:
            set_pose(name, {"walk": .27, "run": .23, "sit": .4, "climb": .4}[name])
        else:
            set_pose("idle", .13)
        face = name.startswith("face")
        at = Vector((head.x, head.y - .045, head.z + .016)) if face else Vector((0, -.01, .86))
        cam.data.ortho_scale = .337 if face else 1.96
        cam.location = at + Vector(angles[name])
        aim(cam, at)
        scene.render.filepath = str(output / f"{name}.jpg")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    source, output, *views = sys.argv[sys.argv.index("--") + 1:]
    review(Path(source), Path(output), views or ["face-front", "face-three-quarter", "face-side",
                                                  "body-front", "body-side", "body-rear"])
