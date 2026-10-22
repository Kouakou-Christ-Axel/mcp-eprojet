const HEURES_PAR_JOUR = 8;

// Jour prév et H. prév sont deux champs INDÉPENDANTS dans E-Projet (conception du site : aucune
// cohérence imposée) ; les placeholders "0.5 for Demi J" / "0.5 for 30 min" dérouteraient l'IA.
export const DUREE_AIDE =
  "H. prév : durée prévue en HEURES décimales (0.5 = 30 min, 1.5 = 1 h 30, 8 = 8 h), pas de 0.25, " +
  "de 0.25 à 300.";
export const JOURS_AIDE =
  "Jour prév : durée prévue en JOURS, champ indépendant de H. prév (E-Projet ne les relie pas), pas de " +
  "0.25 jour, minimum 0.25 (0.5 = demi-journée, 1 = 1 jour). Facultatif : par défaut déduit de H. prév " +
  "(1 jour = 8 h, arrondi au quart de jour supérieur, 0.25 minimum même sous 2 h). À renseigner " +
  "seulement si l'utilisateur donne une valeur différente.";

const pasDeQuart = (n: number) => (n * 4) % 1 === 0;

export function verifierJours(jours: number): void {
  if (!Number.isFinite(jours) || jours < 0.25 || jours > 300 || !pasDeQuart(jours)) {
    throw new Error(`Jour prév invalide (${jours}) : de 0,25 à 300 jours, par pas de 0,25`);
  }
}

// H. prév = heures telles quelles ; Jour prév = valeur donnée, sinon quart de jour supérieur (min 0,25).
export function dureeVersJoursHeures(
  heures: number,
  jours?: number,
): { nbHeurePrev: number; nbJourPrev: number } {
  if (!Number.isFinite(heures) || heures < 0.25 || heures > 300 || !pasDeQuart(heures)) {
    throw new Error(`Durée invalide (${heures}) : de 0,25 à 300 heures, par pas de 0,25 (15 min)`);
  }
  if (jours !== undefined) verifierJours(jours);
  const defaut = Math.max(0.25, Math.ceil((heures / HEURES_PAR_JOUR) * 4) / 4);
  return { nbHeurePrev: heures, nbJourPrev: jours ?? defaut };
}
