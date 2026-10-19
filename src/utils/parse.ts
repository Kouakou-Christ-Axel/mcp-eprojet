import * as cheerio from "cheerio";

export interface Option {
  valeur: string;
  libelle: string;
}
export interface Formulaire {
  caches: Record<string, string>;
  options: Record<string, Option[]>;
}

// Sélecteurs isolés ici : si le HTML d'E-Projet change, c'est le seul fichier à adapter.
export function lireFormulaire(html: string): Formulaire {
  const $ = cheerio.load(html);
  const caches: Record<string, string> = {};
  $("input[type=hidden]").each((_, e) => {
    const nom = $(e).attr("name");
    if (nom) caches[nom] = $(e).attr("value") ?? "";
  });
  const options: Record<string, Option[]> = {};
  $("select[name]").each((_, s) => {
    options[$(s).attr("name")!] = $(s)
      .find("option")
      .map((_, o) => ({ valeur: $(o).attr("value") ?? "", libelle: $(o).text().trim() }))
      .get()
      .filter((o) => o.valeur !== "");
  });
  return { caches, options };
}

export const normaliser = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export function resoudreOption(
  options: Record<string, Option[]>,
  champ: string,
  libelle: string,
): string {
  const liste = options[champ] ?? [];
  const trouve = liste.find((o) => normaliser(o.libelle) === normaliser(libelle));
  if (trouve) return trouve.valeur;
  throw new Error(
    `"${libelle}" inconnu pour ${champ}. Valeurs permises : ${liste.map((o) => o.libelle).join(", ") || "aucune (liste vide)"}`,
  );
}
