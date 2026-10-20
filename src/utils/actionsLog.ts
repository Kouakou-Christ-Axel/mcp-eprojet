import { appendFileSync } from "node:fs";

const FICHIER = new URL("../../actions.log", import.meta.url);

// Journal local des écritures : une ligne JSON par action, jamais de secrets.
export function logAction(entree: object): void {
  appendFileSync(FICHIER, JSON.stringify({ date: new Date().toISOString(), ...entree }) + "\n");
}

// Une panne du journal ne doit jamais masquer un envoi déjà réussi.
export function journaliser(log: (entree: object) => void, entree: object): void {
  try {
    log(entree);
  } catch (e) {
    console.error("[eprojet] journal indisponible :", (e as Error).message);
  }
}
