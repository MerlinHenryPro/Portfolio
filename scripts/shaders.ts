/**
 * Convertit les exports JSON des shader nodes (addon Blender) en graphes légers pour le site.
 *
 *   assets-src/shaders/<nom>.json   export de l'addon (un fichier par matériau)
 *   assets-src/shaders/meta.json    (optionnel) infos en plus, générées par
 *                                   scripts/blender/export_meta.py : noms des groupes,
 *                                   port exact de chaque câble, points des Float Curve
 *        ▼
 *   src/data/shaders/<nom>.graph.json
 *
 * Usage : bun run shaders
 */
import { Glob } from "bun";
import { mkdir } from "node:fs/promises";
import { basename, join } from "node:path";

const SRC = "assets-src/shaders";
const OUT = "src/data/shaders";

type Port = { nombre: string; tipo_dato: string; conectado: boolean; valor?: unknown };
type NodeIn = {
  id_interno: string; tipo: string; etiqueta: string;
  posicion: { x: number; y: number }; dimensiones: { ancho: number; alto: number };
  es_marco: boolean; puertos_entrada: Port[]; puertos_salida: Port[];
  opciones_lista: string[]; color_ramp_data: { pos: number; color: number[] }[] | null;
  padre: string | null;
};
type Export = { proyecto: string; nodos: NodeIn[]; cables: { desde_nodo: string; desde_puerto: string; hacia_nodo: string; hacia_puerto: string }[] };
type Meta = Record<string, {
  groups: Record<string, string>;
  links: [string, string, number, string, string, number][];
  curves: Record<string, [number, number][]>;
  labels: Record<string, string>;
}>;

const TITRES: Record<string, string> = {
  ShaderNodeOutputMaterial: "Material Output", ShaderNodeEmission: "Emission",
  ShaderNodeTexChecker: "Checker Texture", ShaderNodeTexCoord: "Texture Coordinate",
  ShaderNodeCombineXYZ: "Combine XYZ", ShaderNodeSeparateXYZ: "Separate XYZ",
  ShaderNodeLayerWeight: "Layer Weight", ShaderNodeValToRGB: "Color Ramp",
  ShaderNodeBsdfRefraction: "Refraction BSDF", ShaderNodeMapRange: "Map Range",
  ShaderNodeTexNoise: "Noise Texture", ShaderNodeFloatCurve: "Float Curve",
  ShaderNodeAddShader: "Add Shader", ShaderNodeVolumeAbsorption: "Volume Absorption",
  ShaderNodeMath: "Math", ShaderNodeVectorMath: "Vector Math", ShaderNodeGroup: "Group",
};
// Catégories = couleur d'en-tête façon Blender
function categorie(tipo: string): string {
  if (tipo === "ShaderNodeOutputMaterial") return "output";
  if (/TexCoord|LayerWeight|Fresnel|Value$|RGB$/.test(tipo)) return "input";
  if (/Bsdf|Emission|AddShader|MixShader|Volume/.test(tipo)) return "shader";
  if (/ShaderNodeTex/.test(tipo)) return "texture";
  if (tipo === "ShaderNodeVectorMath") return "vector";
  if (tipo === "ShaderNodeGroup") return "group";
  if (tipo === "NodeReroute") return "reroute";
  return "converter";
}
const TYPES: Record<string, string> = { VALUE: "f", VECTOR: "v", RGBA: "c", SHADER: "s", INT: "i", BOOLEAN: "b" };
const num = (v: unknown) => (typeof v === "string" ? Number(v) : (v as number));

const meta: Meta = (await Bun.file(join(SRC, "meta.json")).exists()) ? await Bun.file(join(SRC, "meta.json")).json() : {};
await mkdir(OUT, { recursive: true });

for await (const f of new Glob("*.json").scan(SRC)) {
  if (f === "meta.json") continue;
  const data: Export = await Bun.file(join(SRC, f)).json();
  const m = meta[data.proyecto];
  const ids = new Map(data.nodos.map((n, i) => [n.id_interno, i]));

  const nodes = data.nodos.filter((n) => !n.es_marco).map((n) => {
    const op = n.opciones_lista[0];
    let title = m?.labels[n.id_interno] || TITRES[n.tipo] || n.tipo.replace(/^ShaderNode|^Node/, "");
    if ((n.tipo === "ShaderNodeMath" || n.tipo === "ShaderNodeVectorMath") && op) title = op;
    if (n.tipo === "ShaderNodeGroup") title = m?.groups[n.id_interno] ?? "Group";
    const out: Record<string, unknown> = {
      id: n.id_interno, title, cat: categorie(n.tipo),
      x: Math.round(n.posicion.x), y: Math.round(-n.posicion.y), w: Math.round(n.dimensiones.ancho),
      out: n.puertos_salida.map((p) => [p.nombre, TYPES[p.tipo_dato] ?? "f"]),
      in: n.puertos_entrada.map((p) => {
        const v = p.conectado || p.valor == null ? null : Array.isArray(p.valor) ? p.valor.map(num) : num(p.valor);
        return v === null ? [p.nombre, TYPES[p.tipo_dato] ?? "f"] : [p.nombre, TYPES[p.tipo_dato] ?? "f", v];
      }),
    };
    if (n.padre) out.frame = n.padre;
    // Le menu "opération" des Math est déjà dans le titre, comme dans Blender on l'affiche quand même en liste
    if (n.opciones_lista.length) out.props = n.opciones_lista;
    if (n.color_ramp_data) out.ramp = n.color_ramp_data.map((e) => [Math.round(e.pos * 1000) / 1000, e.color.map((c) => Math.round(c * 1000) / 1000)]);
    if (m?.curves[n.id_interno]) out.curve = m.curves[n.id_interno].map(([a, b]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000]);
    return out;
  });

  const frames = data.nodos.filter((n) => n.es_marco).map((n) => ({ id: n.id_interno, label: m?.labels[n.id_interno] ?? "" }));

  // Câbles : on retrouve l'index exact du port (plusieurs entrées peuvent s'appeler "Value")
  const utilises = new Set<string>();
  const links: [string, number, string, number][] = [];
  const restants = m ? [...m.links] : [];
  for (const c of data.cables) {
    const from = data.nodos[ids.get(c.desde_nodo)!], to = data.nodos[ids.get(c.hacia_nodo)!];
    if (!from || !to) continue;
    let fo = 0, ti = 0;
    const k = restants.findIndex((l) => l[0] === c.desde_nodo && l[3] === c.hacia_nodo && l[4] === c.hacia_puerto);
    if (k >= 0) { fo = restants[k][2]; ti = restants[k][5]; restants.splice(k, 1); }
    const oIdx = from.puertos_salida.map((p, i) => [p, i] as const).filter(([p]) => p.nombre === c.desde_puerto)[fo]?.[1] ?? 0;
    const cands = to.puertos_entrada.map((p, i) => [p, i] as const).filter(([p]) => p.nombre === c.hacia_puerto);
    let iIdx = cands[ti]?.[1] ?? 0;
    if (k < 0) iIdx = (cands.find(([, i]) => !utilises.has(`${c.hacia_nodo}:${i}`)) ?? cands[0])?.[1] ?? 0;
    utilises.add(`${c.hacia_nodo}:${iIdx}`);
    links.push([c.desde_nodo, oIdx, c.hacia_nodo, iIdx]);
  }

  const nom = basename(f, ".json");
  await Bun.write(join(OUT, `${nom}.graph.json`), JSON.stringify({ name: data.proyecto, nodes, frames, links }));
  console.log(`✓ ${data.proyecto} → ${OUT}/${nom}.graph.json (${nodes.length} nodes, ${links.length} câbles${m ? "" : ", sans meta"})`);
}
