import * as cheerio from "cheerio";
import { z } from "zod";
import { lireFormulaire, normaliser, serialiser } from "../../utils/parse.js";
import { lireDetailServeur } from "./detail.js";
import { trouverTache } from "./recherche.js";
import type { Deps } from "./service.js";

export const lireTacheShape = {
  reference: z.string().min(1).describe("Référence de la tâche (ex. PRJ-576-0417)"),
};
export const lireTacheSchema = z.object(lireTacheShape);
export type LireTacheInput = z.infer<typeof lireTacheSchema>;

export interface DetailTache {
  reference: string;
  libelle: string;
  projet: string;
  type: string;
  nature: string;
  gravite: string;
  statut: string;
  pourcentage: number;
  tache_interne: boolean;
  debut_prev: string;
  fin_prev: string;
  jours_prev: string;
  heures_prev: string;
  heures_reelles: string;
  commentaire: string;
  responsable_externe: string;
  composant: string;
}

// Lecture seule : formulaire d'édition (détails) + page Activité (statut, heures réelles).
export async function lireTache(
  input: LireTacheInput,
  deps: Pick<Deps, "api">,
): Promise<DetailTache> {
  const resume = await trouverTache(deps, input.reference);
  const serveur = await lireDetailServeur(deps, resume.id);
  const html = await (await deps.api(`/taches/useform/${resume.id}`)).text();
  const c = new Map(serialiser(cheerio.load(html), "[name=libelle]"));
  if (normaliser(c.get("reference") ?? "") !== normaliser(input.reference)) {
    throw new Error("Formulaire inattendu (référence différente) : abandon");
  }
  const { options } = lireFormulaire(html);
  const libelleDe = (champ: string) =>
    options[champ]?.find((o) => o.valeur === c.get(champ))?.libelle ?? "";
  const pourcentage = parseFloat(c.get("pourcentageAvanc") ?? "") || 0;
  return {
    reference: resume.reference,
    libelle: c.get("libelle") ?? "",
    projet: resume.projet,
    type: libelleDe("typeTacheId") || resume.type,
    nature: c.get("natureTache") ?? "",
    gravite: serveur.gravite ?? c.get("gravite") ?? "",
    // Le formulaire d'édition n'a pas "Terminée" : le statut vient du JSON de la tâche.
    statut: serveur.statutTacheLibelle ?? resume.statut ?? "",
    pourcentage,
    tache_interne: c.get("tacheInterne") === "true",
    debut_prev: c.get("dateDebutPrev") ?? "",
    fin_prev: c.get("dateFinPrev") ?? "",
    jours_prev: c.get("nbJourPrev") ?? "",
    heures_prev: c.get("nbHeurePrev") ?? "",
    heures_reelles: resume.hReelle,
    commentaire: c.get("commentaire") ?? "",
    responsable_externe: serveur.responsableExterneNom ?? "",
    composant: serveur.composant ?? "",
  };
}
