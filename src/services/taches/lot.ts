import { z } from "zod";
import { creerTacheSchema, creerTacheShape } from "./schema.js";
import { creerTache, type Deps, type Resultat } from "./service.js";

const tacheLot = z.object(creerTacheShape).omit({ confirmer: true });

export const creerTachesShape = {
  taches: z
    .array(tacheLot)
    .min(1)
    .max(20)
    .describe("Tâches à créer (mêmes champs que creer_tache)"),
  confirmer: z
    .boolean()
    .default(false)
    .describe("false = dry_run de tout le lot ; true = crée tout le lot (si aucune erreur)"),
};
export const creerTachesSchema = z.object(creerTachesShape);
export type CreerTachesInput = z.infer<typeof creerTachesSchema>;

interface Erreur {
  index: number;
  libelle: string;
  erreur: string;
}
export type ResultatLot =
  | { mode: "dry_run"; taches: { libelle: string; resultat: Resultat }[] }
  | { mode: "refusé"; erreurs: Erreur[] }
  | { mode: "envoyé"; taches: { libelle: string; resultat: Resultat }[] }
  | { mode: "partiel"; crees: string[]; echec: Erreur };

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Un seul dry-run puis une seule confirmation pour tout le lot. Tout est validé avant d'envoyer
// quoi que ce soit ; l'envoi est séquentiel, avec une pause, et s'arrête à la première erreur.
export async function creerTaches(
  input: CreerTachesInput,
  deps: Deps,
  pauseMs = 500,
): Promise<ResultatLot> {
  const valides: { libelle: string; saisie: ReturnType<typeof creerTacheSchema.parse> }[] = [];
  const erreurs: Erreur[] = [];
  const apercus: { libelle: string; resultat: Resultat }[] = [];
  for (const [index, t] of input.taches.entries()) {
    try {
      const saisie = creerTacheSchema.parse({ ...t, confirmer: false });
      const resultat = await creerTache(saisie, deps);
      if ("candidats" in resultat) {
        const noms = resultat.candidats.map((c) => c.nom).join(", ");
        throw new Error(`Plusieurs responsables externes possibles : ${noms}`);
      }
      valides.push({ libelle: t.libelle, saisie });
      apercus.push({ libelle: t.libelle, resultat });
    } catch (e) {
      erreurs.push({ index, libelle: t.libelle, erreur: message(e) });
    }
  }
  if (erreurs.length > 0) return { mode: "refusé", erreurs };
  if (!input.confirmer) return { mode: "dry_run", taches: apercus };

  const envoyees: { libelle: string; resultat: Resultat }[] = [];
  for (const [index, { libelle, saisie }] of valides.entries()) {
    if (index > 0) await attendre(pauseMs);
    try {
      envoyees.push({ libelle, resultat: await creerTache({ ...saisie, confirmer: true }, deps) });
    } catch (e) {
      const crees = envoyees.map((t) => t.libelle);
      return { mode: "partiel", crees, echec: { index, libelle, erreur: message(e) } };
    }
  }
  return { mode: "envoyé", taches: envoyees };
}
