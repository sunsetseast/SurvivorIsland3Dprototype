"""Matched portrait, full-body and animation stills for exported cast GLBs."""

from math import cos, radians, sin
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def point_at(obj, point):
    obj.rotation_euler = (point - obj.location).to_track_quat("-Z", "Y").to_euler()


def light(name, xyz, energy, size, color, target):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.shape, data.size, data.color = energy, "DISK", size, color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = xyz
    point_at(obj, target)


def review(model, output, requested):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(model))
    scene = bpy.context.scene
    actor = next(obj for obj in scene.objects if obj.type == "MESH" and obj.name.startswith("Survivor_"))
    rig = actor.parent
    animation = rig.animation_data
    actions = {track.name: track.strips[0].action for track in animation.nla_tracks if len(track.strips)}
    for track in animation.nla_tracks:
        track.mute = True
    for obj in scene.objects:
        if obj.type == "MESH" and obj != actor:
            obj.hide_render = True
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 20
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 420
    scene.render.resolution_y = 420
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 92
    scene.world = bpy.data.worlds.new("Slate")
    scene.world.color = (0.12, 0.15, 0.17)
    scene.view_settings.view_transform = "AgX"
    camera = bpy.data.objects.new("Matched camera", bpy.data.cameras.new("Matched camera"))
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera.data.type = "ORTHO"

    def pose(name, fraction):
        animation.action = actions[name]
        begin, end = actions[name].frame_range
        scene.frame_set(round(begin + (end - begin) * fraction))
        bpy.context.view_layer.update()

    pose("idle", 0.13)
    head = rig.matrix_world @ rig.pose.bones["Head"].head
    hip = rig.matrix_world @ rig.pose.bones["Hips"].head
    upper = head + Vector((0, -0.025, 0.067))
    full = hip + Vector((0, 0, 0.075))
    light("Warm daylight key", upper + Vector((-2, -4, 3)), 480, 3.0, (1, 0.87, 0.74), upper)
    light("Sky fill", upper + Vector((3, -1, 1)), 160, 3.0, (0.71, 0.85, 1), upper)
    light("Crown rim", upper + Vector((0, 3, 2)), 390, 2.5, (1, 0.82, 0.66), upper)

    views = {
        "front": (0, True, "idle", 0.13), "profile": (90, True, "idle", 0.13),
        "three-quarter": (34, True, "idle", 0.13),
        "body-front": (0, False, "idle", 0.13), "body-side": (90, False, "idle", 0.13),
        "walk": (34, False, "walk", 0.21), "run": (65, False, "run", 0.36),
    }
    output.mkdir(parents=True, exist_ok=True)
    for name in requested or views:
        degrees, portrait, clip, time = views[name]
        pose(clip, time)
        target = upper if portrait else full
        angle = radians(degrees)
        camera.location = target + Vector((3 * sin(angle), -3 * cos(angle), 0.035 if portrait else 0.10))
        camera.data.ortho_scale = 0.37 if portrait else 2.12
        point_at(camera, target)
        scene.render.filepath = str(output / f"{name}.jpg")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    source, dest, *views = sys.argv[sys.argv.index("--") + 1:]
    review(Path(source), Path(dest), views)
