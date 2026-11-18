// Liste des projets : utilisée par l'accueil et la page « Tous mes projets ».
// Ajouter un projet = ajouter une entrée ici + créer sa page dans src/pages/projets/.
export type Categorie = "creation" | "communication" | "programmation";

export interface Projet {
  slug: string;
  titre: string;
  date: string;
  texte: string;
  image: string;
  alt: string;
  categorie: Categorie;
  /** Opacité de l'image dans la carte (comme dans le Figma) */
  opacite?: number;
  /** Cadrage de l'image dans la carte (CSS object-position) */
  cadrage?: string;
}

export const categories: Record<Categorie, string> = {
  creation: "Création",
  communication: "Communication",
  programmation: "Programmation",
};

export const projets: Projet[] = [
  { slug: "site-matilda", titre: "Création de site", date: "Septembre 2026", texte: "Conception et développement d’un site sur l’effet Mathila pour un projet.", image: "/img/projets/projet-archives.webp", alt: "Aperçu du site Les Archives Oubliées", categorie: "creation", opacite: 0.7, cadrage: "50% 30%" },
  { slug: "olyvia", titre: "Olyvia!", date: "Mars 2026", texte: "Un site pour aider les seniors et les étudiants créé lors d’un projet.", image: "/img/projets/projet-olyvia.webp", alt: "Aperçu du site Olyvia! sur tablette", categorie: "creation", opacite: 1, cadrage: "50% 40%" },
  { slug: "affiche", titre: "Affiche événementielle", date: "Avril 2026", texte: "Design d’une affiche lors d’un exercice de création.", image: "/img/projets/projet-affiche.webp", alt: "Affiche événementielle 27, 28, 29 juin 2026", categorie: "communication", opacite: 0.84 },
  { slug: "shaders-3d", titre: "Apprentissage 3D", date: "Mars 2026", texte: "Autoformation à la 3D dans blender et à la création de rendus.", image: "/img/projets/projet-3d.webp", alt: "Rendu 3D d’un trou noir réalisé dans Blender", categorie: "creation" },
  { slug: "montres", titre: "Création d’un site de montres", date: "Mars 2026", texte: "Un site de montres personnalisables, avec une fonction IA.", image: "/img/projets/projet-montres.webp", alt: "Aperçu du site de montres personnalisables", categorie: "creation", cadrage: "0 50%" },
];
