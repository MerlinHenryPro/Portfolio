// Comportements communs à toutes les pages

// Menu mobile
const burger = document.querySelector<HTMLButtonElement>(".burger");
const setMenu = (open: boolean) => {
  document.body.classList.toggle("menu-open", open);
  burger?.setAttribute("aria-expanded", String(open));
  burger?.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
};
burger?.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
document.querySelectorAll("#menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
matchMedia("(min-width: 821px)").addEventListener("change", () => setMenu(false));

// Lien actif dans la navigation
const page = document.body.dataset.page;
document.querySelectorAll<HTMLAnchorElement>(`[data-nav="${page}"]`).forEach((a) => a.setAttribute("aria-current", "page"));

// Année du footer
document.querySelectorAll("[data-year]").forEach((e) => (e.textContent = String(new Date().getFullYear())));

// Bouton "Défiler" du hero
document.querySelector("[data-scroll-next]")?.addEventListener("click", () => {
  document.getElementById("contenu")?.scrollIntoView({ behavior: "smooth" });
});

// Dissuasion : pas de menu "Enregistrer l'image" ni de glisser-déposer sur les images
document.addEventListener("contextmenu", (e) => { if ((e.target as Element).closest("img")) e.preventDefault(); });
document.addEventListener("dragstart", (e) => { if ((e.target as Element).closest("img")) e.preventDefault(); });

// Le visualiseur de nodes n'est chargé que sur les pages qui en contiennent
if (document.querySelector(".node-viewer")) import("./node-viewer.ts");

// Filtres de la page projets
document.querySelectorAll<HTMLElement>("[data-filters]").forEach((bar) => {
  const list = document.getElementById(bar.dataset.filters!);
  if (!list) return;
  const items = [...list.querySelectorAll<HTMLElement>("li[data-cat]")];
  const empty = list.parentElement?.querySelector<HTMLElement>(".empty");
  const buttons = [...bar.querySelectorAll<HTMLButtonElement>("[data-filter]")];
  for (const b of buttons) {
    const f = b.dataset.filter!;
    const n = f === "tous" ? items.length : items.filter((i) => i.dataset.cat === f).length;
    b.querySelector("small")!.textContent = String(n);
    b.addEventListener("click", () => {
      buttons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      let visibles = 0;
      for (const i of items) {
        const show = f === "tous" || i.dataset.cat === f;
        i.hidden = !show;
        if (show) visibles++;
      }
      if (empty) empty.hidden = visibles > 0;
    });
  }
});
