# Sequence "scroll" du trou noir : la camera monte en orbite autour du trou noir
# (rotation rigide autour d'un axe horizontal, le cadrage est conserve) + le disque tourne.
# Usage: blender -b Black_hole_project.blend --python render_seq.py -- <out_dir> <first> <last> <res_pct> <tilt_deg> <spin_deg> [N]
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--")+1:]
out, first, last, pct = a[0], int(a[1]), int(a[2]), int(a[3])
tilt, spin = float(a[4]), float(a[5])
N = int(a[6]) if len(a) > 6 else 120
s = bpy.context.scene
cam = s.camera
# pivot a l'origine, camera parentee, axe horizontal perpendiculaire a la direction de vue
piv = bpy.data.objects.new("Pivot", None); s.collection.objects.link(piv)
mw = cam.matrix_world.copy(); cam.parent = piv; cam.matrix_world = mw
d = Vector((cam.location.x, cam.location.y, 0)).normalized()
axis = Vector((-d.y, d.x, 0))  # horizontal, perpendiculaire
piv.rotation_mode = 'AXIS_ANGLE'
def key(obj, f): obj.keyframe_insert("rotation_axis_angle" if obj is piv else "rotation_euler", frame=f)
piv.rotation_axis_angle = (0, axis.x, axis.y, axis.z); key(piv, 1)
piv.rotation_axis_angle = (math.radians(-tilt), axis.x, axis.y, axis.z); key(piv, N)
disk = bpy.data.objects["Accretion disk"]; disk.animation_data_clear()
disk.rotation_euler = (0, 0, 0); key(disk, 1)
disk.rotation_euler = (0, 0, math.radians(spin)); key(disk, N)
for o in (piv, disk):
    for fc in o.animation_data.action.fcurves:
        for k in fc.keyframe_points: k.interpolation = 'LINEAR'
s.frame_start, s.frame_end = first, last
s.render.resolution_percentage = pct
s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_depth = '8'
s.render.filepath = out.rstrip("/") + "/bh_"
s.render.use_overwrite = False; s.render.use_placeholder = True  # reprise possible
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
for dv in prefs.devices: dv.use = dv.type == 'OPTIX'
s.cycles.device = 'GPU'
bpy.ops.render.render(animation=True)
