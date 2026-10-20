import { z } from "zod";
import { journaliser } from "../../utils/actionsLog.js";
import type { TacheResume } from "./activite.js";
import { trouverTache } from "./recherche.js";
import type { Deps } from "./service.js";

export const supprimerTacheShape = {
  reference: z.string().min(1).describe("Référence de la tâche à supprimer (ex. PRJ-576-0418)"),
  confirmer: z.boolean().default(false).describe("false = dry_run ; true = supprime vraiment"),
};
export const supprimerTacheSchema = z.object(supprimerTacheShape);
export type SupprimerTacheInput = z.infer<typeof supprimerTacheSchema>;

export type ResultatSuppression =
  | { mode: "dry_run"; tache: TacheResume; avertissements: string[] }
  | { mode: "envoyé"; tache: TacheResume; statut: number; verifie: boolean };

// Vérifié le 2026-10-20 dans le JS de la page : le bouton "Oui" fait GET /taches/delete/{id}.
export async function supprimerTache(
  input: SupprimerTacheInput,
  deps: Deps,
): Promise<ResultatSuppression> {
  const tache = await trouverTache(deps, input.reference);
  const avertissements = ["Suppression définitive : il n'y a pas d'outil pour la défaire."];
  if (parseFloat(tache.hReelle) > 0) {
    avertissements.push(
      `${tache.hReelle} h réelles déjà saisies sur cette tâche : leur sort dépend d'E-Projet (probablement perdues).`,
    );
  }
  if (!input.confirmer) return { mode: "dry_run", tache, avertissements };

  const res = await deps.api(`/taches/delete/${tache.id}`);
  journaliser(deps.log, {
    outil: "supprimer_tache",
    reference: tache.reference,
    id: tache.id,
    libelle: tache.libelle,
    hReelle: tache.hReelle,
    statut: res.status,
  });
  if (res.status >= 400) throw new Error(`E-Projet a refusé la suppression (HTTP ${res.status})`);
  const encore = await trouverTache(deps, input.reference).then(
    () => true,
    () => false,
  );
  return { mode: "envoyé", tache, statut: res.status, verifie: !encore };
}
