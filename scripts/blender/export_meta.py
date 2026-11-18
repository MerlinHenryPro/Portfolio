# Exporte les infos que l'export JSON des nodes ne contient pas :
#  - le nom réel des node groups (ex. "Spherical Coordinates")
#  - le port exact de chaque câble (utile quand deux entrées ont le même nom, ex. Math "Value")
#  - les points des Float Curve
# Usage :
#   blender -b fichier.blend --python scripts/blender/export_meta.py -- assets-src/shaders/meta.json
import bpy, json, sys

def idx(sockets, sock):
    """Rang du socket parmi les sockets visibles qui portent le même nom."""
    same = [s for s in sockets if s.enabled and s.name == sock.name]
    return same.index(sock) if sock in same else 0

out = {}
for m in bpy.data.materials:
    if not (m.use_nodes and m.node_tree):
        continue
    nt = m.node_tree
    out[m.name] = {
        "groups": {n.name: n.node_tree.name for n in nt.nodes if n.type == 'GROUP' and n.node_tree},
        "links": [
            [l.from_node.name, l.from_socket.name, idx(l.from_node.outputs, l.from_socket),
             l.to_node.name, l.to_socket.name, idx(l.to_node.inputs, l.to_socket)]
            for l in nt.links
        ],
        "curves": {
            n.name: [[p.location[0], p.location[1]] for p in n.mapping.curves[0].points]
            for n in nt.nodes if n.type == 'FLOAT_CURVE'
        },
        "labels": {n.name: n.label for n in nt.nodes if n.label},
    }
path = sys.argv[sys.argv.index("--") + 1]
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("meta ->", path)
