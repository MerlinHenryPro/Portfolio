/**
 * Visualiseur interactif de shader nodes façon Blender.
 * Aucune dépendance : nodes en HTML, câbles en SVG, une seule transformation CSS pour pan/zoom.
 *
 *   <div class="node-viewer" data-graph="material-001"></div>
 *
 * Souris : glisser = déplacer · molette (après un clic dans le cadre, ou Ctrl + molette) = zoom
 * Tactile : glisser = déplacer · pincer = zoom · bouton ⤢ = plein écran
 * Clavier (cadre sélectionné) : flèches = déplacer · + / − = zoom · 0 = recentrer
 */
import mat001 from "../data/shaders/material-001.graph.json";
import mat from "../data/shaders/material.graph.json";
import mat003 from "../data/shaders/material-003.graph.json";

type Sock = [string, string, unknown?];
type GNode = {
  id: string; title: string; cat: string; x: number; y: number; w: number;
  out: Sock[]; in: Sock[]; props?: string[]; frame?: string;
  ramp?: [number, number[]][]; curve?: [number, number][];
};
type Graph = { name: string; nodes: GNode[]; frames: { id: string; label: string }[]; links: [string, number, string, number][] };

const GRAPHS: Record<string, Graph> = {
  "material-001": mat001 as Graph,
  material: mat as Graph,
  "material-003": mat003 as Graph,
};

const HEADER = 26, ROW = 22, PAD = 6, RAMP_H = 56, CURVE_H = 150;
const SOCK_COLOR: Record<string, string> = { f: "#a1a1a1", v: "#6363c7", c: "#c7c729", s: "#63c763", i: "#598c5c", b: "#cca6d6" };
const MIN_K = 0.08, MAX_K = 2.5;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, txt?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};
const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(3));
const rgb = (c: number[]) => {
  // couleurs Blender en linéaire -> sRGB approximatif
  const s = (x: number) => Math.round(255 * Math.min(1, Math.max(0, x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055)));
  return `rgb(${s(c[0])},${s(c[1])},${s(c[2])})`;
};

/** Calcule la hauteur du node et la position verticale de chaque socket (comme Blender : sorties, options, widgets, entrées). */
function layout(n: GNode) {
  if (n.cat === "reroute") return { h: 16, outY: [8], inY: [8] };
  let y = HEADER + PAD;
  const outY = n.out.map(() => { const c = y + ROW / 2; y += ROW; return c; });
  y += (n.props?.length ?? 0) * ROW;
  if (n.ramp) y += RAMP_H;
  if (n.title === "Float Curve") y += CURVE_H;
  const inY = n.in.map(([, t, v]) => {
    const c = y + ROW / 2;
    y += t === "v" && Array.isArray(v) ? ROW * 4 : ROW;
    return c;
  });
  return { h: y + PAD, outY, inY };
}

function buildNode(n: GNode, h: number) {
  const box = el("div", `nv-node nv-${n.cat}`);
  box.style.cssText = `left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${h}px`;
  box.dataset.id = n.id;
  if (n.cat === "reroute") return box;

  box.append(el("div", "nv-head", n.title));
  const body = el("div", "nv-body");
  for (const [name, t] of n.out) {
    const r = el("div", "nv-row nv-out", name);
    r.append(Object.assign(el("i", "nv-sock"), { style: `--c:${SOCK_COLOR[t]}` }));
    body.append(r);
  }
  for (const p of n.props ?? []) body.append(el("div", "nv-row nv-prop", p));
  if (n.ramp) {
    const stops = n.ramp.map(([p, c]) => `${rgb(c)} ${p * 100}%`).join(",");
    const w = el("div", "nv-ramp");
    w.style.setProperty("--g", `linear-gradient(90deg,${n.ramp.length > 1 ? stops : `${stops},${stops}`})`);
    body.append(w);
  }
  if (n.title === "Float Curve") {
    const pts = n.curve ?? [[0, 0], [1, 1]];
    const d = pts.map(([a, b], i) => `${i ? "L" : "M"}${(a * 100).toFixed(1)} ${(100 - b * 100).toFixed(1)}`).join("");
    const w = el("div", "nv-curve");
    w.innerHTML = `<svg viewBox="-4 -4 108 108" preserveAspectRatio="none"><path d="M0 50H100M50 0V100" class="g"/><path d="${d}" class="c"/></svg>`;
    body.append(w);
  }
  for (const [name, t, v] of n.in) {
    const r = el("div", "nv-row nv-in");
    r.append(Object.assign(el("i", "nv-sock"), { style: `--c:${SOCK_COLOR[t]}` }));
    if (t === "v" && Array.isArray(v)) {
      r.append(el("span", "", name));
      body.append(r);
      ["X", "Y", "Z"].forEach((ax, i) => {
        const f = el("div", "nv-row nv-field");
        f.append(el("span", "", ax), el("b", "", fmt(v[i] as number)));
        body.append(f);
      });
      continue;
    }
    if (t === "c" && Array.isArray(v)) {
      r.append(el("span", "", name), Object.assign(el("em", "nv-swatch"), { style: `background:${rgb(v as number[])}` }));
    } else if (typeof v === "number") {
      r.classList.add("nv-field");
      r.append(el("span", "", name), el("b", "", fmt(v)));
    } else r.append(el("span", "", name));
    body.append(r);
  }
  box.append(body);
  return box;
}

class NodeViewer {
  root: HTMLElement; vp: HTMLElement; world: HTMLElement; svg: SVGSVGElement;
  x = 0; y = 0; k = 1; bounds = { x: 0, y: 0, w: 1, h: 1 };
  pointers = new Map<number, { x: number; y: number }>();
  pinch: { d: number; k: number; cx: number; cy: number; x: number; y: number } | null = null;
  active = false;
  linksByNode = new Map<string, SVGPathElement[]>();

  constructor(root: HTMLElement, g: Graph) {
    this.root = root;
    root.innerHTML = "";
    root.classList.add("nv");

    const bar = el("div", "nv-bar");
    bar.append(el("span", "nv-name", g.name));
    const btn = (label: string, title: string, fn: () => void) => {
      const b = el("button", "nv-btn", label);
      b.type = "button"; b.title = title; b.setAttribute("aria-label", title);
      b.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
      bar.append(b);
      return b;
    };
    btn("−", "Dézoomer", () => this.zoomBy(1 / 1.3));
    btn("+", "Zoomer", () => this.zoomBy(1.3));
    btn("⟲", "Recentrer", () => this.fit());
    const expand = btn("⤢", "Plein écran", () => this.toggleExpand());
    this.expandBtn = expand;

    this.vp = el("div", "nv-viewport");
    this.vp.tabIndex = 0;
    this.vp.setAttribute("role", "img");
    this.vp.setAttribute("aria-label", `Arbre de shader nodes Blender « ${g.name} » (${g.nodes.length} nodes). Glisser pour déplacer, pincer ou Ctrl + molette pour zoomer.`);
    this.world = el("div", "nv-world");
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.classList.add("nv-links");

    const hint = el("div", "nv-hint", matchMedia("(pointer: coarse)").matches
      ? "Glisser pour explorer · pincer pour zoomer"
      : "Glisser pour explorer · clic puis molette pour zoomer");

    // ---- placement des nodes, frames et câbles
    const L = new Map<string, ReturnType<typeof layout> & { n: GNode }>();
    for (const n of g.nodes) L.set(n.id, { ...layout(n), n });

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const { n, h } of L.values()) {
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + h);
    }
    // Frames : boîte englobante de leurs enfants
    for (const f of g.frames) {
      const kids = [...L.values()].filter((v) => v.n.frame === f.id);
      if (!kids.length) continue;
      const fx = Math.min(...kids.map((v) => v.n.x)) - 24, fy = Math.min(...kids.map((v) => v.n.y)) - 40;
      const fw = Math.max(...kids.map((v) => v.n.x + v.n.w)) + 24 - fx, fh = Math.max(...kids.map((v) => v.n.y + v.h)) + 24 - fy;
      const fr = el("div", "nv-frame", f.label);
      fr.style.cssText = `left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px`;
      this.world.append(fr);
      minX = Math.min(minX, fx); minY = Math.min(minY, fy); maxX = Math.max(maxX, fx + fw); maxY = Math.max(maxY, fy + fh);
    }
    this.bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

    this.world.append(this.svg);
    const ns = "http://www.w3.org/2000/svg";
    for (const [a, oi, b, ii] of g.links) {
      const A = L.get(a), B = L.get(b);
      if (!A || !B) continue;
      const x1 = A.n.x + A.n.w, y1 = A.n.y + (A.outY[oi] ?? HEADER);
      const x2 = B.n.x, y2 = B.n.y + (B.inY[ii] ?? HEADER);
      const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", `M${x1} ${y1}C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`);
      p.style.setProperty("--c", SOCK_COLOR[A.n.out[oi]?.[1] ?? "f"]);
      this.svg.append(p);
      for (const id of [a, b]) {
        if (!this.linksByNode.has(id)) this.linksByNode.set(id, []);
        this.linksByNode.get(id)!.push(p);
      }
    }
    for (const { n, h } of L.values()) this.world.append(buildNode(n, h));

    this.vp.append(this.world, hint);
    root.append(bar, this.vp);
    this.bind();
    requestAnimationFrame(() => this.fit());
  }

  expandBtn!: HTMLButtonElement;

  apply() {
    this.world.style.transform = `translate(${this.x}px,${this.y}px) scale(${this.k})`;
    this.root.style.setProperty("--k", String(this.k));
  }
  fit() {
    const r = this.vp.getBoundingClientRect();
    const pad = 24;
    this.k = Math.min(MAX_K, Math.max(MIN_K, Math.min((r.width - pad * 2) / this.bounds.w, (r.height - pad * 2) / this.bounds.h)));
    this.x = (r.width - this.bounds.w * this.k) / 2 - this.bounds.x * this.k;
    this.y = (r.height - this.bounds.h * this.k) / 2 - this.bounds.y * this.k;
    this.apply();
  }
  zoomAt(k: number, cx: number, cy: number) {
    k = Math.min(MAX_K, Math.max(MIN_K, k));
    this.x = cx - ((cx - this.x) * k) / this.k;
    this.y = cy - ((cy - this.y) * k) / this.k;
    this.k = k;
    this.apply();
  }
  zoomBy(f: number) {
    const r = this.vp.getBoundingClientRect();
    this.zoomAt(this.k * f, r.width / 2, r.height / 2);
  }
  toggleExpand(force?: boolean) {
    const on = force ?? !this.root.classList.contains("nv--expanded");
    this.root.classList.toggle("nv--expanded", on);
    document.documentElement.classList.toggle("nv-lock", on);
    this.expandBtn.textContent = on ? "✕" : "⤢";
    this.expandBtn.title = on ? "Fermer le plein écran" : "Plein écran";
    this.expandBtn.setAttribute("aria-label", this.expandBtn.title);
    this.active = on;
    requestAnimationFrame(() => this.fit());
    if (on) this.vp.focus();
  }

  bind() {
    const vp = this.vp;
    const local = (e: { clientX: number; clientY: number }) => {
      const r = vp.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    vp.addEventListener("pointerdown", (e) => {
      vp.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, local(e));
      this.active = true;
      this.root.classList.add("nv--active", "nv--used");
      if (this.pointers.size === 2) {
        const [p, q] = [...this.pointers.values()];
        this.pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), k: this.k, cx: (p.x + q.x) / 2, cy: (p.y + q.y) / 2, x: this.x, y: this.y };
      }
    });
    vp.addEventListener("pointermove", (e) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const cur = local(e);
      this.pointers.set(e.pointerId, cur);
      if (this.pointers.size === 1) {
        this.x += cur.x - prev.x; this.y += cur.y - prev.y; this.apply();
      } else if (this.pinch && this.pointers.size === 2) {
        const [p, q] = [...this.pointers.values()];
        const d = Math.hypot(p.x - q.x, p.y - q.y), cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2;
        const k = Math.min(MAX_K, Math.max(MIN_K, (this.pinch.k * d) / this.pinch.d));
        // zoom autour du point de départ du pincement + déplacement du centre
        this.x = cx - ((this.pinch.cx - this.pinch.x) * k) / this.pinch.k;
        this.y = cy - ((this.pinch.cy - this.pinch.y) * k) / this.pinch.k;
        this.k = k; this.apply();
      }
    });
    const up = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
    };
    vp.addEventListener("pointerup", up);
    vp.addEventListener("pointercancel", up);

    vp.addEventListener("wheel", (e) => {
      // La molette ne capture la page que si le visualiseur est actif (clic) ou avec Ctrl
      if (!this.active && !e.ctrlKey) {
        this.root.classList.add("nv--nudge");
        clearTimeout((this as any).t);
        (this as any).t = setTimeout(() => this.root.classList.remove("nv--nudge"), 1200);
        return;
      }
      e.preventDefault();
      const p = local(e);
      this.zoomAt(this.k * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)), p.x, p.y);
    }, { passive: false });

    vp.addEventListener("mouseleave", () => {
      if (!this.root.classList.contains("nv--expanded")) { this.active = false; this.root.classList.remove("nv--active"); }
    });
    vp.addEventListener("keydown", (e) => {
      const step = 60;
      const map: Record<string, () => void> = {
        ArrowLeft: () => { this.x += step; this.apply(); }, ArrowRight: () => { this.x -= step; this.apply(); },
        ArrowUp: () => { this.y += step; this.apply(); }, ArrowDown: () => { this.y -= step; this.apply(); },
        "+": () => this.zoomBy(1.2), "=": () => this.zoomBy(1.2), "-": () => this.zoomBy(1 / 1.2), "0": () => this.fit(),
        Escape: () => this.toggleExpand(false),
      };
      if (map[e.key]) { e.preventDefault(); map[e.key](); }
    });

    // Survol d'un node : on met ses câbles en évidence
    this.world.addEventListener("pointerover", (e) => {
      const n = (e.target as HTMLElement).closest<HTMLElement>(".nv-node");
      this.svg.querySelectorAll(".hl").forEach((p) => p.classList.remove("hl"));
      if (n) this.linksByNode.get(n.dataset.id!)?.forEach((p) => p.classList.add("hl"));
    });

    new ResizeObserver(() => { if (!this.root.classList.contains("nv--used")) this.fit(); }).observe(vp);
  }
}

// Initialisation paresseuse : on ne construit un graphe que lorsqu'il approche de l'écran
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    io.unobserve(en.target);
    const root = en.target as HTMLElement;
    const g = GRAPHS[root.dataset.graph ?? ""];
    if (g) new NodeViewer(root, g);
  }
}, { rootMargin: "400px" });
document.querySelectorAll<HTMLElement>(".node-viewer[data-graph]").forEach((e) => io.observe(e));
