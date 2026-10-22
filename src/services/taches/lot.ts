import { z } from "zod";
import { traiterLot, type ResultatLot as Lot } from "../../utils/lot.js";
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
export type ResultatLot = Lot<Resultat>;

export function creerTaches(input: CreerTachesInput, deps: Deps, pauseMs = 500) {
  return traiterLot(input.taches, {
    libelle: (t) => t.libelle,
    apercu: async (t) => {
      const r = await creerTache(creerTacheSchema.parse({ ...t, confirmer: false }), deps);
      if ("candidats" in r) {
        throw new Error(
          `Plusieurs responsables externes possibles : ${r.candidats.map((c) => c.nom).join(", ")}`,
        );
      }
      return r;
    },
    envoyer: (t) => creerTache(creerTacheSchema.parse({ ...t, confirmer: true }), deps),
    confirmer: input.confirmer,
    pauseMs,
  });
}
