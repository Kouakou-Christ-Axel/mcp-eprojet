const HEURES_PAR_JOUR = 8;

// Heures décimales (1,5 = 1 h 30) -> H prév ; Jour prév = quart de jour supérieur, min 0,25.
export function dureeVersJoursHeures(heures: number): { nbHeurePrev: number; nbJourPrev: number } {
  if (!Number.isFinite(heures) || heures < 0.25 || heures > 300 || (heures * 4) % 1 !== 0) {
    throw new Error(`Durée invalide (${heures}) : de 0,25 à 300 heures, par pas de 0,25 (15 min)`);
  }
  const nbJourPrev = Math.max(0.25, Math.ceil((heures / HEURES_PAR_JOUR) * 4) / 4);
  return { nbHeurePrev: heures, nbJourPrev };
}
