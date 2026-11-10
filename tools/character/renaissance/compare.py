"""Render a production control using the same studio as the sculpt studies."""
from pathlib import Path
import sys

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pilot import studio


def review(source, output):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene = bpy.context.scene
    actor = next(obj for obj in scene.objects if obj.type == 'MESH' and obj.name.startswith('Survivor_'))
    rig = actor.parent
    animation = rig.animation_data
    idle = next(track.strips[0].action for track in animation.nla_tracks if track.name == 'idle')
    for track in animation.nla_tracks:
        track.mute = True
    animation.action = idle
    start, end = idle.frame_range
    scene.frame_set(round(start + (end - start) * .13))
    for obj in scene.objects:
        if obj.type == 'MESH' and obj != actor:
            obj.hide_render = True
    bpy.context.view_layer.update()
    head = rig.matrix_world @ rig.pose.bones['Head'].head
    posed = actor.evaluated_get(bpy.context.evaluated_depsgraph_get())
    ground = min((posed.matrix_world @ vertex.co).z for vertex in posed.data.vertices)
    height = (head.z - ground + .12) / 1.64
    output.mkdir(parents=True, exist_ok=True)
    studio(output, head.z + .039, height, ['front', 'three-quarter', 'body-front'])


if __name__ == '__main__':
    source, output = sys.argv[sys.argv.index('--') + 1:]
    review(Path(source), Path(output))
