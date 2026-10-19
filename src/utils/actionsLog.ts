import { appendFileSync } from "node:fs";

const FICHIER = new URL("../../actions.log", import.meta.url);

// Journal local des écritures : une ligne JSON par action, jamais de secrets.
export function logAction(entree: object): void {
  appendFileSync(FICHIER, JSON.stringify({ date: new Date().toISOString(), ...entree }) + "\n");
}
