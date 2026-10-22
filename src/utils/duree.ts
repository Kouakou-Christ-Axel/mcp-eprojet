const HEURES_PAR_JOUR = 8;

// Aide partagée par les schémas et descriptions d'outils : les champs E-Projet "Jour prév" et "H. prév"
// ont de quoi dérouter (placeholders "0.5 for Demi J" / "0.5 for 30 min").
export const DUREE_AIDE =
  "Durée prévue en HEURES décimales : 0.5 = 30 min, 1.5 = 1 h 30, 8 = 1 jour de travail (pas de 0.25, " +
  "de 0.25 à 300). Ne jamais fournir Jour prév ni H. prév : E-Projet les attend en jours (1 jour = 8 h) " +
  "et en heures, ils sont calculés à partir de cette valeur.";

// Heures décimales (1,5 = 1 h 30) -> H prév ; Jour prév = quart de jour supérieur, min 0,25.
export function dureeVersJoursHeures(heures: number): { nbHeurePrev: number; nbJourPrev: number } {
  if (!Number.isFinite(heures) || heures < 0.25 || heures > 300 || (heures * 4) % 1 !== 0) {
    throw new Error(`Durée invalide (${heures}) : de 0,25 à 300 heures, par pas de 0,25 (15 min)`);
  }
  const nbJourPrev = Math.max(0.25, Math.ceil((heures / HEURES_PAR_JOUR) * 4) / 4);
  return { nbHeurePrev: heures, nbJourPrev };
}
