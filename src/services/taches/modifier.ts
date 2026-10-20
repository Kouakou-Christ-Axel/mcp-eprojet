import * as cheerio from "cheerio";
import { frVersIso, isoVersFr, verifierPeriode } from "../../utils/dates.js";
import { dureeVersJoursHeures } from "../../utils/duree.js";
import { journaliser } from "../../utils/actionsLog.js";
import { lireFormulaire, normaliser, resoudreOption, serialiser } from "../../utils/parse.js";
import { lireTableauActivite } from "./activite.js";
import type { Candidat } from "./lookups.js";
import type { ModifierTacheInput } from "./modifierSchema.js";
import { resoudreComposant, resoudreExterne, type Deps } from "./service.js";

const TABLES = ["tabActivityStarted", "tabActivityAvenir", "tabActivityTermineeRattrapage"];

export type Changements = Record<string, { avant: string; apres: string }>;
export type ResultatModif =
  | { mode: "dry_run"; reference: string; changements: Changements; avertissements: string[] }
  | {
      mode: "envoyé";
      reference: string;
      changements: Changements;
      avertissements: string[];
      statut: number;
      verifie: boolean;
      ecarts: string[];
    }
  | { candidats: Candidat[] };

async function trouverId(deps: Deps, reference: string): Promise<string> {
  const html = await (await deps.api("/timeSheetTacheParJour/activity")).text();
  const t = TABLES.flatMap((id) => lireTableauActivite(html, id)).find(
    (x) => normaliser(x.reference) === normaliser(reference),
  );
  if (!t?.id) {
    throw new Error(
      `Tâche ${reference} introuvable parmi les tâches actives, à venir ou en rattrapage`,
    );
  }
  return t.id;
}

// Champs du formulaire d'édition tels que le navigateur les enverrait.
const lireChamps = (html: string) => new Map(serialiser(cheerio.load(html), "[name=libelle]"));

// Mêmes nombres écrits différemment ("2.0" / "2") : pas un écart.
const egal = (a: string | undefined, b: string) =>
  a === b || (a !== undefined && a !== "" && b !== "" && Number(a) === Number(b));

const AVERTISSEMENT_EXTERNE =
  "E-Projet ne recharge pas le responsable externe ni le composant à l'édition : non précisés ici, " +
  "ils sont envoyés vides (effacés s'ils existaient). Les repréciser pour les conserver.";

export async function modifierTache(input: ModifierTacheInput, deps: Deps): Promise<ResultatModif> {
  const id = await trouverId(deps, input.reference);
  const chemin = `/taches/useform/${id}`;
  const html = await (await deps.api(chemin)).text();
  const avant = lireChamps(html);
  if (
    avant.get("id") !== id ||
    normaliser(avant.get("reference") ?? "") !== normaliser(input.reference)
  ) {
    throw new Error("Formulaire d'édition inattendu (id ou référence différents) : abandon");
  }
  const form = lireFormulaire(html);
  const apres = new Map(avant);
  const set = (k: string, v: string | undefined) => v !== undefined && apres.set(k, v);

  set("libelle", input.libelle);
  set("natureTache", input.nature);
  set("gravite", input.gravite);
  set("commentaire", input.commentaire);
  set("tacheInterne", input.tache_interne === undefined ? undefined : String(input.tache_interne));
  if (input.type_tache) {
    set("typeTacheId", resoudreOption(form.options, "typeTacheId", input.type_tache));
  }
  if (input.statut) {
    if (parseFloat(avant.get("pourcentageAvanc") ?? "") >= 100) {
      throw new Error(
        "Tâche à 100 % : son statut ne se change pas ici (Terminée = 100 %). Utiliser saisir_timesheet, qui baisse le pourcentage",
      );
    }
    set("statutTacheId", resoudreOption(form.options, "statutTacheId", input.statut));
  }
  const projetId = avant.get("projetId") ?? "";
  if (input.composant) set("composant", await resoudreComposant(deps, projetId, input.composant));
  if (input.responsable_externe) {
    const trouves = await resoudreExterne(deps, projetId, input.responsable_externe);
    if (trouves.length > 1) return { candidats: trouves };
    set("responsableExterneId", trouves[0]!.id);
  }
  if (input.debut_prev || input.fin_prev) {
    const debut = input.debut_prev ?? frVersIso(avant.get("dateDebutPrev") ?? "");
    const fin = input.fin_prev ?? frVersIso(avant.get("dateFinPrev") ?? "");
    verifierPeriode(debut, fin);
    set("dateDebutPrev", isoVersFr(debut));
    set("dateFinPrev", isoVersFr(fin));
  }
  if (input.duree_heures !== undefined) {
    const { nbHeurePrev, nbJourPrev } = dureeVersJoursHeures(input.duree_heures);
    set("nbHeurePrev", String(nbHeurePrev));
    set("nbJourPrev", String(nbJourPrev));
  }

  const changements: Changements = {};
  for (const [k, v] of apres) {
    if (!egal(avant.get(k), v)) changements[k] = { avant: avant.get(k) ?? "", apres: v };
  }
  if (Object.keys(changements).length === 0) throw new Error("Rien à modifier : déjà à jour");
  const anomalie = apres.get("natureTache") === "ANOMALIE";
  const complet = input.responsable_externe && (!anomalie || input.composant);
  const avertissements = complet ? [] : [AVERTISSEMENT_EXTERNE];
  if (!input.confirmer) {
    return { mode: "dry_run", reference: input.reference, changements, avertissements };
  }

  const res = await deps.api("/taches/updateuser", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams([...apres]),
  });
  journaliser(deps.log, {
    outil: "modifier_tache",
    reference: input.reference,
    statut: res.status,
    changements,
  });
  if (res.status >= 400) throw new Error(`E-Projet a refusé la modification (HTTP ${res.status})`);
  const relu = lireChamps(await (await deps.api(chemin)).text());
  const ecarts = Object.entries(changements)
    .filter(([k, c]) => !egal(relu.get(k), c.apres))
    .map(([k, c]) => `${k} : relu "${relu.get(k) ?? ""}" au lieu de "${c.apres}"`);
  return {
    mode: "envoyé",
    reference: input.reference,
    changements,
    avertissements,
    statut: res.status,
    verifie: ecarts.length === 0,
    ecarts,
  };
}
