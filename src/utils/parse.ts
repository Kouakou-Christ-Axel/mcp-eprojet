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

// Ce que le navigateur enverrait à la soumission : champs nommés, non désactivés, cochés,
// premier choix des select sans sélection.
// `dans` : sélecteur d'un élément du formulaire (le formulaire englobant est utilisé).
export function serialiser($: cheerio.CheerioAPI, dans: string): [string, string][] {
  const $form = $(dans).closest("form");
  const champs: [string, string][] = [];
  $form.find("input[name],select[name],textarea[name]").each((_, e) => {
    const $e = $(e);
    if ($e.attr("disabled") !== undefined) return;
    const type = ($e.attr("type") ?? "").toLowerCase();
    if (["button", "submit", "reset", "file"].includes(type)) return;
    if (["checkbox", "radio"].includes(type) && $e.attr("checked") === undefined) return;
    const nom = $e.attr("name")!;
    if (e.tagName === "select") {
      const choisie = $e.find("option[selected]").first();
      champs.push([
        nom,
        (choisie.length ? choisie : $e.find("option").first()).attr("value") ?? "",
      ]);
    } else if (e.tagName === "textarea") champs.push([nom, $e.text()]);
    else champs.push([nom, $e.attr("value") ?? ""]);
  });
  return champs;
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
