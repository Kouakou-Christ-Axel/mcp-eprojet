import { z } from "zod";
import { traiterLot } from "../../utils/lot.js";
import { modifierTache } from "./modifier.js";
import { modifierTacheSchema, modifierTacheShape } from "./modifierSchema.js";
import type { Deps } from "./service.js";

const modifLot = z.object(modifierTacheShape).omit({ confirmer: true });

export const modifierTachesShape = {
  taches: z
    .array(modifLot)
    .min(1)
    .max(20)
    .describe("Modifications (mêmes champs que modifier_tache : reference + champs à changer)"),
  confirmer: z
    .boolean()
    .default(false)
    .describe("false = dry_run de tout le lot ; true = modifie tout le lot (si aucune erreur)"),
};
export const modifierTachesSchema = z.object(modifierTachesShape);
export type ModifierTachesInput = z.infer<typeof modifierTachesSchema>;

export function modifierTaches(input: ModifierTachesInput, deps: Deps, pauseMs = 500) {
  const un = async (t: ModifierTachesInput["taches"][number], confirmer: boolean) => {
    const r = await modifierTache(modifierTacheSchema.parse({ ...t, confirmer }), deps);
    if ("candidats" in r) {
      throw new Error(
        `Plusieurs responsables externes possibles : ${r.candidats.map((c) => c.nom).join(", ")}`,
      );
    }
    return r;
  };
  return traiterLot(input.taches, {
    libelle: (t) => t.reference,
    apercu: (t) => un(t, false),
    envoyer: (t) => un(t, true),
    confirmer: input.confirmer,
    pauseMs,
  });
}
