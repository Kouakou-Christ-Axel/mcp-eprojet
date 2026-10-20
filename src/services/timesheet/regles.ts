import { normaliser } from "../../utils/parse.js";

const TERMINALES = ["terminee", "annulee"];
const EPSILON = 0.0001;

// Terminée <=> 100 % (refus dans les deux sens).
export function verifierCoherence(statut: string, pourcentage: number): void {
  const terminee = normaliser(statut) === "terminee";
  if (terminee && pourcentage !== 100) {
    throw new Error(`Une tâche Terminée doit être à 100 % (reçu ${pourcentage} %)`);
  }
  if (!terminee && pourcentage === 100) {
    throw new Error(`Une tâche à 100 % doit avoir le statut Terminée (reçu "${statut}")`);
  }
}

export interface LigneAvertissement {
  cite: boolean;
  statut: string;
  heures: number; // valeur finale de la journée
  heuresActuelles: number; // valeur actuellement enregistrée
  hPrev: number;
  hReelle: number; // heures réelles affichées par la page
  reference?: string;
}
export interface EntreeAvertissement {
  seuil: number;
  lignes: LigneAvertissement[];
}

// Mêmes contrôles que la page (non bloquants) ; calcul des heures effectives identique.
export function avertissements({ seuil, lignes }: EntreeAvertissement): string[] {
  const alertes: string[] = [];
  for (const l of lignes.filter((x) => x.cite)) {
    const nom = l.reference ?? "tâche";
    const effectives = l.hReelle - l.heuresActuelles + l.heures;
    const terminale = TERMINALES.includes(normaliser(l.statut));
    if (normaliser(l.statut) === "terminee" && effectives <= EPSILON) {
      alertes.push(`${nom} : Terminée sans aucune heure réelle`);
    }
    if (!terminale && l.hPrev > 0 && effectives > l.hPrev * (1 + seuil / 100)) {
      alertes.push(
        `${nom} : dépassement du prévu (${effectives} h réelles / ${l.hPrev} h prévues)`,
      );
    }
  }
  const total = lignes.reduce((s, l) => s + (l.cite ? l.heures : l.heuresActuelles), 0);
  if (lignes.length > 0 && total <= EPSILON) alertes.push("Journée à 0 h au total");
  return alertes;
}
