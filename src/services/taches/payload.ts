import { isoVersFr } from "../../utils/dates.js";
import { dureeVersJoursHeures } from "../../utils/duree.js";
import { resoudreOption, type Formulaire } from "../../utils/parse.js";
import type { CreerTacheInput } from "./schema.js";

// non vérifié : POST réel — noms de champs repris du HTML de /taches/useform.
const VIDES = [
  "ordre",
  "reference",
  "tacheParentId",
  "pourcentageAvanc",
  "jalonId",
  "superviseurInterneId",
  "superviseurExterneId",
];

export function construirePayload(
  input: CreerTacheInput,
  form: Formulaire,
  externeId: string | undefined,
  projetId: string,
): URLSearchParams {
  const { nbHeurePrev, nbJourPrev } = dureeVersJoursHeures(input.duree_heures);
  const anomalie = input.nature === "ANOMALIE";
  const champs: Record<string, string> = {
    ...form.caches,
    projetId,
    libelle: input.libelle,
    natureTache: input.nature,
    typeTacheId: resoudreOption(form.options, "typeTacheId", input.type_tache),
    statutTacheId: resoudreOption(form.options, "statutTacheId", input.statut),
    tacheInterne: String(input.tache_interne),
    responsableInterneId: form.caches.personneId ?? "",
    responsableExterneId: externeId ?? "",
    dateDebutPrev: isoVersFr(input.debut_prev),
    dateFinPrev: isoVersFr(input.fin_prev),
    nbJourPrev: String(nbJourPrev),
    nbHeurePrev: String(nbHeurePrev),
    commentaire: input.commentaire ?? "",
  };
  for (const k of VIDES) champs[k] = "";
  if (anomalie && input.gravite) champs.gravite = input.gravite;
  if (anomalie && input.composant) champs.composant = input.composant;
  return new URLSearchParams(champs);
}
