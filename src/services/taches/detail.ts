import { lireJson } from "./lookups.js";
import type { Deps } from "./service.js";

// Ce que le formulaire d'édition ne recharge pas (responsable externe, composant) existe dans le JSON.
export interface DetailServeur {
  statutTacheLibelle: string | null;
  gravite: string | null;
  composant: string | null;
  responsableExterneId: number | null;
  responsableExterneNom: string | null;
}

// Vérifié le 2026-10-22 : GET /taches/{id} renvoie la tâche en JSON (champs *Nom, *Libelle compris).
export async function lireDetailServeur(
  deps: Pick<Deps, "api">,
  id: string,
): Promise<DetailServeur> {
  return lireJson<DetailServeur>(await deps.api(`/taches/${id}`), "le détail de la tâche");
}
